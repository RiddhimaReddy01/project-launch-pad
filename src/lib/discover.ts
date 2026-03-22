import { supabase } from "@/integrations/supabase/client";

export interface DiscoverSource {
  platform: "reddit" | "google" | "yelp";
  text: string;
  url: string;
  author: string;
  date: string;
  upvotes?: number | null;
}

export interface DiscoverInsight {
  title: string;
  type: "pain_point" | "workaround" | "demand_signal" | "expectation";
  description: string;
  frequency_score: number;
  severity_score: number;
  willingness_to_pay: number;
  market_size_signal: number;
  composite_score: number;
  tags: string[];
  sources: DiscoverSource[];
}

export interface DiscoverSynthesis {
  top_pain_points: string[];
  current_workarounds: string[];
  what_they_value: string[];
  willingness_signals: string[];
  opportunity_score: number;
}

export interface DiscoverSourceSummary {
  reddit_count: number;
  google_count: number;
  yelp_count: number;
  total_signals: number;
}

export interface DiscoverResult {
  insights: DiscoverInsight[];
  synthesis: DiscoverSynthesis;
  source_summary: DiscoverSourceSummary;
}

// In-memory cache
const memCache = new Map<string, { result: DiscoverResult; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000;

function cacheKey(decomposition: any): string {
  return JSON.stringify({
    bt: decomposition.business_type,
    loc: decomposition.location,
  });
}

export async function discoverInsights(decomposition: {
  business_type: string;
  location: { city: string; state: string };
  search_queries: string[];
  source_domains: string[];
  subreddits?: string[];
  target_customers?: string[];
  price_tier?: string;
}): Promise<DiscoverResult> {
  const key = cacheKey(decomposition);

  // Check memory cache
  const cached = memCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  const { data, error } = await supabase.functions.invoke("discover-insights", {
    body: { decomposition },
  });

  if (error) {
    throw new Error(error.message || "Failed to discover insights");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  const result = data as DiscoverResult;

  memCache.set(key, { result, timestamp: Date.now() });

  return result;
}
