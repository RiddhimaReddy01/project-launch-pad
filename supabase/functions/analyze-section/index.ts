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
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1].trim());
    throw new Error("Could not parse AI response as JSON");
  }
}

/** Build a location string, handling empty city/state gracefully */
function locationStr(city: string, state: string): string {
  const parts = [city, state].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "the US market";
}

function locationContext(city: string, state: string): string {
  const parts = [city, state].filter(Boolean);
  return parts.length > 0 ? `in ${parts.join(", ")}` : "(online / nationwide)";
}

// ── SECTION PROMPTS ──

const SECTION_CONFIG: Record<string, { systemPrompt: (ctx: any) => string; schema: string }> = {
  opportunity: {
    systemPrompt: (ctx) => `You are an expert market analyst. Calculate market sizing for a ${ctx.business_type} ${locationContext(ctx.city, ctx.state)}.

IMPORTANT: Return realistic, non-zero dollar amounts. For SaaS/app businesses without a physical location, size the NATIONAL or GLOBAL market.
- TAM: Total addressable market in dollars (the entire market for this type of product/service)
- SAM: Serviceable available market (the segment you can realistically reach)
- SOM: Serviceable obtainable market (realistic year-1 revenue capture)
- TAM >= SAM >= SOM, all must be > 0
- Include a customer funnel with realistic numbers

For digital/SaaS businesses, think about: total users in the space, average revenue per user, market growth rate.
For local businesses, think about: metro population, target demographic %, spending patterns.`,
    schema: `{
  "tam": { "value": number, "formatted": "string like $2.5B", "methodology": "string", "confidence": "low|medium|high" },
  "sam": { "value": number, "formatted": "string like $150M", "methodology": "string", "confidence": "low|medium|high" },
  "som": { "value": number, "formatted": "string like $2M", "methodology": "string", "confidence": "low|medium|high" },
  "funnel": { "population": number, "aware": number, "interested": number, "willing_to_try": number, "repeat_customers": number }
}`,
  },
  customers: {
    systemPrompt: (ctx) => `Generate 3-4 customer segments for a ${ctx.business_type} ${locationContext(ctx.city, ctx.state)}. Each with memorable name, description, local size estimate, pain_intensity 1-10, primary need, spending patterns, where to find them. Sort by pain descending.`,
    schema: `{ "segments": [{ "name": "string", "description": "string", "estimated_size": number, "pain_intensity": number, "primary_need": "string", "spending_pattern": "string", "where_to_find": "string" }] }`,
  },
  competitors: {
    systemPrompt: (ctx) => `Analyze competitors for a ${ctx.business_type} ${locationContext(ctx.city, ctx.state)}. 4-8 real/realistic competitors with threat levels, ratings, gaps from reviews, realistic URLs. Also 3 unfilled gaps no competitor fills.`,
    schema: `{ "competitors": [{ "name": "string", "location": "string", "rating": number, "price_range": "string", "key_strength": "string", "key_gap": "string", "threat_level": "low|medium|high", "url": "string" }], "unfilled_gaps": ["string"] }`,
  },
  rootcause: {
    systemPrompt: (ctx) => `Identify 3-5 ROOT CAUSES for why a market gap exists for a ${ctx.business_type} ${locationContext(ctx.city, ctx.state)}. Structural, economic, or regulatory reasons. Each with actionable counter-strategy.`,
    schema: `{ "root_causes": [{ "cause_number": number, "title": "string", "explanation": "string", "your_move": "string", "difficulty": "easy|medium|hard" }] }`,
  },
  costs: {
    systemPrompt: (ctx) => `Estimate startup costs for a ${ctx.business_type} ${locationContext(ctx.city, ctx.state)}. 4-6 categories with min/max ranges. Note the biggest cost driver.`,
    schema: `{ "total_range": { "min": number, "max": number }, "breakdown": [{ "category": "string", "min": number, "max": number }], "note": "string" }`,
  },
  risk: {
    systemPrompt: (ctx) => `Assess 5-8 business risks for launching a ${ctx.business_type} ${locationContext(ctx.city, ctx.state)}. Categorize each as operational, financial, market, regulatory, or competitive. Rate likelihood and impact. Include specific mitigation strategies.`,
    schema: `{ "risks": [{ "risk": "string", "likelihood": "low|medium|high", "impact": "low|medium|high", "mitigation": "string", "category": "string" }], "overall_risk_level": "low|medium|high", "summary": "string" }`,
  },
  location: {
    systemPrompt: (ctx) => `Analyze ${locationStr(ctx.city, ctx.state)} as a location for a ${ctx.business_type}. Include demographics, foot traffic, and regulatory environment. Score 1-10 and give a verdict.`,
    schema: `{ "demographics": { "population": number, "median_income": number, "median_age": number, "growth_rate": "string" }, "foot_traffic": { "best_areas": ["string"], "avg_monthly_rent_sqft": number, "competitor_density": "string" }, "regulatory": { "key_permits": ["string"], "estimated_timeline": "string", "notes": "string" }, "score": number, "verdict": "string" }`,
  },
  moat: {
    systemPrompt: (ctx) => `Score competitive defensibility for a ${ctx.business_type} ${locationContext(ctx.city, ctx.state)} across 5 dimensions: Brand/Network Effects, Switching Costs, Cost Advantages, Proprietary Technology, Regulatory Barriers. Rate each 1-10.`,
    schema: `{ "dimensions": [{ "dimension": "string", "score": number, "rationale": "string" }], "overall_score": number, "strongest": "string", "weakest": "string", "recommendation": "string" }`,
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
      const idea = body.idea as string;
      context = { business_type: idea, city: "", state: "" };
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
Location: ${locationStr(city, state)}
Target customers: ${(target_customers || []).join(", ") || "general market"}
Price tier: ${price_tier || "mid-range"}

${insight_title ? `Selected insight: ${insight_title}` : ""}
${insight_evidence ? `Evidence:\n${insight_evidence}` : ""}

Analyze this business opportunity for the "${section}" section.
Return valid JSON matching this schema:
${config.schema}

IMPORTANT: All numeric values must be greater than 0. Use realistic market data.`;

    const result = await callAIJson(LOVABLE_API_KEY, model, systemPrompt, userPrompt);

    // Post-processing
    if (section === "opportunity" && result.tam && result.sam && result.som) {
      const vals = [result.tam.value, result.sam.value, result.som.value].sort((a: number, b: number) => b - a);
      result.tam.value = vals[0]; result.sam.value = vals[1]; result.som.value = vals[2];
      // Ensure formatted strings match values
      const fmt = (v: number) => {
        if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
        if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
        if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
        return `$${v}`;
      };
      result.tam.formatted = fmt(result.tam.value);
      result.sam.formatted = fmt(result.sam.value);
      result.som.formatted = fmt(result.som.value);
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
