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

// Cost routing: simple extraction → cheaper model, complex synthesis → better model
const MODEL_BY_SECTION: Record<string, string> = {
  costs: "google/gemini-2.5-flash-lite",
  risk: "google/gemini-2.5-flash-lite",
  location: "google/gemini-2.5-flash-lite",
  rootcause: "google/gemini-2.5-flash",
  moat: "google/gemini-2.5-flash",
  opportunity: "google/gemini-2.5-flash",
  customers: "google/gemini-2.5-flash",
  competitors: "google/gemini-2.5-flash",
};

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

// ── SECTION TOOLS ──

const OPPORTUNITY_TOOL = [{
  type: "function",
  function: {
    name: "analyze_opportunity",
    description: "Calculate TAM/SAM/SOM market sizing",
    parameters: {
      type: "object",
      properties: {
        tam: { type: "object", properties: { value: { type: "number" }, formatted: { type: "string" }, methodology: { type: "string" }, confidence: { type: "string", enum: ["low", "medium", "high"] } }, required: ["value", "formatted", "methodology", "confidence"] },
        sam: { type: "object", properties: { value: { type: "number" }, formatted: { type: "string" }, methodology: { type: "string" }, confidence: { type: "string", enum: ["low", "medium", "high"] } }, required: ["value", "formatted", "methodology", "confidence"] },
        som: { type: "object", properties: { value: { type: "number" }, formatted: { type: "string" }, methodology: { type: "string" }, confidence: { type: "string", enum: ["low", "medium", "high"] } }, required: ["value", "formatted", "methodology", "confidence"] },
        funnel: { type: "object", properties: { population: { type: "number" }, aware: { type: "number" }, interested: { type: "number" }, willing_to_try: { type: "number" }, repeat_customers: { type: "number" } }, required: ["population", "aware", "interested", "willing_to_try", "repeat_customers"] },
      },
      required: ["tam", "sam", "som", "funnel"],
    },
  },
}];

const CUSTOMERS_TOOL = [{
  type: "function",
  function: {
    name: "analyze_customers",
    description: "Generate customer segments",
    parameters: {
      type: "object",
      properties: {
        segments: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, estimated_size: { type: "number" }, pain_intensity: { type: "number" }, primary_need: { type: "string" }, spending_pattern: { type: "string" }, where_to_find: { type: "string" } }, required: ["name", "description", "estimated_size", "pain_intensity", "primary_need", "spending_pattern", "where_to_find"] } },
      },
      required: ["segments"],
    },
  },
}];

const COMPETITORS_TOOL = [{
  type: "function",
  function: {
    name: "analyze_competitors",
    description: "Analyze competitive landscape",
    parameters: {
      type: "object",
      properties: {
        competitors: { type: "array", items: { type: "object", properties: { name: { type: "string" }, location: { type: "string" }, rating: { type: "number" }, price_range: { type: "string" }, key_strength: { type: "string" }, key_gap: { type: "string" }, threat_level: { type: "string", enum: ["low", "medium", "high"] }, url: { type: "string" } }, required: ["name", "location", "rating", "price_range", "key_strength", "key_gap", "threat_level", "url"] } },
        unfilled_gaps: { type: "array", items: { type: "string" } },
      },
      required: ["competitors", "unfilled_gaps"],
    },
  },
}];

const ROOTCAUSE_TOOL = [{
  type: "function",
  function: {
    name: "analyze_root_causes",
    description: "Identify structural root causes",
    parameters: {
      type: "object",
      properties: {
        root_causes: { type: "array", items: { type: "object", properties: { cause_number: { type: "number" }, title: { type: "string" }, explanation: { type: "string" }, your_move: { type: "string" }, difficulty: { type: "string", enum: ["easy", "medium", "hard"] } }, required: ["cause_number", "title", "explanation", "your_move", "difficulty"] } },
      },
      required: ["root_causes"],
    },
  },
}];

const COSTS_TOOL = [{
  type: "function",
  function: {
    name: "analyze_costs",
    description: "Estimate startup costs",
    parameters: {
      type: "object",
      properties: {
        total_range: { type: "object", properties: { min: { type: "number" }, max: { type: "number" } }, required: ["min", "max"] },
        breakdown: { type: "array", items: { type: "object", properties: { category: { type: "string" }, min: { type: "number" }, max: { type: "number" } }, required: ["category", "min", "max"] } },
        note: { type: "string" },
      },
      required: ["total_range", "breakdown", "note"],
    },
  },
}];

const RISK_TOOL = [{
  type: "function",
  function: {
    name: "analyze_risks",
    description: "Assess business risks",
    parameters: {
      type: "object",
      properties: {
        risks: { type: "array", items: { type: "object", properties: { risk: { type: "string" }, likelihood: { type: "string", enum: ["low", "medium", "high"] }, impact: { type: "string", enum: ["low", "medium", "high"] }, mitigation: { type: "string" }, category: { type: "string" } }, required: ["risk", "likelihood", "impact", "mitigation", "category"] } },
        overall_risk_level: { type: "string", enum: ["low", "medium", "high"] },
        summary: { type: "string" },
      },
      required: ["risks", "overall_risk_level", "summary"],
    },
  },
}];

const LOCATION_TOOL = [{
  type: "function",
  function: {
    name: "analyze_location",
    description: "Analyze location demographics, foot traffic, and regulatory environment",
    parameters: {
      type: "object",
      properties: {
        demographics: { type: "object", properties: { population: { type: "number" }, median_income: { type: "number" }, median_age: { type: "number" }, growth_rate: { type: "string" } }, required: ["population", "median_income", "median_age", "growth_rate"] },
        foot_traffic: { type: "object", properties: { best_areas: { type: "array", items: { type: "string" } }, avg_monthly_rent_sqft: { type: "number" }, competitor_density: { type: "string" } }, required: ["best_areas", "avg_monthly_rent_sqft", "competitor_density"] },
        regulatory: { type: "object", properties: { key_permits: { type: "array", items: { type: "string" } }, estimated_timeline: { type: "string" }, notes: { type: "string" } }, required: ["key_permits", "estimated_timeline", "notes"] },
        score: { type: "number" },
        verdict: { type: "string" },
      },
      required: ["demographics", "foot_traffic", "regulatory", "score", "verdict"],
    },
  },
}];

const MOAT_TOOL = [{
  type: "function",
  function: {
    name: "analyze_moat",
    description: "Score competitive defensibility across 5 dimensions",
    parameters: {
      type: "object",
      properties: {
        dimensions: { type: "array", items: { type: "object", properties: { dimension: { type: "string" }, score: { type: "number" }, rationale: { type: "string" } }, required: ["dimension", "score", "rationale"] } },
        overall_score: { type: "number" },
        strongest: { type: "string" },
        weakest: { type: "string" },
        recommendation: { type: "string" },
      },
      required: ["dimensions", "overall_score", "strongest", "weakest", "recommendation"],
    },
  },
}];

const SECTION_CONFIG: Record<string, { tool: any[]; systemPrompt: (ctx: any) => string }> = {
  opportunity: {
    tool: OPPORTUNITY_TOOL,
    systemPrompt: (ctx) => `You are an expert market analyst. Calculate market sizing for a ${ctx.business_type} in ${ctx.city}, ${ctx.state}. TAM: total addressable market in metro. SAM: serviceable available market for the pain point. SOM: realistic year-1 capture. Include customer funnel. TAM >= SAM >= SOM. Be specific to ${ctx.city}.`,
  },
  customers: {
    tool: CUSTOMERS_TOOL,
    systemPrompt: (ctx) => `Generate 3-4 customer segments for a ${ctx.business_type} in ${ctx.city}, ${ctx.state}. Each with memorable name, description, local size estimate, pain_intensity 1-10, primary need, spending patterns, where to find them. Sort by pain descending.`,
  },
  competitors: {
    tool: COMPETITORS_TOOL,
    systemPrompt: (ctx) => `Analyze competitors for a ${ctx.business_type} in ${ctx.city}, ${ctx.state}. 4-8 real/realistic competitors with threat levels, ratings, gaps from reviews, realistic URLs. Also 3 unfilled gaps no competitor fills.`,
  },
  rootcause: {
    tool: ROOTCAUSE_TOOL,
    systemPrompt: (ctx) => `Identify 3-5 ROOT CAUSES for why a market gap exists for a ${ctx.business_type} in ${ctx.city}, ${ctx.state}. Structural, economic, or regulatory reasons. Each with actionable counter-strategy specific to ${ctx.city}.`,
  },
  costs: {
    tool: COSTS_TOOL,
    systemPrompt: (ctx) => `Estimate startup costs for a ${ctx.business_type} in ${ctx.city}, ${ctx.state}. 4-6 categories with min/max ranges. Note the biggest cost driver. Be specific to local commercial rates.`,
  },
  risk: {
    tool: RISK_TOOL,
    systemPrompt: (ctx) => `Assess 5-8 business risks for launching a ${ctx.business_type} in ${ctx.city}, ${ctx.state}. Categorize each as operational, financial, market, regulatory, or competitive. Rate likelihood and impact. Include specific mitigation strategies.`,
  },
  location: {
    tool: LOCATION_TOOL,
    systemPrompt: (ctx) => `Analyze ${ctx.city}, ${ctx.state} as a location for a ${ctx.business_type}. Include demographics, foot traffic, and regulatory environment. Score 1-10 and give a verdict.`,
  },
  moat: {
    tool: MOAT_TOOL,
    systemPrompt: (ctx) => `Score competitive defensibility for a ${ctx.business_type} in ${ctx.city}, ${ctx.state} across 5 dimensions: Brand/Network Effects, Switching Costs, Cost Advantages, Proprietary Technology, Regulatory Barriers. Rate each 1-10.`,
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
    const section = body.section;

    // Support both { section, context } and { idea, section } formats
    let context = body.context;
    if (!context && body.idea) {
      // Extract basic context from the idea string
      const idea = body.idea as string;
      context = {
        business_type: idea,
        city: "",
        state: "",
      };
      // Try to parse location from idea (e.g., "juice bar in Plano TX")
      const locMatch = idea.match(/\bin\s+([A-Za-z\s]+?)(?:,?\s+([A-Z]{2}))?\s*$/i);
      if (locMatch) {
        context.city = locMatch[1].trim();
        context.state = locMatch[2] || "";
        context.business_type = idea.replace(/\bin\s+[A-Za-z\s,]+$/i, "").trim() || idea;
      }
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

    const { business_type, city, state, target_customers, insight_title, insight_evidence, price_tier } = context;

    // ── DB cache check ──
    const cacheInput = `analyze:${section}:${business_type}:${city}:${state}:${price_tier || ""}`;
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
    const systemPrompt = config.systemPrompt({ business_type, city, state });

    const userPrompt = `Business: ${business_type}
Location: ${city}, ${state}
Target customers: ${(target_customers || []).join(", ")}
Price tier: ${price_tier || "mid-range"}

${insight_title ? `Selected insight: ${insight_title}` : ""}
${insight_evidence ? `Evidence:\n${insight_evidence}` : ""}

Analyze this business opportunity for the "${section}" section.`;

    const result = await callAI(LOVABLE_API_KEY, model, systemPrompt, userPrompt, config.tool);

    // Post-processing
    if (section === "opportunity" && result.tam && result.sam && result.som) {
      const vals = [result.tam.value, result.sam.value, result.som.value].sort((a: number, b: number) => b - a);
      result.tam.value = vals[0]; result.sam.value = vals[1]; result.som.value = vals[2];
    }
    if (section === "customers" && result.segments) {
      result.segments = result.segments.slice(0, 4).sort((a: any, b: any) => b.pain_intensity - a.pain_intensity);
      result.segments.forEach((s: any) => { s.pain_intensity = Math.max(1, Math.min(10, Math.round(s.pain_intensity))); });
    }
    if (section === "competitors" && result.competitors) {
      const order = { high: 0, medium: 1, low: 2 };
      result.competitors = result.competitors.slice(0, 8).sort((a: any, b: any) => (order[a.threat_level as keyof typeof order] ?? 1) - (order[b.threat_level as keyof typeof order] ?? 1));
    }
    if (section === "rootcause" && result.root_causes) {
      const order = { easy: 0, medium: 1, hard: 2 };
      result.root_causes = result.root_causes.slice(0, 5).sort((a: any, b: any) => (order[a.difficulty as keyof typeof order] ?? 1) - (order[b.difficulty as keyof typeof order] ?? 1));
      result.root_causes.forEach((c: any, i: number) => { c.cause_number = i + 1; });
    }
    if (section === "moat" && result.dimensions) {
      result.dimensions.forEach((d: any) => { d.score = Math.max(1, Math.min(10, Math.round(d.score))); });
      result.overall_score = Math.max(1, Math.min(10, Math.round(result.overall_score)));
    }

    // ── Save to cache ──
    if (cached) {
      await supabase.from("result_cache").update({ result_data: result, created_at: new Date().toISOString() }).eq("id", cached.id);
    } else {
      await supabase.from("result_cache").insert({ cache_key: cacheKey, function_name: `analyze-${section}`, result_data: result });
    }

    return new Response(JSON.stringify({ section, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-section error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message.includes("429") ? 429 : message.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
