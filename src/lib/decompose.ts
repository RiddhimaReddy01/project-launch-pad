import { invokeApi } from "@/lib/api-client";

export interface DecomposeStage1 {
  business_type: string;
  location: { city: string; state: string };
}

export interface DecomposeStage2 {
  target_customers: string[];
  price_tier: string;
  search_queries: string[];
  source_domains: string[];
  subreddits: string[];
}

export interface DecomposeResult {
  cached: boolean;
  stage1: DecomposeStage1;
  stage2: DecomposeStage2;
}

// In-memory cache (15 min TTL)
const memCache = new Map<string, { result: DecomposeResult; timestamp: number }>();
const MEM_CACHE_TTL = 15 * 60 * 1000;

function normalizeIdea(idea: string): string {
  return idea.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function decomposeIdea(idea: string): Promise<DecomposeResult> {
  const key = normalizeIdea(idea);

  // Check in-memory cache
  const memEntry = memCache.get(key);
  if (memEntry && Date.now() - memEntry.timestamp < MEM_CACHE_TTL) {
    return { ...memEntry.result, cached: true };
  }

  // Call API with 3-tier fallback
  const raw = await invokeApi<any>("decompose-idea", { idea });

  // Normalize: Render backend returns flat format, edge function returns stage1/stage2
  let result: DecomposeResult;
  if (raw.stage1 && raw.stage2) {
    result = raw as DecomposeResult;
  } else {
    // Flat format from Render backend
    result = {
      cached: raw.cached ?? false,
      stage1: {
        business_type: raw.business_type || "",
        location: raw.location || { city: "", state: "" },
      },
      stage2: {
        target_customers: raw.target_customers || [],
        price_tier: raw.price_tier || "",
        search_queries: raw.search_queries || [],
        source_domains: raw.source_domains || [],
        subreddits: raw.subreddits || [],
      },
    };
  }

  // Store in memory cache
  memCache.set(key, { result, timestamp: Date.now() });

  return result;
}
