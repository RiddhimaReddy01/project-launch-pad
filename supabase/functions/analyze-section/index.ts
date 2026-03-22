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

// ── SECTION TOOLS ──

const OPPORTUNITY_TOOL = [{
  type: "function",
  function: {
    name: "analyze_opportunity",
    description: "Calculate TAM/SAM/SOM market sizing for a business opportunity",
    parameters: {
      type: "object",
      properties: {
        tam: {
          type: "object",
          properties: {
            value: { type: "number" },
            formatted: { type: "string" },
            methodology: { type: "string" },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["value", "formatted", "methodology", "confidence"],
        },
        sam: {
          type: "object",
          properties: {
            value: { type: "number" },
            formatted: { type: "string" },
            methodology: { type: "string" },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["value", "formatted", "methodology", "confidence"],
        },
        som: {
          type: "object",
          properties: {
            value: { type: "number" },
            formatted: { type: "string" },
            methodology: { type: "string" },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["value", "formatted", "methodology", "confidence"],
        },
        funnel: {
          type: "object",
          properties: {
            population: { type: "number" },
            aware: { type: "number" },
            interested: { type: "number" },
            willing_to_try: { type: "number" },
            repeat_customers: { type: "number" },
          },
          required: ["population", "aware", "interested", "willing_to_try", "repeat_customers"],
        },
      },
      required: ["tam", "sam", "som", "funnel"],
      additionalProperties: false,
    },
  },
}];

const CUSTOMERS_TOOL = [{
  type: "function",
  function: {
    name: "analyze_customers",
    description: "Generate customer segments for a business opportunity",
    parameters: {
      type: "object",
      properties: {
        segments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              estimated_size: { type: "number" },
              pain_intensity: { type: "number" },
              primary_need: { type: "string" },
              spending_pattern: { type: "string" },
              where_to_find: { type: "string" },
            },
            required: ["name", "description", "estimated_size", "pain_intensity", "primary_need", "spending_pattern", "where_to_find"],
          },
        },
      },
      required: ["segments"],
      additionalProperties: false,
    },
  },
}];

const COMPETITORS_TOOL = [{
  type: "function",
  function: {
    name: "analyze_competitors",
    description: "Analyze competitive landscape for a business opportunity",
    parameters: {
      type: "object",
      properties: {
        competitors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              location: { type: "string" },
              rating: { type: "number" },
              price_range: { type: "string" },
              key_strength: { type: "string" },
              key_gap: { type: "string" },
              threat_level: { type: "string", enum: ["low", "medium", "high"] },
              url: { type: "string" },
            },
            required: ["name", "location", "rating", "price_range", "key_strength", "key_gap", "threat_level", "url"],
          },
        },
        unfilled_gaps: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["competitors", "unfilled_gaps"],
      additionalProperties: false,
    },
  },
}];

const ROOTCAUSE_TOOL = [{
  type: "function",
  function: {
    name: "analyze_root_causes",
    description: "Identify structural root causes for why a market gap exists",
    parameters: {
      type: "object",
      properties: {
        root_causes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              cause_number: { type: "number" },
              title: { type: "string" },
              explanation: { type: "string" },
              your_move: { type: "string" },
              difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
            },
            required: ["cause_number", "title", "explanation", "your_move", "difficulty"],
          },
        },
      },
      required: ["root_causes"],
      additionalProperties: false,
    },
  },
}];

const COSTS_TOOL = [{
  type: "function",
  function: {
    name: "analyze_costs",
    description: "Estimate startup costs for a business",
    parameters: {
      type: "object",
      properties: {
        total_range: {
          type: "object",
          properties: {
            min: { type: "number" },
            max: { type: "number" },
          },
          required: ["min", "max"],
        },
        breakdown: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              min: { type: "number" },
              max: { type: "number" },
            },
            required: ["category", "min", "max"],
          },
        },
        note: { type: "string" },
      },
      required: ["total_range", "breakdown", "note"],
      additionalProperties: false,
    },
  },
}];

const SECTION_CONFIG: Record<string, { tool: any[]; systemPrompt: (ctx: any) => string }> = {
  opportunity: {
    tool: OPPORTUNITY_TOOL,
    systemPrompt: (ctx) => `You are an expert market analyst. Calculate market sizing for a ${ctx.business_type} in ${ctx.city}, ${ctx.state}.

Using your knowledge of the area and industry data, calculate:
- TAM: Total addressable market for this business type in the metro area
- SAM: Serviceable available market matching the specific customer pain point
- SOM: Serviceable obtainable market - realistic year-1 capture for a single new entrant

Also provide a customer funnel: population → aware → interested → willing_to_try → repeat_customers.

Be specific to ${ctx.city}, ${ctx.state}. Use real population data. TAM must be >= SAM >= SOM.`,
  },

  customers: {
    tool: CUSTOMERS_TOOL,
    systemPrompt: (ctx) => `You are a customer research expert. Generate 3-4 customer segments for a ${ctx.business_type} in ${ctx.city}, ${ctx.state}.

For each segment:
- Give a specific, memorable name (2-4 words)
- Describe who they are in 2-3 sentences
- Estimate local segment size (number of people)
- Rate pain_intensity 1-10 (how much they need this)
- Identify their primary need
- Describe spending patterns on alternatives
- List where to find them (online + offline)

Sort by pain_intensity descending. Be specific to ${ctx.city}.`,
  },

  competitors: {
    tool: COMPETITORS_TOOL,
    systemPrompt: (ctx) => `You are a competitive intelligence analyst. Analyze competitors for a ${ctx.business_type} in ${ctx.city}, ${ctx.state}.

Identify 4-8 real or realistic competitors:
- Include both national chains and local businesses
- Rate each on threat level (low/medium/high)
- Identify specific gaps from customer reviews
- Include realistic URLs (Yelp, Google Maps, or business websites)

Also identify 3 unfilled gaps that NO competitor currently fills.
Sort competitors by threat_level (high first).`,
  },

  rootcause: {
    tool: ROOTCAUSE_TOOL,
    systemPrompt: (ctx) => `You are a startup strategist analyzing WHY a market gap exists for a ${ctx.business_type} in ${ctx.city}, ${ctx.state}.

Identify 3-5 ROOT CAUSES for why this gap still exists. These should be structural, economic, or regulatory reasons — NOT just "nobody thought of it."

For each cause:
- Give a concise title
- Explain with specific evidence about ${ctx.city}/${ctx.state}
- Provide a specific, actionable counter-strategy (your_move) referencing real locations, tactics specific to ${ctx.city}
- Rate difficulty: easy/medium/hard

Sort by difficulty (easy first). This is the MOST DIFFERENTIATED section — go deep with local specifics.`,
  },

  costs: {
    tool: COSTS_TOOL,
    systemPrompt: (ctx) => `You are a business cost estimator. Give a realistic cost estimate for launching a ${ctx.business_type} in ${ctx.city}, ${ctx.state}.

Include 4-6 cost categories (Real Estate, Equipment, Permits & Legal, Initial Operations, Marketing, etc.)
Be specific to ${ctx.city}, ${ctx.state} commercial rates.
Include a note about the biggest cost driver.
All values should be realistic dollar amounts.`,
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
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = SECTION_CONFIG[section];
    if (!config) {
      return new Response(JSON.stringify({ error: `Unknown section: ${section}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { business_type, city, state, target_customers, insight_title, insight_evidence, price_tier } = context;

    const systemPrompt = config.systemPrompt({ business_type, city, state });

    const userPrompt = `Business: ${business_type}
Location: ${city}, ${state}
Target customers: ${(target_customers || []).join(", ")}
Price tier: ${price_tier || "mid-range"}

${insight_title ? `Selected insight: ${insight_title}` : ""}
${insight_evidence ? `Evidence:\n${insight_evidence}` : ""}

Analyze this business opportunity for the "${section}" section.`;

    const result = await callAI(LOVABLE_API_KEY, systemPrompt, userPrompt, config.tool);

    // Post-processing
    if (section === "opportunity" && result.tam && result.sam && result.som) {
      // Ensure TAM >= SAM >= SOM
      const vals = [result.tam.value, result.sam.value, result.som.value].sort((a, b) => b - a);
      result.tam.value = vals[0];
      result.sam.value = vals[1];
      result.som.value = vals[2];
    }

    if (section === "customers" && result.segments) {
      result.segments = result.segments.slice(0, 4).sort((a: any, b: any) => b.pain_intensity - a.pain_intensity);
      result.segments.forEach((s: any) => {
        s.pain_intensity = Math.max(1, Math.min(10, Math.round(s.pain_intensity)));
      });
    }

    if (section === "competitors" && result.competitors) {
      const order = { high: 0, medium: 1, low: 2 };
      result.competitors = result.competitors.slice(0, 8).sort(
        (a: any, b: any) => (order[a.threat_level as keyof typeof order] ?? 1) - (order[b.threat_level as keyof typeof order] ?? 1)
      );
    }

    if (section === "rootcause" && result.root_causes) {
      const order = { easy: 0, medium: 1, hard: 2 };
      result.root_causes = result.root_causes.slice(0, 5).sort(
        (a: any, b: any) => (order[a.difficulty as keyof typeof order] ?? 1) - (order[b.difficulty as keyof typeof order] ?? 1)
      );
      result.root_causes.forEach((c: any, i: number) => { c.cause_number = i + 1; });
    }

    return new Response(JSON.stringify({ section, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-section error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message.includes("429") ? 429 : message.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
