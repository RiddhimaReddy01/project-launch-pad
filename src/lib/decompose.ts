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

  // Call edge function
  const { data, error } = await supabase.functions.invoke("decompose-idea", {
    body: { idea },
  });

  if (error) {
    throw new Error(error.message || "Failed to decompose idea");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  const result = data as DecomposeResult;

  // Store in memory cache
  memCache.set(key, { result, timestamp: Date.now() });

  return result;
}
