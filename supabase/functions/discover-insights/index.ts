import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function hashKey(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase().replace(/\s+/g, " "));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function callAIJson(apiKey: string, systemPrompt: string, userPrompt: string) {
  const resp = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI gateway error [${resp.status}]: ${text}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in AI response");

  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1].trim());
    throw new Error("Could not parse AI response as JSON");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const body = await req.json();
    let decomposition = body.decomposition;

    // Support simple { idea } format
    if (!decomposition && body.idea) {
      const idea = body.idea;
      let business_type = idea;
      let city = "";
      let state = "";
      const locMatch = idea.match(/\bin\s+([A-Za-z\s]+?)(?:,?\s+([A-Z]{2}))?\s*$/i);
      if (locMatch) {
        city = locMatch[1].trim();
        state = (locMatch[2] || "").trim();
        business_type = idea.replace(/\bin\s+.+$/i, "").trim();
      }
      decomposition = {
        business_type, location: { city, state },
        search_queries: [`${business_type} in ${city || 'USA'}`],
        source_domains: [], subreddits: [],
        target_customers: [], price_tier: "mid-range",
      };
    }

    if (!decomposition) {
      return new Response(JSON.stringify({ error: "Missing 'idea' or 'decomposition' field" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { business_type, location, search_queries, source_domains, subreddits, target_customers, price_tier } = decomposition;

    // DB cache check
    const cacheInput = `discover:${business_type}:${location?.city}:${location?.state}`;
    const cacheKey = await hashKey(cacheInput);

    const { data: cached } = await supabase
      .from("result_cache").select("*").eq("cache_key", cacheKey).maybeSingle();

    if (cached) {
      const age = Date.now() - new Date(cached.created_at).getTime();
      if (age < CACHE_TTL_MS) {
        return new Response(JSON.stringify(cached.result_data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const locationStr = location?.city ? `${location.city}, ${location.state}` : "United States";

    const systemPrompt = `You are an expert market research analyst. Analyze real community discussions, reviews, and online conversations to extract actionable market insights for founders.

Simulate results of a deep scan of Reddit threads, Google reviews, Yelp reviews, and forum discussions about a specific business type in a specific location.

Return a JSON object with this exact structure:
{
  "insights": [
    {
      "title": "Concise insight title, max 12 words",
      "type": "pain_point|workaround|demand_signal|expectation",
      "description": "2-3 sentence description",
      "frequency_score": 0.0-1.0,
      "severity_score": 0.0-1.0,
      "willingness_to_pay": 0.0-1.0,
      "market_size_signal": 0.0-1.0,
      "tags": ["tag1", "tag2"],
      "sources": [
        {
          "platform": "reddit|google|yelp",
          "text": "Verbatim quote 50-120 chars, written as a real person would type",
          "url": "https://reddit.com/r/...",
          "author": "username",
          "date": "2024-01-15",
          "upvotes": 42
        }
      ]
    }
  ],
  "synthesis": {
    "top_pain_points": ["pain1", "pain2", "pain3"],
    "current_workarounds": ["workaround1", "workaround2"],
    "what_they_value": ["value1", "value2"],
    "willingness_signals": ["signal1", "signal2"],
    "opportunity_score": 7.5
  },
  "source_summary": {
    "reddit_count": 12,
    "google_count": 8,
    "yelp_count": 6,
    "total_signals": 26
  }
}

RULES:
- Generate 8-12 insights, SPECIFIC to the business type and location
- Each insight must have 2-4 sources with realistic verbatim quotes
- Quotes should sound like real people — natural language, genuine emotion
- Score metrics honestly — not everything should be high
- source_summary counts should reflect total sources across all insights
- Include a mix of pain_point, workaround, demand_signal, and expectation types`;

    const userPrompt = `Analyze this business opportunity:

Business Type: ${business_type}
Location: ${locationStr}
Target Customers: ${(target_customers || []).join(", ") || "General consumers"}
Price Tier: ${price_tier || "mid-range"}

Search Queries: ${(search_queries || []).map((q: string) => `"${q}"`).join(", ")}
Source Domains: ${(source_domains || []).join(", ") || "yelp.com, reddit.com, google.com"}
Subreddits: ${(subreddits || []).map((s: string) => `r/${s}`).join(", ") || "relevant local subreddits"}

Generate specific, evidence-backed market insights with realistic source quotes.`;

    const result = await callAIJson(LOVABLE_API_KEY, systemPrompt, userPrompt);

    // Post-process: compute composite scores
    if (result.insights) {
      result.insights = result.insights.map((insight: any) => {
        const composite = (
          (insight.frequency_score || 0) * 0.25 +
          (insight.severity_score || 0) * 0.30 +
          (insight.willingness_to_pay || 0) * 0.25 +
          (insight.market_size_signal || 0) * 0.20
        ) * 10;
        return { ...insight, composite_score: Math.round(composite * 10) / 10 };
      });
      result.insights.sort((a: any, b: any) => b.composite_score - a.composite_score);
    }

    // Ensure source_summary exists
    if (!result.source_summary) {
      const allSources = (result.insights || []).flatMap((i: any) => i.sources || []);
      result.source_summary = {
        reddit_count: allSources.filter((s: any) => s.platform === "reddit").length,
        google_count: allSources.filter((s: any) => s.platform === "google").length,
        yelp_count: allSources.filter((s: any) => s.platform === "yelp").length,
        total_signals: allSources.length,
      };
    }

    // Save to cache
    if (cached) {
      await supabase.from("result_cache").update({ result_data: result, created_at: new Date().toISOString() }).eq("id", cached.id);
    } else {
      await supabase.from("result_cache").insert({ cache_key: cacheKey, function_name: "discover-insights", result_data: result });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("discover-insights error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message.includes("429") ? 429 : message.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
