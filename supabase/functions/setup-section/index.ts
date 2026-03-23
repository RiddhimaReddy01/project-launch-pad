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

// ── COSTS TOOL ──
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
              id: { type: "string", enum: ["lean", "mid", "premium"] },
              title: { type: "string" },
              philosophy: { type: "string" },
              approach: { type: "string" },
              team_size: { type: "string" },
              timeline_weeks: { type: "number" },
              cost_min: { type: "number" },
              cost_max: { type: "number" },
              best_for: { type: "string" },
            },
            required: ["id", "title", "philosophy", "approach", "team_size", "timeline_weeks", "cost_min", "cost_max", "best_for"],
          },
        },
        breakdown: {
          type: "object",
          description: "Cost categories per tier keyed by tier ID (lean, mid, premium)",
          additionalProperties: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      min: { type: "number" },
                      max: { type: "number" },
                      note: { type: "string" },
                    },
                    required: ["label", "min", "max", "note"],
                  },
                },
              },
              required: ["category", "items"],
            },
          },
        },
      },
      required: ["tiers", "breakdown"],
    },
  },
}];

// ── SUPPLIERS TOOL ──
const SUPPLIERS_TOOL = [{
  type: "function",
  function: {
    name: "generate_suppliers",
    description: "Generate tier-appropriate vendor recommendations",
    parameters: {
      type: "object",
      properties: {
        suppliers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string", enum: ["Engineering", "Marketing", "Legal", "Operations", "Infrastructure"] },
              name: { type: "string" },
              description: { type: "string" },
              location: { type: "string" },
              website: { type: "string" },
              cost: { type: "string" },
              why_recommended: { type: "string" },
            },
            required: ["category", "name", "description", "location", "website", "cost", "why_recommended"],
          },
        },
      },
      required: ["suppliers"],
    },
  },
}];

// ── TEAM TOOL ──
const TEAM_TOOL = [{
  type: "function",
  function: {
    name: "generate_team",
    description: "Generate Year 1 hiring plan",
    parameters: {
      type: "object",
      properties: {
        team: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              type: { type: "string", enum: ["FTE", "Contract", "Advisory"] },
              salary_min: { type: "number" },
              salary_max: { type: "number" },
              salary_label: { type: "string" },
              priority: { type: "string", enum: ["MUST_HAVE", "NICE_TO_HAVE"] },
              month: { type: "number" },
              why_needed: { type: "string" },
            },
            required: ["title", "type", "salary_min", "salary_max", "salary_label", "priority", "month", "why_needed"],
          },
        },
        total_payroll: { type: "number" },
      },
      required: ["team", "total_payroll"],
    },
  },
}];

// ── TIMELINE TOOL ──
const TIMELINE_TOOL = [{
  type: "function",
  function: {
    name: "generate_timeline",
    description: "Generate 4-phase launch roadmap",
    parameters: {
      type: "object",
      properties: {
        phases: {
          type: "array",
          items: {
            type: "object",
            properties: {
              phase: { type: "string", enum: ["VALIDATION", "BUILD MVP", "LAUNCH", "SCALE"] },
              weeks: { type: "number" },
              budget_percent: { type: "number" },
              milestones: { type: "array", items: { type: "string" } },
              success_metric: { type: "string" },
            },
            required: ["phase", "weeks", "budget_percent", "milestones", "success_metric"],
          },
        },
      },
      required: ["phases"],
    },
  },
}];

const SECTION_CONFIG: Record<string, { tool: any[]; systemPrompt: (ctx: any) => string; userPrompt: (ctx: any) => string }> = {
  costs: {
    tool: COSTS_TOOL,
    systemPrompt: (ctx) => `You are a startup cost analyst. Generate 3 launch tiers (lean/mid/premium) for a ${ctx.business_type} in ${ctx.city}, ${ctx.state}.

LEAN: 60-80% of base cost. Speed + DIY, founder-led, 16 weeks, 1 person.
MID: 100% base cost. Balanced, 1-2 people, 24 weeks.
PREMIUM: 120-180% of base. Full team, 2-3+ people, 32 weeks.

Each tier needs 4-5 cost categories with 2-4 line items. Use realistic costs for ${ctx.city}, ${ctx.state}.`,
    userPrompt: (ctx) => `Business: ${ctx.business_type}
Location: ${ctx.city}, ${ctx.state}
Target customers: ${(ctx.target_customers || []).join(", ")}
${ctx.tier ? `Selected tier: ${ctx.tier}` : ""}

Generate cost tiers for this business.`,
  },
  suppliers: {
    tool: SUPPLIERS_TOOL,
    systemPrompt: (ctx) => `You are a startup resource advisor. Recommend 8-12 vendors for launching a ${ctx.business_type} in ${ctx.city}, ${ctx.state}.

For TIER "${ctx.tier || 'mid'}":
- LEAN: Cheap/free tools, freelancer platforms, DIY-friendly
- MID: Balanced cost/quality, established services
- PREMIUM: Full-service, managed, high-touch support

Categories: Engineering, Marketing, Legal, Operations, Infrastructure.
Include real company names, websites, and specific cost indications.
Focus on vendors useful for ${ctx.business_type} in ${ctx.city}.`,
    userPrompt: (ctx) => `Business: ${ctx.business_type}
Location: ${ctx.city}, ${ctx.state}
Tier: ${ctx.tier || 'mid'}
Target customers: ${(ctx.target_customers || []).join(", ")}

Recommend 8-12 tier-appropriate vendors.`,
  },
  team: {
    tool: TEAM_TOOL,
    systemPrompt: (ctx) => `You are a startup hiring advisor. Create Year 1 hiring timeline for a ${ctx.business_type} startup (${ctx.tier || 'mid'} tier) in ${ctx.city}, ${ctx.state}.

Hiring by tier:
- LEAN: Max 2 people, mostly freelancers
- MID: 1 FTE by Month 4, second hire by Month 8
- PREMIUM: 2-3+ people by Month 12

Include title, type (FTE/Contract/Advisory), salary range, priority (MUST_HAVE/NICE_TO_HAVE), hire month (1-12), and reason.
Use realistic ${ctx.state} salary ranges. Sort by month ascending.`,
    userPrompt: (ctx) => `Business: ${ctx.business_type}
Location: ${ctx.city}, ${ctx.state}
Tier: ${ctx.tier || 'mid'}
Target customers: ${(ctx.target_customers || []).join(", ")}

Plan Year 1 hiring for this startup.`,
  },
  timeline: {
    tool: TIMELINE_TOOL,
    systemPrompt: (ctx) => `You are a startup launch strategist. Create a 4-phase roadmap for a ${ctx.business_type} in ${ctx.city}, ${ctx.state} (${ctx.tier || 'mid'} tier).

Phases (fixed order):
1. VALIDATION (4-12 weeks): Prove demand
2. BUILD MVP (8-16 weeks): Create product
3. LAUNCH (2-4 weeks): Go to market
4. SCALE (rest of year): Grow revenue

Total weeks should sum to ~52 (1 year).
Budget allocation should sum to ~100%.
Each phase needs 4-5 concrete milestones and 1 measurable success metric.

Tier impacts:
- LEAN: Faster validation, longer build, slower scale
- MID: Balanced across phases
- PREMIUM: Shorter validation, faster build, rapid scale`,
    userPrompt: (ctx) => `Business: ${ctx.business_type}
Location: ${ctx.city}, ${ctx.state}
Tier: ${ctx.tier || 'mid'}
Target customers: ${(ctx.target_customers || []).join(", ")}

Create the 4-phase launch roadmap.`,
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

    const result = await callAI(LOVABLE_API_KEY, config.systemPrompt(context), config.userPrompt(context), config.tool);

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
