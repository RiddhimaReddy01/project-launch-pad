import { invokeApi } from "@/lib/api-client";

export interface AnalyzeContext {
  business_type: string;
  city: string;
  state: string;
  target_customers?: string[];
  price_tier?: string;
  insight_title?: string;
  insight_evidence?: string;
}

export type SectionKey = "opportunity" | "customers" | "competitors" | "rootcause" | "costs" | "risk" | "location" | "moat";

// ── Section result types ──

export interface MarketTier {
  value: number;
  formatted: string;
  methodology: string;
  confidence: "low" | "medium" | "high";
}

export interface OpportunityData {
  tam: MarketTier;
  sam: MarketTier;
  som: MarketTier;
  funnel: {
    population: number;
    aware: number;
    interested: number;
    willing_to_try: number;
    repeat_customers: number;
  };
}

export interface CustomerSegment {
  name: string;
  description: string;
  estimated_size: number;
  pain_intensity: number;
  primary_need: string;
  spending_pattern: string;
  where_to_find: string;
}

export interface CustomersData {
  segments: CustomerSegment[];
}

export interface Competitor {
  name: string;
  location: string;
  rating: number;
  price_range: string;
  key_strength: string;
  key_gap: string;
  threat_level: "low" | "medium" | "high";
  url: string;
}

export interface CompetitorsData {
  competitors: Competitor[];
  unfilled_gaps: string[];
}

export interface RootCause {
  cause_number: number;
  title: string;
  explanation: string;
  your_move: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface RootCauseData {
  root_causes: RootCause[];
}

export interface CostItem {
  category: string;
  min: number;
  max: number;
}

export interface CostsData {
  total_range: { min: number; max: number };
  breakdown: CostItem[];
  note: string;
}

export interface RiskItem {
  risk: string;
  likelihood: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  mitigation: string;
  category: string;
}

export interface RiskData {
  risks: RiskItem[];
  overall_risk_level: "low" | "medium" | "high";
  summary: string;
}

export interface LocationData {
  demographics: {
    population: number;
    median_income: number;
    median_age: number;
    growth_rate: string;
  };
  foot_traffic: {
    best_areas: string[];
    avg_monthly_rent_sqft: number;
    competitor_density: string;
  };
  regulatory: {
    key_permits: string[];
    estimated_timeline: string;
    notes: string;
  };
  score: number;
  verdict: string;
}

export interface MoatDimension {
  dimension: string;
  score: number;
  rationale: string;
}

export interface MoatData {
  dimensions: MoatDimension[];
  overall_score: number;
  strongest: string;
  weakest: string;
  recommendation: string;
}

export type SectionData = OpportunityData | CustomersData | CompetitorsData | RootCauseData | CostsData | RiskData | LocationData | MoatData;

export async function analyzeSection(
  section: SectionKey,
  context: AnalyzeContext
): Promise<SectionData> {
  const { data, error } = await supabase.functions.invoke("analyze-section", {
    body: { section, context },
  });

  if (error) throw new Error(error.message || `Failed to analyze ${section}`);
  if (data?.error) throw new Error(data.error);

  return data.data as SectionData;
}

/**
 * Run multiple analyze sections in parallel.
 * Returns a map of section key → result or error.
 */
export async function analyzeSectionsParallel(
  sections: SectionKey[],
  context: AnalyzeContext
): Promise<Record<SectionKey, { data?: SectionData; error?: string }>> {
  const results = await Promise.allSettled(
    sections.map(async (section) => {
      const data = await analyzeSection(section, context);
      return { section, data };
    })
  );

  const map: Record<string, { data?: SectionData; error?: string }> = {};
  results.forEach((result, i) => {
    const section = sections[i];
    if (result.status === 'fulfilled') {
      map[section] = { data: result.value.data };
    } else {
      map[section] = { error: result.reason?.message || 'Analysis failed' };
    }
  });

  return map as Record<SectionKey, { data?: SectionData; error?: string }>;
}
