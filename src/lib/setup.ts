import { invokeApi } from "@/lib/api-client";

export interface SetupContext {
  business_type: string;
  city: string;
  state: string;
  target_customers?: string[];
  tier: string;
}

export type SetupSectionKey = "costs" | "suppliers" | "team" | "timeline";

// ── Tier types ──
export interface TierDef {
  id: string;
  title: string;
  philosophy: string;
  approach: string;
  team_size: string;
  timeline_weeks: number;
  cost_min: number;
  cost_max: number;
  best_for: string;
}

export interface CostLineItem {
  label: string;
  min: number;
  max: number;
  note: string;
}

export interface CostCategory {
  category: string;
  items: CostLineItem[];
}

export interface CostsResult {
  tiers: TierDef[];
  breakdown: Record<string, CostCategory[]>;
}

// ── Supplier types ──
export interface SupplierItem {
  category: string;
  name: string;
  description: string;
  location: string;
  website: string;
  cost: string;
  why_recommended: string;
}

export interface SuppliersResult {
  suppliers: SupplierItem[];
}

// ── Team types ──
export interface TeamMember {
  title: string;
  type: "FTE" | "Contract" | "Advisory";
  salary_min: number;
  salary_max: number;
  salary_label: string;
  priority: "MUST_HAVE" | "NICE_TO_HAVE";
  month: number;
  why_needed: string;
}

export interface TeamResult {
  team: TeamMember[];
  total_payroll: number;
}

// ── Timeline types ──
export interface TimelinePhase {
  phase: string;
  weeks: number;
  budget_percent: number;
  milestones: string[];
  success_metric: string;
}

export interface TimelineResult {
  phases: TimelinePhase[];
}

export type SetupSectionData = CostsResult | SuppliersResult | TeamResult | TimelineResult;

export async function setupSection(
  section: SetupSectionKey,
  context: SetupContext
): Promise<SetupSectionData> {
  const result = await invokeApi<{ data: SetupSectionData }>("setup-section", { section, context });
  return result.data ?? (result as unknown as SetupSectionData);
}
