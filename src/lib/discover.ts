import { invokeApi } from "@/lib/api-client";

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
  type: string;
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

export async function discoverInsights(idea: string): Promise<DiscoverResult> {
  const key = idea.trim().toLowerCase();

  const cached = memCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  const result = await invokeApi<DiscoverResult>("discover-insights", { idea });

  memCache.set(key, { result, timestamp: Date.now() });

  return result;
}
