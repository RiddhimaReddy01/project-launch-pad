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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { context, required_outputs } = await req.json();
    const {
      business_type = "business",
      city = "",
      state = "",
      target_customers = [],
      insight_title = "",
      insight_evidence = "",
      customer_quotes = [],
      som_value = "",
      competitor_gaps = [],
      root_causes = [],
      cost_estimate = "",
      timeline_summary = "",
    } = context || {};

    const location = city && state ? `${city}, ${state}` : city || state || "the local area";
    const customersStr = Array.isArray(target_customers) ? target_customers.join(", ") : target_customers || "";
    const quotesStr = Array.isArray(customer_quotes) && customer_quotes.length > 0
      ? customer_quotes.map((q: string) => `"${q}"`).join("\n")
      : "No specific quotes available";
    const gapsStr = Array.isArray(competitor_gaps) && competitor_gaps.length > 0 ? competitor_gaps.join("; ") : "";
    const causesStr = Array.isArray(root_causes) && root_causes.length > 0 ? root_causes.join("; ") : "";

    // Determine which outputs to generate based on selected methods
    const outputs = new Set<string>(required_outputs || ["landing_page", "survey", "whatsapp", "communities", "scorecard"]);
    outputs.add("scorecard"); // Always include scorecard

    // ── DB cache check ──
    const outputsKey = Array.from(outputs).sort().join(",");
    const cacheInput = `validate:${business_type}:${city}:${state}:${outputsKey}`;
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

    // Build output-specific instructions
    const outputInstructions: string[] = [];
    if (outputs.has("landing_page")) outputInstructions.push("- Landing page: headline, subheadline, 4 benefits, CTA button text, social proof quote");
    if (outputs.has("survey")) outputInstructions.push("- Survey: 7 questions following frequency→solution→frustration→switch→price→differentiation→email flow");
    if (outputs.has("whatsapp")) outputInstructions.push("- Outreach message: casual WhatsApp-style message with [SURVEY_LINK] placeholder");
    if (outputs.has("communities")) outputInstructions.push("- Communities: 10 real groups where target customers gather");
    outputInstructions.push("- Scorecard: 6 validation metrics with realistic 4-6 week targets");

    const systemPrompt = `You are a startup validation strategist. Generate validation components for a new business concept.

RULES:
- Use EXACT pain language from customer quotes. Landing page copy should sound like real customers, not marketers.
- Be specific to ${location}.
- All content should feel authentic and conversational.
- Survey questions should follow a logical discovery flow.
- Communities must be real, findable groups.

Generate ONLY these components:
${outputInstructions.join("\n")}`;

    const userPrompt = `Business: ${business_type}
Location: ${location}
Target customers: ${customersStr}

Key insight: ${insight_title}
Evidence: ${insight_evidence}

Customer quotes (USE THESE VERBATIM in landing page copy):
${quotesStr}

Market context:
- SOM estimate: ${som_value || "Not calculated"}
- Competitor gaps: ${gapsStr || "Not analyzed"}
- Root causes: ${causesStr || "Not analyzed"}
- Cost estimate: ${cost_estimate || "Not estimated"}
- Timeline: ${timeline_summary || "Not planned"}`;

    // Build tool schema dynamically based on required outputs
    const properties: Record<string, any> = {};
    const required: string[] = [];

    if (outputs.has("landing_page")) {
      properties.landing_page = {
        type: "object",
        properties: {
          headline: { type: "string" }, subheadline: { type: "string" },
          benefits: { type: "array", items: { type: "string" } },
          cta: { type: "string" }, social_proof: { type: "string" },
        },
        required: ["headline", "subheadline", "benefits", "cta", "social_proof"],
      };
      required.push("landing_page");
    }

    if (outputs.has("survey")) {
      properties.survey = {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" }, question: { type: "string" },
            type: { type: "string", enum: ["scale", "multiple_choice", "open", "yes_no", "email"] },
            options: { type: "array", items: { type: "string" } },
          },
          required: ["id", "question", "type"],
        },
      };
      required.push("survey");
    }

    if (outputs.has("whatsapp")) {
      properties.whatsapp = {
        type: "object",
        properties: {
          message: { type: "string" }, tone: { type: "string" },
        },
        required: ["message", "tone"],
      };
      required.push("whatsapp");
    }

    if (outputs.has("communities")) {
      properties.communities = {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" }, platform: { type: "string" },
            members: { type: "string" }, url: { type: "string" }, rationale: { type: "string" },
          },
          required: ["name", "platform", "members", "url", "rationale"],
        },
      };
      required.push("communities");
    }

    // Always include scorecard
    properties.scorecard = {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" }, label: { type: "string" },
          target: { type: "number" }, target_label: { type: "string" }, unit: { type: "string" },
        },
        required: ["id", "label", "target", "target_label", "unit"],
      },
    };
    required.push("scorecard");

    const tools = [{
      type: "function",
      function: {
        name: "generate_validation",
        description: "Generate validation components for a business idea",
        parameters: { type: "object", properties, required },
      },
    }];

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
        tool_choice: { type: "function", function: { name: "generate_validation" } },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("AI gateway error:", resp.status, text);
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Too many requests — please wait a moment and try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "Usage limit reached. Please check your account." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${resp.status}`);
    }

    const aiData = await resp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("No structured response returned");

    const parsed = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    // Post-process: add actual=0 to scorecard
    if (parsed.scorecard) {
      parsed.scorecard = parsed.scorecard.map((m: any) => ({ ...m, actual: 0 }));
    }

    // Fill missing sections with null so client doesn't break
    if (!parsed.landing_page) parsed.landing_page = null;
    if (!parsed.survey) parsed.survey = null;
    if (!parsed.whatsapp) parsed.whatsapp = null;
    if (!parsed.communities) parsed.communities = null;

    // ── Save to cache ──
    if (cached) {
      await supabase.from("result_cache").update({ result_data: parsed, created_at: new Date().toISOString() }).eq("id", cached.id);
    } else {
      await supabase.from("result_cache").insert({ cache_key: cacheKey, function_name: "validate-idea", result_data: parsed });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("validate-idea error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
