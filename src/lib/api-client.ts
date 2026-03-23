/**
 * 3-tier fallback API client:
 *   1. PRIMARY: https://launchlens.com (Cloudflare Tunnel)
 *   2. BACKUP:  https://launch-lean-ed28c2e7.onrender.com (Render)
 *   3. LOVABLE: Lovable Cloud edge functions (supabase.functions.invoke)
 */

import { supabase } from "@/integrations/supabase/client";

const PRIMARY_API = "https://launchlens.com";
const BACKUP_API = "https://launch-lean-ed28c2e7.onrender.com";

// Map edge function names to external API paths
const ENDPOINT_MAP: Record<string, string> = {
  "decompose-idea": "/api/decompose-idea",
  "discover-insights": "/api/discover-insights",
  "analyze-section": "/api/analyze-section",
  "setup-section": "/api/generate-setup",
  "validate-idea": "/api/generate-validation",
};

// Functions where Lovable Cloud (better AI) should be tried FIRST
const LOVABLE_FIRST = new Set(["decompose-idea"]);

async function tryFetch(baseUrl: string, path: string, body: unknown, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Invoke an API function with 3-tier fallback.
 * @param functionName - The edge function name (e.g. "decompose-idea")
 * @param body - The request body
 * @returns Parsed JSON response
 */
export async function invokeApi<T = unknown>(functionName: string, body: unknown): Promise<T> {
  const externalPath = ENDPOINT_MAP[functionName];

  // For some functions, Lovable Cloud has better AI — try it first
  if (LOVABLE_FIRST.has(functionName)) {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, { body });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data as T;
    } catch (e) {
      console.log(`[API] Lovable Cloud failed for ${functionName}:`, (e as Error).message);
    }
  }

  // Try external backends: primary → backup
  if (externalPath) {
    // Try PRIMARY
    try {
      const resp = await tryFetch(PRIMARY_API, externalPath, body, 6000);
      const data = await resp.json();
      if (data?.error) throw new Error(data.error);
      return data as T;
    } catch (e) {
      console.log(`[API] Primary failed for ${functionName}:`, (e as Error).message);
    }

    // Try BACKUP
    try {
      const resp = await tryFetch(BACKUP_API, externalPath, body, 15000);
      const data = await resp.json();
      if (data?.error) throw new Error(data.error);
      return data as T;
    } catch (e) {
      console.log(`[API] Backup failed for ${functionName}:`, (e as Error).message);
    }
  }

  // Final fallback to Lovable Cloud (for non-LOVABLE_FIRST functions)
  if (!LOVABLE_FIRST.has(functionName)) {
    console.log(`[API] Falling back to Lovable Cloud for ${functionName}`);
    const { data, error } = await supabase.functions.invoke(functionName, { body });
    if (error) throw new Error(error.message || `Failed: ${functionName}`);
    if (data?.error) throw new Error(data.error);
    return data as T;
  }

  throw new Error(`All API backends failed for ${functionName}`);
}
