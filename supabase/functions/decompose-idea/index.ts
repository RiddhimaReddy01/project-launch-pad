import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function hashIdea(idea: string): Promise<string> {
  const normalized = idea.trim().toLowerCase().replace(/\s+/g, " ");
  const data = new TextEncoder().encode(normalized);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function callAIJson(apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  const resp = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
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
    // Try to extract JSON from markdown code blocks
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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Backend credentials not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { idea } = await req.json();
    if (!idea || typeof idea !== "string") {
      return new Response(JSON.stringify({ error: "Please enter your business idea" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const words = idea.trim().split(/\s+/);
    if (words.length < 2) {
      return new Response(JSON.stringify({ error: "Tell us a bit more - at least 2 words about your idea" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check DB cache (24h TTL)
    const ideaHash = await hashIdea(idea);
    const { data: cached } = await supabase
      .from("decompose_cache")
      .select("*")
      .eq("idea_text_hash", ideaHash)
      .maybeSingle();

    if (cached) {
      const cacheAge = Date.now() - new Date(cached.created_at).getTime();
      if (cacheAge < 24 * 60 * 60 * 1000) {
        return new Response(
          JSON.stringify({ cached: true, stage1: cached.stage1_data, stage2: cached.stage2_data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Single combined call - extract everything at once for speed
    const combined = await callAIJson(
      LOVABLE_API_KEY,
      "google/gemini-2.5-flash",
      `You are a business analyst. Given a business idea, extract structured data as JSON.

Return exactly this JSON structure:
{
  "business_type": "string - the core business type (e.g. 'Juice bar', 'SaaS platform')",
  "location": {
    "city": "string - city name or empty string if not mentioned",
    "state": "string - state/region or empty string if not mentioned"
  },
  "target_customers": ["array of 3-5 specific customer segments"],
  "price_tier": "one of: budget, mid-range, premium, luxury",
  "search_queries": ["5-8 Google search queries for market research"],
  "source_domains": ["3-5 relevant review/discussion domains like yelp.com, reddit.com"],
  "subreddits": ["3-5 relevant subreddit names without r/ prefix"]
}

IMPORTANT RULES:
- Look carefully for city/state/country mentions in the idea
- "Juice bar in Plano TX" -> city: "Plano", state: "TX"
- "Coffee shop in Austin, Texas" -> city: "Austin", state: "Texas"  
- "Online tutoring platform" -> city: "", state: ""
- Use standard state abbreviations or full names as written
- target_customers should be specific segments like "Health-conscious millennials" not generic like "everyone"
- search_queries should be research-focused queries a market researcher would use`,
      `Business idea: ${idea}`
    );

    const result = {
      cached: false,
      stage1: {
        business_type: combined.business_type || idea,
        location: {
          city: combined.location?.city || "",
          state: combined.location?.state || "",
        },
      },
      stage2: {
        target_customers: combined.target_customers || [],
        price_tier: combined.price_tier || "mid-range",
        search_queries: combined.search_queries || [],
        source_domains: combined.source_domains || [],
        subreddits: combined.subreddits || [],
      },
    };

    // Save to cache
    if (cached) {
      await supabase.from("decompose_cache")
        .update({ stage1_data: result.stage1, stage2_data: result.stage2, created_at: new Date().toISOString() })
        .eq("id", cached.id);
    } else {
      await supabase.from("decompose_cache").insert({
        idea_text_hash: ideaHash, idea_text: idea,
        stage1_data: result.stage1, stage2_data: result.stage2,
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("decompose-idea error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message.includes("429") ? 429 : message.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
