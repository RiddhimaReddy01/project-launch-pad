/**
 * 3-tier fallback API client:
 *   1. PRIMARY: https://launchlens.com (Cloudflare Tunnel) — currently CORS-blocked, skipped
 *   2. BACKUP:  https://launch-lean-ed28c2e7.onrender.com (Render)
 *   3. LOVABLE: Lovable Cloud edge functions (supabase.functions.invoke)
 *
 * The Render backend uses different request/response formats than Lovable Cloud.
 * This module handles translation between them.
 */

import { supabase } from "@/integrations/supabase/client";

// const PRIMARY_API = "https://launchlens.com"; // CORS-blocked, disabled
const BACKUP_API = "https://launch-lean-ed28c2e7.onrender.com";

// Map edge function names to Render API paths
const RENDER_ENDPOINTS: Record<string, string> = {
  "decompose-idea": "/api/decompose-idea",
  "discover-insights": "/api/discover-insights",
  "analyze-section": "/api/analyze-section",
  "setup-section": "/api/setup",
  "validate-idea": "/api/generate-validation",
};

// Functions where Lovable Cloud should be tried FIRST (better AI)
const LOVABLE_FIRST = new Set(["decompose-idea"]);

async function tryFetch(baseUrl: string, path: string, body: unknown, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`HTTP ${resp.status}: ${text.slice(0, 200)}`);
    }
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Transform Lovable Cloud request body into Render backend format.
 * Each function has a different mapping.
 */
function transformRequestForRender(functionName: string, body: any): any {
  switch (functionName) {
    case "decompose-idea":
      // Same format: { idea: string }
      return body;

    case "discover-insights":
      // Render expects: { decomposition: DecomposeResponse (flat) }
      // Lovable sends: { decomposition: { business_type, location, search_queries, ... } }
      // Already compatible if decomposition is flat
      return body;

    case "analyze-section": {
      // Render expects: { section, insight, decomposition }
      // Lovable sends: { section, context: { business_type, city, state, ... } }
      const ctx = body.context || {};
      return {
        section: body.section,
        insight: {
          title: ctx.insight_title || "",
          type: "pain_point",
          evidence: ctx.insight_evidence ? [{ text: ctx.insight_evidence }] : [],
          source_platforms: [],
        },
        decomposition: {
          business_type: ctx.business_type || "",
          location: { city: ctx.city || "", state: ctx.state || "" },
          target_customers: ctx.target_customers || [],
          price_tier: ctx.price_tier || "",
          source_domains: [],
          subreddits: [],
          search_queries: [],
        },
      };
    }

    case "setup-section": {
      // Render expects: { insight, decomposition, selected_tier }
      // Lovable sends: { section, context: { business_type, city, state, tier, ... } }
      const ctx = body.context || {};
      return {
        insight: {
          title: ctx.insight_title || "",
          type: "pain_point",
          evidence: [],
          source_platforms: [],
        },
        decomposition: {
          business_type: ctx.business_type || "",
          location: { city: ctx.city || "", state: ctx.state || "" },
          target_customers: ctx.target_customers || [],
          price_tier: ctx.price_tier || "",
          source_domains: [],
          subreddits: [],
          search_queries: [],
        },
        selected_tier: ctx.tier?.toUpperCase() || "MID",
      };
    }

    case "validate-idea": {
      // Render expects: { insight, decomposition, channels }
      // Lovable sends: { context: { business_type, city, state, ... }, required_outputs }
      const ctx = body.context || {};
      return {
        insight: {
          title: ctx.insight_title || "",
          type: "pain_point",
          evidence: [],
          source_platforms: [],
        },
        decomposition: {
          business_type: ctx.business_type || "",
          location: { city: ctx.city || "", state: ctx.state || "" },
          target_customers: ctx.target_customers || [],
          price_tier: ctx.price_tier || "",
          source_domains: [],
          subreddits: [],
          search_queries: [],
        },
        channels: body.required_outputs || [],
      };
    }

    default:
      return body;
  }
}

/**
 * Transform Render backend response into the format Lovable Cloud edge functions return.
 */
function transformResponseFromRender(functionName: string, data: any): any {
  switch (functionName) {
    case "decompose-idea":
      // Render returns flat: { business_type, location, target_customers, ... }
      // Lovable expects: { stage1: { business_type, location }, stage2: { ... } }
      if (data.stage1) return data; // Already in Lovable format
      return {
        cached: data.cached ?? false,
        stage1: {
          business_type: data.business_type || "",
          location: data.location || { city: "", state: "" },
        },
        stage2: {
          target_customers: data.target_customers || [],
          price_tier: data.price_tier || "",
          search_queries: data.search_queries || [],
          source_domains: data.source_domains || [],
          subreddits: data.subreddits || [],
        },
      };

    case "discover-insights":
      // Render returns: { sources, insights } — may differ from Lovable's { insights, synthesis, source_summary }
      if (data.synthesis) return data; // Already Lovable format
      return {
        insights: (data.insights || []).map((ins: any) => ({
          title: ins.title || "",
          type: ins.type || "pain_point",
          description: ins.description || ins.title || "",
          frequency_score: ins.frequency_score || ins.score || 0,
          severity_score: ins.intensity_score || ins.severity_score || 0,
          willingness_to_pay: ins.willingness_to_pay_score || ins.willingness_to_pay || 0,
          market_size_signal: ins.market_size_signal || 0,
          composite_score: ins.score || ins.composite_score || 0,
          tags: ins.tags || ins.source_platforms || [],
          sources: (ins.evidence || ins.sources || []).map((s: any) => ({
            platform: s.platform || s.source || "google",
            text: s.text || s.quote || "",
            url: s.url || "",
            author: s.author || "",
            date: s.date || "",
            upvotes: s.upvotes || null,
          })),
        })),
        synthesis: {
          top_pain_points: [],
          current_workarounds: [],
          what_they_value: [],
          willingness_signals: [],
          opportunity_score: 0,
        },
        source_summary: {
          reddit_count: data.sources?.filter((s: any) => s.platform === "reddit")?.length || 0,
          google_count: data.sources?.filter((s: any) => s.platform === "google")?.length || 0,
          yelp_count: data.sources?.filter((s: any) => s.platform === "yelp")?.length || 0,
          total_signals: data.sources?.length || 0,
        },
      };

    case "analyze-section":
      // Render may return data directly or wrapped in { data: ... }
      return data.data ? data : { data: data };

    case "setup-section":
      // Render may return data directly or wrapped
      return data.data ? data : { data: data };

    case "validate-idea":
      // Transform to match Lovable format if needed
      return data;

    default:
      return data;
  }
}

async function tryLovableCloud<T>(functionName: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, { body });
  if (error) throw new Error(error.message || `Failed: ${functionName}`);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

async function tryRender<T>(functionName: string, body: unknown): Promise<T> {
  const path = RENDER_ENDPOINTS[functionName];
  if (!path) throw new Error(`No Render endpoint for ${functionName}`);

  const renderBody = transformRequestForRender(functionName, body);
  const resp = await tryFetch(BACKUP_API, path, renderBody);
  const rawData = await resp.json();
  if (rawData?.error) throw new Error(rawData.error);
  if (rawData?.detail) throw new Error(JSON.stringify(rawData.detail));

  return transformResponseFromRender(functionName, rawData) as T;
}

/**
 * Invoke an API function with smart fallback.
 */
export async function invokeApi<T = unknown>(functionName: string, body: unknown): Promise<T> {
  // For decompose, Lovable Cloud has much better AI extraction — try it first
  if (LOVABLE_FIRST.has(functionName)) {
    try {
      return await tryLovableCloud<T>(functionName, body);
    } catch (e) {
      console.log(`[API] Lovable Cloud failed for ${functionName}:`, (e as Error).message);
    }
    // Fall through to Render
    try {
      return await tryRender<T>(functionName, body);
    } catch (e) {
      console.log(`[API] Render also failed for ${functionName}:`, (e as Error).message);
    }
    throw new Error(`All API backends failed for ${functionName}`);
  }

  // For other functions: try Render first (faster), Lovable Cloud as fallback
  try {
    return await tryRender<T>(functionName, body);
  } catch (e) {
    console.log(`[API] Render failed for ${functionName}:`, (e as Error).message);
  }

  // Fallback to Lovable Cloud
  console.log(`[API] Falling back to Lovable Cloud for ${functionName}`);
  return await tryLovableCloud<T>(functionName, body);
}
