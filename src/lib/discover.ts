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

function normalizePlatform(value: unknown): "reddit" | "google" | "yelp" {
  const raw = String(value || "").trim().toLowerCase();
  if (raw.includes("reddit")) return "reddit";
  if (raw.includes("yelp")) return "yelp";
  return "google";
}

function normalizeScore(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return parsed > 1 ? parsed / 10 : parsed;
}

function normalizeSource(source: any): DiscoverSource {
  return {
    platform: normalizePlatform(
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

export function normalizeDiscoverResult(result: any): DiscoverResult {
  const insights: DiscoverInsight[] = (result?.insights || []).map((insight: any) => ({
    title: insight?.title || "",
    type: insight?.type || "pain_point",
    description: insight?.description || insight?.title || "",
    frequency_score: normalizeScore(insight?.frequency_score || insight?.score || 0),
    severity_score: normalizeScore(insight?.severity_score || insight?.intensity_score || 0),
    willingness_to_pay: normalizeScore(insight?.willingness_to_pay || insight?.willingness_to_pay_score || 0),
    market_size_signal: normalizeScore(insight?.market_size_signal || 0),
    composite_score: normalizeScore(insight?.composite_score || insight?.score || 0),
    tags: Array.isArray(insight?.tags) ? insight.tags : Array.isArray(insight?.source_platforms) ? insight.source_platforms : [],
    sources: (insight?.sources || insight?.evidence || insight?.mentions || []).map(normalizeSource),
  }));

  const allSources = insights.flatMap((insight) => insight.sources);

  return {
    insights,
    synthesis: result?.synthesis || {
      top_pain_points: [],
      current_workarounds: [],
      what_they_value: [],
      willingness_signals: [],
      opportunity_score: 0,
    },
    source_summary: {
      reddit_count: allSources.filter((source) => source.platform === "reddit").length,
      google_count: allSources.filter((source) => source.platform === "google").length,
      yelp_count: allSources.filter((source) => source.platform === "yelp").length,
      total_signals: allSources.length,
    },
  };
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

  const result = normalizeDiscoverResult(await invokeApi<DiscoverResult>("discover-insights", { idea }));

  memCache.set(key, { result, timestamp: Date.now() });

  return result;
}
