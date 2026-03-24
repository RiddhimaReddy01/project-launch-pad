import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Use stronger model for complex generation, lite for simple sections
const MODEL_BY_SECTION: Record<string, string> = {
  costs: "google/gemini-2.5-flash",
  suppliers: "google/gemini-2.5-flash",
  team: "google/gemini-2.5-flash",
  timeline: "google/gemini-2.5-flash-lite",
};

async function hashKey(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase().replace(/\s+/g, " "));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function callAI(apiKey: string, systemPrompt: string, userPrompt: string, tools: any[], model: string = "google/gemini-2.5-flash") {
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
        lean_breakdown: {
          type: "array",
          description: "Cost categories for lean tier",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: { label: { type: "string" }, min: { type: "number" }, max: { type: "number" }, note: { type: "string" } },
                  required: ["label", "min", "max", "note"],
                },
              },
            },
            required: ["category", "items"],
          },
        },
        mid_breakdown: {
          type: "array",
          description: "Cost categories for mid tier",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: { label: { type: "string" }, min: { type: "number" }, max: { type: "number" }, note: { type: "string" } },
                  required: ["label", "min", "max", "note"],
                },
              },
            },
            required: ["category", "items"],
          },
        },
        premium_breakdown: {
          type: "array",
          description: "Cost categories for premium tier",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: { label: { type: "string" }, min: { type: "number" }, max: { type: "number" }, note: { type: "string" } },
                  required: ["label", "min", "max", "note"],
                },
              },
            },
            required: ["category", "items"],
          },
        },
      },
      required: ["tiers", "lean_breakdown", "mid_breakdown", "premium_breakdown"],
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

Each tier needs 4-5 cost categories with 2-4 line items. Use realistic costs for ${ctx.city}, ${ctx.state}.

IMPORTANT: Return breakdown for each tier as separate arrays (lean_breakdown, mid_breakdown, premium_breakdown), NOT as a nested object.`,
    userPrompt: (ctx) => `Business: ${ctx.business_type}
Location: ${ctx.city}, ${ctx.state}
Target customers: ${(ctx.target_customers || []).join(", ")}

Generate cost tiers for this business.`,
  },
  suppliers: {
    tool: SUPPLIERS_TOOL,
    systemPrompt: (ctx) => `Recommend 8-12 vendors for launching a ${ctx.business_type} in ${ctx.city}, ${ctx.state} at the "${ctx.tier || 'mid'}" tier. Include real company names, websites, and specific cost indications.`,
    userPrompt: (ctx) => `Business: ${ctx.business_type}\nLocation: ${ctx.city}, ${ctx.state}\nTier: ${ctx.tier || 'mid'}\nTarget customers: ${(ctx.target_customers || []).join(", ")}\n\nRecommend 8-12 tier-appropriate vendors.`,
  },
  team: {
    tool: TEAM_TOOL,
    systemPrompt: (ctx) => `Create Year 1 hiring timeline for a ${ctx.business_type} startup (${ctx.tier || 'mid'} tier) in ${ctx.city}, ${ctx.state}. Use realistic ${ctx.state} salary ranges.`,
    userPrompt: (ctx) => `Business: ${ctx.business_type}\nLocation: ${ctx.city}, ${ctx.state}\nTier: ${ctx.tier || 'mid'}\nTarget customers: ${(ctx.target_customers || []).join(", ")}\n\nPlan Year 1 hiring.`,
  },
  timeline: {
    tool: TIMELINE_TOOL,
    systemPrompt: (ctx) => `Create a 4-phase roadmap for a ${ctx.business_type} in ${ctx.city}, ${ctx.state} (${ctx.tier || 'mid'} tier). Phases: VALIDATION, BUILD MVP, LAUNCH, SCALE. Total ~52 weeks.`,
    userPrompt: (ctx) => `Business: ${ctx.business_type}\nLocation: ${ctx.city}, ${ctx.state}\nTier: ${ctx.tier || 'mid'}\nTarget customers: ${(ctx.target_customers || []).join(", ")}\n\nCreate the 4-phase launch roadmap.`,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const body = await req.json();
    let section = body.section;
    let context = body.context;

    // Support simple { idea, selected_tier } format
    if (!context && body.idea) {
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
      context = { business_type, city, state, tier: (body.selected_tier || "mid").toLowerCase() };
      if (!section) section = "costs"; // default section
    }

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

    // ── DB cache check ──
    const cacheInput = `setup:${section}:${context.business_type}:${context.city}:${context.state}:${context.tier || "mid"}`;
    const cacheKey = await hashKey(cacheInput);

    const { data: cached } = await supabase
      .from("result_cache")
      .select("*")
      .eq("cache_key", cacheKey)
      .maybeSingle();

    if (cached) {
      const age = Date.now() - new Date(cached.created_at).getTime();
      if (age < CACHE_TTL_MS) {
        return new Response(JSON.stringify({ section, data: cached.result_data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const model = MODEL_BY_SECTION[section] || "google/gemini-2.5-flash";
    let result = await callAI(LOVABLE_API_KEY, config.systemPrompt(context), config.userPrompt(context), config.tool, model);

    // Validate non-empty results — don't cache empty arrays
    const isEmpty = (section === "suppliers" && (!result.suppliers || result.suppliers.length === 0)) ||
                    (section === "team" && (!result.team || result.team.length === 0));
    if (isEmpty) {
      console.warn(`[setup-section] ${section} returned empty, not caching. Retrying with stronger model...`);
      result = await callAI(LOVABLE_API_KEY, config.systemPrompt(context), config.userPrompt(context), config.tool, "google/gemini-2.5-flash");
      const stillEmpty = (section === "suppliers" && (!result.suppliers || result.suppliers.length === 0)) ||
                         (section === "team" && (!result.team || result.team.length === 0));
      if (stillEmpty) {
        return new Response(JSON.stringify({ section, data: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Post-process costs: restructure breakdown from separate arrays into keyed object
    if (section === "costs") {
      const breakdown: Record<string, any[]> = {};
      if (result.lean_breakdown) breakdown.lean = result.lean_breakdown;
      if (result.mid_breakdown) breakdown.mid = result.mid_breakdown;
      if (result.premium_breakdown) breakdown.premium = result.premium_breakdown;
      // Fallback: if breakdown already exists as object, keep it
      if (Object.keys(breakdown).length > 0) {
        result = { tiers: result.tiers, breakdown };
      } else if (!result.breakdown || typeof result.breakdown !== "object") {
        result.breakdown = {};
      }
    }

    // ── Save to cache ──
    if (cached) {
      await supabase.from("result_cache").update({ result_data: result, created_at: new Date().toISOString() }).eq("id", cached.id);
    } else {
      await supabase.from("result_cache").insert({ cache_key: cacheKey, function_name: `setup-${section}`, result_data: result });
    }

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
