/**
 * 3-tier fallback API client:
 *   1. PRIMARY: Render (5s timeout)
 *   2. BACKUP:  Ngrok (90s timeout)
 *   3. LOVABLE: Lovable Cloud edge functions (supabase.functions.invoke)
 */

import { supabase } from "@/integrations/supabase/client";

const PRIMARY_API = "https://launch-lean-ed28c2e7.onrender.com";
const BACKUP_API = "https://steven-impervious-lorretta.ngrok-free.dev";
const PRIMARY_TIMEOUT = 5000;
const BACKUP_TIMEOUT = 90000;

// Map edge function names to Render API paths
const RENDER_ENDPOINTS: Record<string, string> = {
  "decompose-idea": "/api/decompose-idea",
  "discover-insights": "/api/discover-insights",
  "analyze-section": "/api/analyze-section",
  "setup-section": "/api/setup",
  "validate-idea": "/api/generate-validation",
};

// Functions where Lovable Cloud is the ONLY option (no backend endpoint exists)
const LOVABLE_ONLY = new Set<string>([]);

// Sections not supported by the Render backend — route to Lovable Cloud
const RENDER_UNSUPPORTED_SECTIONS = new Set(["risk", "location", "moat"]);

async function tryFetch(baseUrl: string, path: string, body: unknown, timeoutMs: number): Promise<Response> {
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

    case "discover-insights":
      if (data.synthesis) return data; // Already expected format
      const normalizeScore = (v: number) => v > 1 ? v / 10 : v;
      return {
        insights: (data.insights || []).map((ins: any) => ({
          title: ins.title || "",
          type: ins.type || "pain_point",
          description: ins.description || ins.title || "",
          frequency_score: normalizeScore(ins.frequency_score || ins.score || 0),
          severity_score: normalizeScore(ins.intensity_score || ins.severity_score || 0),
          willingness_to_pay: normalizeScore(ins.willingness_to_pay_score || ins.willingness_to_pay || 0),
          market_size_signal: normalizeScore(ins.market_size_signal || 0),
          composite_score: normalizeScore(ins.score || ins.composite_score || 0),
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
  const { data, error } = await supabase.functions.invoke(functionName, { body });
  if (error) throw new Error(error.message || `Failed: ${functionName}`);
  if (data?.error) throw new Error(data.error);
  return data as T;
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
  if (functionName === 'setup-section') {
    const isEmpty = Array.isArray(rawData?.cost_tiers) && rawData.cost_tiers.length === 0 &&
      Array.isArray(rawData?.suppliers) && rawData.suppliers.length === 0;
    if (isEmpty) throw new Error('Render returned empty setup data');
  }

  return transformResponseFromRender(functionName, rawData) as T;
}

/**
 * Invoke an API function with 3-tier fallback:
 *   1. PRIMARY: Render (5s timeout)
 *   2. BACKUP:  Ngrok tunnel (90s timeout)
 *   3. LOVABLE Cloud edge functions
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
