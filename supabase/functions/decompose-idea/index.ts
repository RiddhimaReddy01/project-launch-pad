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
      `You are a business analyst specializing in extracting structured data from business idea descriptions. Your job is to parse the user's idea and return a JSON object with ALL fields populated.

Return exactly this JSON structure:
{
  "business_type": "string - a clear, descriptive name for the business (e.g. 'Fresh-pressed juice bar', 'AI-powered SaaS platform for HR', 'Thai street food restaurant'). Include modifiers that distinguish the business.",
  "location": {
    "city": "string - the city name mentioned in the idea. Extract ANY location reference: 'in Dallas' -> 'Dallas', 'Plano TX' -> 'Plano', 'Austin, Texas' -> 'Austin'. If NO location is mentioned, return empty string.",
    "state": "string - the state/region/country. 'TX' -> 'Texas', 'Plano TX' -> 'Texas', 'Austin, Texas' -> 'Texas'. Use full state name. If NO location is mentioned, return empty string."
  },
  "target_customers": ["array of 3-5 SPECIFIC customer segments. Be detailed: 'Health-conscious millennials aged 25-35' not 'people'. 'Busy professionals who skip lunch' not 'workers'. Each segment should describe WHO they are and WHY they'd buy."],
  "price_tier": "MUST be exactly one of: budget, mid-range, premium, luxury. Infer from the business type - juice bars are typically 'mid-range' to 'premium', street food is 'budget' to 'mid-range', SaaS varies.",
  "search_queries": ["5-8 Google search queries a market researcher would use to study this business opportunity"],
  "source_domains": ["3-5 relevant review/discussion domains like yelp.com, reddit.com, g2.com"],
  "subreddits": ["3-5 relevant subreddit names WITHOUT the r/ prefix"]
}

CRITICAL EXTRACTION RULES:
1. LOCATION: Scan the ENTIRE idea text for ANY location mentions. Common patterns:
   - "in [City]" or "in [City], [State]"
   - "[Business] [City] [State]" (e.g. "juice bar Plano TX")
   - State abbreviations: TX=Texas, CA=California, NY=New York, FL=Florida, etc.
   - If the idea says "Thai street food restaurant in Dallas" -> city: "Dallas", state: "Texas"
   - NEVER return "Not specified" — return empty string if no location found
   
2. PRICE TIER: Always infer a tier. Consider the business type, target market, and any price signals in the description.

3. TARGET CUSTOMERS: Generate 3-5 specific segments even if not explicitly mentioned. Infer from the business type and location.

4. BUSINESS TYPE: Capture the FULL descriptor, not just generic category. "authentic Thai street food restaurant" not just "restaurant".`,
      `Analyze this business idea and extract ALL structured data:\n\n"${idea}"`
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
