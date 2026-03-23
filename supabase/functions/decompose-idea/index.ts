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

async function callAI(apiKey: string, model: string, systemPrompt: string, userPrompt: string, tools: any[]) {
  const resp = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
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

const STAGE1_TOOLS = [{
  type: "function",
  function: {
    name: "extract_stage1",
    description: "Extract business type and location from a business idea",
    parameters: {
      type: "object",
      properties: {
        business_type: { type: "string" },
        location: {
          type: "object",
          properties: { city: { type: "string" }, state: { type: "string" } },
          required: ["city", "state"],
        },
      },
      required: ["business_type", "location"],
      additionalProperties: false,
    },
  },
}];

const STAGE2_TOOLS = [{
  type: "function",
  function: {
    name: "extract_stage2",
    description: "Extract detailed market research parameters",
    parameters: {
      type: "object",
      properties: {
        target_customers: { type: "array", items: { type: "string" } },
        price_tier: { type: "string", enum: ["budget", "mid-range", "premium", "luxury"] },
        search_queries: { type: "array", items: { type: "string" } },
        source_domains: { type: "array", items: { type: "string" } },
        subreddits: { type: "array", items: { type: "string" } },
      },
      required: ["target_customers", "price_tier", "search_queries", "source_domains", "subreddits"],
      additionalProperties: false,
    },
  },
}];

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
    if (words.length < 3) {
      return new Response(JSON.stringify({ error: "Tell us a bit more — at least 3 words about your idea" }), {
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

    // Stage 1 — Fast extraction (cheapest model)
    const stage1 = await callAI(
      LOVABLE_API_KEY,
      "google/gemini-2.5-flash-lite",
      "You are a business analyst. Extract the core business type and location from the user's business idea. If no location is mentioned, use empty strings.",
      idea,
      STAGE1_TOOLS
    );

    // Stage 2 — Detailed extraction (cheap model, parallel with stage 1 would need Promise.all but sequential is fine for 2 calls)
    const stage2Prompt = `Business idea: ${idea}\nBusiness type: ${stage1.business_type}\nLocation: ${stage1.location.city ? `${stage1.location.city}, ${stage1.location.state}` : "Not specified"}`;

    const stage2 = await callAI(
      LOVABLE_API_KEY,
      "google/gemini-2.5-flash-lite",
      "You are a market research expert. Extract detailed research parameters for finding real customer discussions and reviews online. Be specific to the business type and location.",
      stage2Prompt,
      STAGE2_TOOLS
    );

    const result = {
      cached: false,
      stage1: { business_type: stage1.business_type, location: stage1.location },
      stage2: {
        target_customers: stage2.target_customers,
        price_tier: stage2.price_tier,
        search_queries: stage2.search_queries,
        source_domains: stage2.source_domains,
        subreddits: stage2.subreddits,
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
