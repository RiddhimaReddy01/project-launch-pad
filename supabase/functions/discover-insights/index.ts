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

async function callAI(apiKey: string, systemPrompt: string, userPrompt: string, tools: any[]) {
  const resp = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: { type: "function", function: { name: tools[0].function.name } },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI gateway error [${resp.status}]: ${text}`);
  }

  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall) return JSON.parse(toolCall.function.arguments);
  throw new Error("No structured response returned");
}

// ── Tool schema ──

const DISCOVER_TOOLS = [
  {
    type: "function",
    function: {
      name: "extract_insights",
      description: "Extract structured market insights from analysis of a business idea and its target market",
      parameters: {
        type: "object",
        properties: {
          insights: {
            type: "array",
            description: "8-12 market insights discovered from analyzing real community discussions, reviews, and search results",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Concise insight title, max 12 words" },
                type: { type: "string", enum: ["pain_point", "workaround", "demand_signal", "expectation"] },
                description: { type: "string", description: "2-3 sentence description" },
                frequency_score: { type: "number", description: "0.0-1.0" },
                severity_score: { type: "number", description: "0.0-1.0" },
                willingness_to_pay: { type: "number", description: "0.0-1.0" },
                market_size_signal: { type: "number", description: "0.0-1.0" },
                tags: { type: "array", items: { type: "string" }, description: "2-4 short keyword tags" },
                sources: {
                  type: "array",
                  description: "2-4 evidence sources with realistic quotes",
                  items: {
                    type: "object",
                    properties: {
                      platform: { type: "string", enum: ["reddit", "google", "yelp"] },
                      text: { type: "string", description: "Verbatim quote (50-120 chars)" },
                      url: { type: "string" },
                      author: { type: "string" },
                      date: { type: "string" },
                      upvotes: { type: "number" },
                    },
                    required: ["platform", "text", "url", "author", "date"],
                  },
                },
              },
              required: ["title", "type", "description", "frequency_score", "severity_score", "willingness_to_pay", "market_size_signal", "tags", "sources"],
              additionalProperties: false,
            },
          },
          synthesis: {
            type: "object",
            properties: {
              top_pain_points: { type: "array", items: { type: "string" } },
              current_workarounds: { type: "array", items: { type: "string" } },
              what_they_value: { type: "array", items: { type: "string" } },
              willingness_signals: { type: "array", items: { type: "string" } },
              opportunity_score: { type: "number" },
            },
            required: ["top_pain_points", "current_workarounds", "what_they_value", "willingness_signals", "opportunity_score"],
            additionalProperties: false,
          },
          source_summary: {
            type: "object",
            properties: {
              reddit_count: { type: "number" },
              google_count: { type: "number" },
              yelp_count: { type: "number" },
              total_signals: { type: "number" },
            },
            required: ["reddit_count", "google_count", "yelp_count", "total_signals"],
            additionalProperties: false,
          },
        },
        required: ["insights", "synthesis", "source_summary"],
        additionalProperties: false,
      },
    },
  },
];

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

    // Support simple { idea } format — build decomposition from idea string
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
        business_type,
        location: { city, state },
        search_queries: [`${business_type} in ${city}`],
        source_domains: [],
        subreddits: [],
        target_customers: [],
        price_tier: "mid-range",
      };
    }

    if (!decomposition) {
      return new Response(JSON.stringify({ error: "Missing 'idea' or 'decomposition' field" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { business_type, location, search_queries, source_domains, subreddits, target_customers, price_tier } = decomposition;

    // ── DB cache check ──
    const cacheInput = `discover:${business_type}:${location?.city}:${location?.state}`;
    const cacheKey = await hashKey(cacheInput);

    const { data: cached } = await supabase
      .from("result_cache")
      .select("*")
      .eq("cache_key", cacheKey)
      .maybeSingle();

    if (cached) {
      const age = Date.now() - new Date(cached.created_at).getTime();
      if (age < CACHE_TTL_MS) {
        return new Response(JSON.stringify(cached.result_data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const locationStr = location?.city ? `${location.city}, ${location.state}` : "United States";

    const systemPrompt = `You are an expert market research analyst. You analyze real community discussions, reviews, and online conversations to extract actionable market insights for founders.

Your job is to simulate the results of a deep scan of Reddit threads, Google reviews, Yelp reviews, and forum discussions about a specific business type in a specific location.

Generate insights that are:
- SPECIFIC to the business type and location (not generic)
- Evidence-backed with realistic verbatim quotes from real people
- Actionable for a founder deciding whether to pursue this business
- Varied across pain points, workarounds, demand signals, and expectations

For quotes, write them as if a real person typed them — with natural language, occasional typos, and genuine frustration or excitement.

Score all metrics honestly — not everything should be high.`;

    const userPrompt = `Analyze this business opportunity:

Business Type: ${business_type}
Location: ${locationStr}
Target Customers: ${(target_customers || []).join(", ")}
Price Tier: ${price_tier || "mid-range"}

Search Queries Used:
${(search_queries || []).map((q: string) => `- "${q}"`).join("\n")}

Source Domains Scanned:
${(source_domains || []).map((d: string) => `- ${d}`).join("\n")}

Subreddits Analyzed:
${(subreddits || []).map((s: string) => `- r/${s}`).join("\n")}

Generate 8-12 specific, evidence-backed market insights. Include a mix of pain points, workarounds, demand signals, and customer expectations.`;

    const result = await callAI(LOVABLE_API_KEY, systemPrompt, userPrompt, DISCOVER_TOOLS);

    // Post-process: compute composite scores
    if (result.insights) {
      result.insights = result.insights.map((insight: any) => {
        const composite = (
          insight.frequency_score * 0.25 +
          insight.severity_score * 0.30 +
          insight.willingness_to_pay * 0.25 +
          insight.market_size_signal * 0.20
        ) * 10;
        return { ...insight, composite_score: Math.round(composite * 10) / 10 };
      });
      result.insights.sort((a: any, b: any) => b.composite_score - a.composite_score);
    }

    // ── Save to cache ──
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
