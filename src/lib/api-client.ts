/**
 * 3-tier fallback API client:
 *   1. PRIMARY: Render (3s timeout)
 *   2. BACKUP:  Ngrok (4s timeout)
 *   3. LOVABLE: Lovable Cloud edge functions (supabase.functions.invoke)
 */

import { supabase } from "@/integrations/supabase/client";

const PRIMARY_API = "https://launch-lean-ed28c2e7.onrender.com";
const BACKUP_API = "https://steven-impervious-lorretta.ngrok-free.dev";
const PRIMARY_TIMEOUT = 3000;
const BACKUP_TIMEOUT = 4000;

// Map edge function names to Render API paths
const RENDER_ENDPOINTS: Record<string, string> = {
  "decompose-idea": "/api/decompose-idea",
  "discover-insights": "/api/discover-insights",
  "analyze-section": "/api/analyze-section",
  "setup-section": "/api/setup",
  "validate-idea": "/api/generate-validation",
};

const LOVABLE_ONLY = new Set<string>([]);

// Sections not supported by the Render backend — route to Lovable Cloud
const RENDER_UNSUPPORTED_SECTIONS = new Set(["risk", "location", "moat"]);

function normalizePlatformName(value: unknown): "reddit" | "google" | "yelp" {
  const raw = String(value || "").trim().toLowerCase();
  if (raw.includes("reddit")) return "reddit";
  if (raw.includes("yelp")) return "yelp";
  return "google";
}

function normalizeDiscoverSource(source: any) {
  return {
    platform: normalizePlatformName(
      source?.platform ||
      source?.source ||
      source?.site ||
      source?.domain ||
      source?.channel
    ),
    text: source?.text || source?.quote || source?.snippet || source?.content || "",
    url: source?.url || source?.link || source?.permalink || source?.href || "",
    author: source?.author || source?.username || source?.user || source?.title || "",
    date: source?.date || source?.created_at || source?.posted_at || "",
    upvotes: source?.upvotes || source?.score || null,
  };
}

function buildSourceSummary(insights: any[]) {
  const sources = insights.flatMap((insight) => insight.sources || []);
  return {
    reddit_count: sources.filter((source) => source.platform === "reddit").length,
    google_count: sources.filter((source) => source.platform === "google").length,
    yelp_count: sources.filter((source) => source.platform === "yelp").length,
    total_signals: sources.length,
  };
}

async function tryFetch(baseUrl: string, path: string, body: unknown, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (baseUrl.includes("ngrok")) headers["ngrok-skip-browser-warning"] = "true";

    const resp = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers,
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
 * Transform Render backend response into the format the frontend expects.
 */
function transformResponseFromRender(functionName: string, data: any): any {
  switch (functionName) {
    case "decompose-idea":
      // Render returns flat: { business_type, location, target_customers, ... }
      // Frontend expects: { stage1: { business_type, location }, stage2: { ... } }
      if (data.stage1) return data; // Already in expected format
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

        case "discover-insights": {
      const normalizeRatio = (v: number) => {
        const parsed = Number(v || 0);
        if (!Number.isFinite(parsed)) return 0;
        return Math.max(0, Math.min(1, parsed > 1 ? parsed / 10 : parsed));
      };

      const normalizeComposite = (v: number) => {
        const parsed = Number(v || 0);
        if (!Number.isFinite(parsed)) return 0;
        return Math.max(0, Math.min(10, parsed <= 1 ? parsed * 10 : parsed));
      };

      const topLevelSources = Array.isArray(data.sources)
        ? data.sources.map(normalizeDiscoverSource)
        : [];

      const insights = (data.insights || []).map((ins: any) => {
        const mappedSources = (ins.evidence || ins.sources || ins.mentions || []).map(normalizeDiscoverSource);
        const fallbackSources = mappedSources.length > 0 ? mappedSources : topLevelSources.slice(0, 3);

        return {
          title: ins.title || "",
          type: ins.type || "pain_point",
          description: ins.description || ins.title || "",
          frequency_score: normalizeRatio(ins.frequency_score || ins.score || 0),
          severity_score: normalizeRatio(ins.intensity_score || ins.severity_score || 0),
          willingness_to_pay: normalizeRatio(ins.willingness_to_pay_score || ins.willingness_to_pay || 0),
          market_size_signal: normalizeRatio(ins.market_size_signal || 0),
          composite_score: normalizeComposite(ins.composite_score || ins.score || 0),
          tags: ins.tags || ins.source_platforms || [],
          sources: fallbackSources,
        };
      });

      return {
        insights,
        sources: topLevelSources,
        synthesis: data.synthesis || {
          top_pain_points: [],
          current_workarounds: [],
          what_they_value: [],
          willingness_signals: [],
          opportunity_score: 0,
        },
        source_summary: data.source_summary || buildSourceSummary(insights),
        summary: data.summary || {
          demand_strength: 0,
          signal_density: "low",
          trend_direction: "stable",
          trend_label: "",
          top_regions: [],
          mixed_signals: [],
          summary: "",
        },
      };
    }
    case "analyze-section":
      return data.data ? data : { data: data };

    case "setup-section":
      return data.data ? data : { data: data };

    case "validate-idea":
      return data;

    default:
      return data;
  }
}

async function tryLovableCloud<T>(functionName: string, body: unknown): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, { body });
      if (error) throw new Error(error.message || `Failed: ${functionName}`);
      if (data?.error) throw new Error(data.error);
      return data as T;
    } catch (e) {
      if (attempt === 1) throw e;
      console.warn(`[API] Lovable Cloud attempt 1 failed for ${functionName}, retrying`);
    }
  }
  throw new Error("Unreachable");
}

async function tryExternalApi<T>(baseUrl: string, functionName: string, body: unknown, timeoutMs: number): Promise<T> {
  const path = RENDER_ENDPOINTS[functionName];
  if (!path) throw new Error(`No endpoint for ${functionName}`);

  // Backend accepts simple inputs directly — no transform needed
  const resp = await tryFetch(baseUrl, path, body, timeoutMs);
  const rawData = await resp.json();
  if (rawData?.error) throw new Error(rawData.error);
  if (rawData?.detail) throw new Error(JSON.stringify(rawData.detail));

  // Treat empty Render responses as failures so we fall through to Cloud
  if (functionName === 'decompose-idea') {
    const transformed = transformResponseFromRender(functionName, rawData);
    const s1 = transformed.stage1;
    const s2 = transformed.stage2;
    const hasLocation = s1?.location?.city || s1?.location?.state;
    const hasCustomers = s2?.target_customers?.length > 0;
    const hasPriceTier = !!s2?.price_tier;
    if (!hasLocation && !hasCustomers && !hasPriceTier) {
      throw new Error('Render returned incomplete decompose data');
    }
  }

  if (functionName === 'setup-section') {
    const isEmpty = Array.isArray(rawData?.cost_tiers) && rawData.cost_tiers.length === 0 &&
      Array.isArray(rawData?.suppliers) && rawData.suppliers.length === 0;
    if (isEmpty) throw new Error('Render returned empty setup data');
  }

  return transformResponseFromRender(functionName, rawData) as T;
}

/**
 * Invoke an API function with 3-tier fallback:
 *   1. PRIMARY: Render (3s timeout)
 *   2. BACKUP:  Ngrok tunnel (4s timeout)
 *   3. LOVABLE Cloud edge functions (1 retry)
 */
export async function invokeApi<T = unknown>(functionName: string, body: unknown): Promise<T> {
  // Route unsupported analyze sections directly to Lovable Cloud
  const isUnsupportedSection = functionName === "analyze-section" && 
    RENDER_UNSUPPORTED_SECTIONS.has((body as any)?.section);

  if (LOVABLE_ONLY.has(functionName) || !RENDER_ENDPOINTS[functionName] || isUnsupportedSection) {
    console.log(`[API] Using Lovable Cloud for ${functionName}${isUnsupportedSection ? ` (section: ${(body as any)?.section})` : ''}`);
    return await tryLovableCloud<T>(functionName, body);
  }

  // Try Primary API (Render, 5s timeout)
  try {
    return await tryExternalApi<T>(PRIMARY_API, functionName, body, PRIMARY_TIMEOUT);
  } catch (e) {
    console.log(`[API] Primary (Render) failed for ${functionName}:`, (e as Error).message);
  }

  // Try Backup API (Ngrok, 90s timeout)
  try {
    return await tryExternalApi<T>(BACKUP_API, functionName, body, BACKUP_TIMEOUT);
  } catch (e) {
    console.log(`[API] Backup (Ngrok) failed for ${functionName}:`, (e as Error).message);
  }

  // Final fallback: Lovable Cloud
  console.log(`[API] Falling back to Lovable Cloud for ${functionName}`);
  return await tryLovableCloud<T>(functionName, body);
}
