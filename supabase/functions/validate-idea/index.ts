import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { context } = await req.json();
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
    const gapsStr = Array.isArray(competitor_gaps) && competitor_gaps.length > 0
      ? competitor_gaps.join("; ")
      : "";
    const causesStr = Array.isArray(root_causes) && root_causes.length > 0
      ? root_causes.join("; ")
      : "";

    const systemPrompt = `You are a startup validation strategist. Generate 5 validation components for a new business concept.

CRITICAL RULES:
- Use EXACT pain language from the customer quotes provided. Landing page copy should sound like customers, not marketers.
- Be specific to the location (${location}).
- All content should feel authentic, not corporate or AI-generated.
- Survey questions should follow a logical discovery flow.
- Communities must be real, findable groups relevant to the business type and location.
- WhatsApp message should be casual, authentic, and include a clear call to action.
- Scorecard targets should be realistic for a pre-launch validation (4-6 week window).`;

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
- Timeline: ${timeline_summary || "Not planned"}

Generate all 5 validation components for this business.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "generate_validation",
          description: "Generate 5 validation components: landing page, survey, whatsapp message, communities, and scorecard",
          parameters: {
            type: "object",
            properties: {
              landing_page: {
                type: "object",
                properties: {
                  headline: { type: "string", description: "Short, punchy headline using customer pain language" },
                  subheadline: { type: "string", description: "Supporting line that expands on the value proposition" },
                  benefits: { type: "array", items: { type: "string" }, description: "4 benefit bullets using customer language" },
                  cta: { type: "string", description: "Call to action button text" },
                  social_proof: { type: "string", description: "A verbatim customer quote as social proof" },
                },
                required: ["headline", "subheadline", "benefits", "cta", "social_proof"],
              },
              survey: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    question: { type: "string" },
                    type: { type: "string", enum: ["scale", "multiple_choice", "open", "yes_no", "email"] },
                    options: { type: "array", items: { type: "string" } },
                  },
                  required: ["id", "question", "type"],
                },
                description: "7 survey questions: frequency(scale), current solution(mc), frustration(open), switch willingness(yes_no), price tolerance(mc), differentiation(scale), email(email)",
              },
              whatsapp: {
                type: "object",
                properties: {
                  message: { type: "string", description: "Casual WhatsApp-style message to share in communities, include survey link placeholder [SURVEY_LINK]" },
                  tone: { type: "string", description: "Tone description like 'Casual & direct'" },
                },
                required: ["message", "tone"],
              },
              communities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    platform: { type: "string", description: "Facebook, Reddit, Discord, LinkedIn, Nextdoor, WhatsApp, Slack, etc." },
                    members: { type: "string", description: "Estimated member count like '25K'" },
                    url: { type: "string", description: "URL or search path to find this community" },
                    rationale: { type: "string", description: "Why this community is relevant (1 sentence)" },
                  },
                  required: ["name", "platform", "members", "url", "rationale"],
                },
                description: "10 real communities where target customers gather, specific to the location and business type",
              },
              scorecard: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    label: { type: "string" },
                    target: { type: "number" },
                    target_label: { type: "string" },
                    unit: { type: "string" },
                  },
                  required: ["id", "label", "target", "target_label", "unit"],
                },
                description: "6 scorecard metrics: waitlist signups, survey responses, switch rate %, price tolerance $, pre-paid signups, LTV/CAC ratio",
              },
            },
            required: ["landing_page", "survey", "whatsapp", "communities", "scorecard"],
          },
        },
      },
    ];

    const resp = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
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
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${resp.status}`);
    }

    const aiData = await resp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call in AI response");
    }

    const parsed = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    // Post-process: add actual=0 to scorecard
    if (parsed.scorecard) {
      parsed.scorecard = parsed.scorecard.map((m: any) => ({ ...m, actual: 0 }));
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
