import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(apiKey: string, systemPrompt: string, userPrompt: string, tools: any[]) {
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
  throw new Error("No tool call in response");
}

const COSTS_TOOL = [{
  type: "function",
  function: {
    name: "generate_costs",
    description: "Generate tiered cost breakdown for launching a business",
    parameters: {
      type: "object",
      properties: {
        tiers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", enum: ["minimum", "recommended", "full"] },
              title: { type: "string" },
              model: { type: "string" },
              costRange: { type: "string" },
              costMin: { type: "number" },
              costMax: { type: "number" },
              whenToChoose: { type: "string" },
            },
            required: ["id", "title", "model", "costRange", "costMin", "costMax", "whenToChoose"],
          },
        },
        tierCosts: {
          type: "object",
          description: "Cost categories per tier keyed by tier ID",
          additionalProperties: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      low: { type: "number" },
                      mid: { type: "number" },
                      high: { type: "number" },
                      explanation: { type: "string" },
                    },
                    required: ["label", "low", "mid", "high", "explanation"],
                  },
                },
              },
              required: ["label", "items"],
            },
          },
        },
      },
      required: ["tiers", "tierCosts"],
    },
  },
}];

const SUPPLIERS_TOOL = [{
  type: "function",
  function: {
    name: "generate_suppliers",
    description: "Generate local supplier recommendations by category",
    parameters: {
      type: "object",
      properties: {
        suppliers: {
          type: "object",
          description: "Suppliers grouped by category",
          additionalProperties: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string" },
                description: { type: "string" },
                location: { type: "string" },
                distance: { type: "string" },
                url: { type: "string" },
                category: { type: "string" },
              },
              required: ["name", "type", "description", "location", "distance", "url", "category"],
            },
          },
        },
      },
      required: ["suppliers"],
    },
  },
}];

const TEAM_TOOL = [{
  type: "function",
  function: {
    name: "generate_team",
    description: "Generate team roles for launching a business",
    parameters: {
      type: "object",
      properties: {
        team: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              type: { type: "string", enum: ["full-time", "part-time", "contract"] },
              salaryRange: { type: "string" },
              salaryLow: { type: "number" },
              salaryHigh: { type: "number" },
              description: { type: "string" },
              linkedinSearch: { type: "string" },
            },
            required: ["id", "title", "type", "salaryRange", "salaryLow", "salaryHigh", "description", "linkedinSearch"],
          },
        },
      },
      required: ["team"],
    },
  },
}];

const TIMELINE_TOOL = [{
  type: "function",
  function: {
    name: "generate_timeline",
    description: "Generate a phased launch timeline",
    parameters: {
      type: "object",
      properties: {
        phases: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              weeks: { type: "string" },
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    label: { type: "string" },
                  },
                  required: ["id", "label"],
                },
              },
            },
            required: ["id", "title", "weeks", "tasks"],
          },
        },
      },
      required: ["phases"],
    },
  },
}];

const SECTION_CONFIG: Record<string, { tool: any[]; systemPrompt: (ctx: any) => string }> = {
  costs: {
    tool: COSTS_TOOL,
    systemPrompt: (ctx) => `You are a startup cost analyst. Generate 3 launch tiers (minimum/recommended/full) for a ${ctx.business_type} in ${ctx.city}, ${ctx.state}. Each tier should have 4-5 cost categories with 2-4 line items each. Use realistic costs specific to ${ctx.city}, ${ctx.state}. Tier "minimum" is the cheapest viable option, "recommended" is balanced, "full" is premium buildout.`,
  },
  suppliers: {
    tool: SUPPLIERS_TOOL,
    systemPrompt: (ctx) => `Find realistic local suppliers and partners for a ${ctx.business_type} in ${ctx.city}, ${ctx.state}. Group by 4-5 categories (e.g., Produce, Equipment, Packaging, Services). Include 2-3 suppliers per category with name, type, description, location, distance from ${ctx.city}, and website URL. Use real or highly realistic supplier names.`,
  },
  team: {
    tool: TEAM_TOOL,
    systemPrompt: (ctx) => `Generate 3-5 team roles needed to launch a ${ctx.business_type} in ${ctx.city}, ${ctx.state}. Include full-time, part-time, and contract roles. Use realistic ${ctx.state} salary ranges. Include LinkedIn search URLs for finding candidates in the area.`,
  },
  timeline: {
    tool: TIMELINE_TOOL,
    systemPrompt: (ctx) => `Generate a phased launch timeline for a ${ctx.business_type} in ${ctx.city}, ${ctx.state}. Include 4-5 phases from validation through launch, each with 3-5 actionable tasks. Be specific to the business type and location. Use realistic week ranges.`,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { section, context } = await req.json();

    if (!section || !context) {
      return new Response(JSON.stringify({ error: "Missing section or context" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = SECTION_CONFIG[section];
    if (!config) {
      return new Response(JSON.stringify({ error: `Unknown section: ${section}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { business_type, city, state, tier, target_customers } = context;
    const systemPrompt = config.systemPrompt({ business_type, city, state });

    const userPrompt = `Business: ${business_type}
Location: ${city}, ${state}
Target customers: ${(target_customers || []).join(", ")}
${tier ? `Selected tier: ${tier}` : ""}

Generate the "${section}" plan for this business.`;

    const result = await callAI(LOVABLE_API_KEY, systemPrompt, userPrompt, config.tool);

    return new Response(JSON.stringify({ section, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("setup-section error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message.includes("429") ? 429 : message.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
