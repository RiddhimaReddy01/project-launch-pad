import { supabase } from "@/integrations/supabase/client";
import type { LaunchTier, CostCategory, Supplier, TeamRole, TimelinePhase } from "@/data/setup-mock";

export interface SetupContext {
  business_type: string;
  city: string;
  state: string;
  target_customers?: string[];
  tier?: string;
}

export type SetupSectionKey = "costs" | "suppliers" | "team" | "timeline";

export interface SetupCostsData {
  tiers: LaunchTier[];
  tierCosts: Record<string, CostCategory[]>;
}

export interface SetupSuppliersData {
  suppliers: Record<string, Supplier[]>;
}

export interface SetupTeamData {
  team: TeamRole[];
}

export interface SetupTimelineData {
  phases: TimelinePhase[];
}

export type SetupSectionData = SetupCostsData | SetupSuppliersData | SetupTeamData | SetupTimelineData;

export async function setupSection(
  section: SetupSectionKey,
  context: SetupContext
): Promise<SetupSectionData> {
  const { data, error } = await supabase.functions.invoke("setup-section", {
    body: { section, context },
  });

  if (error) throw new Error(error.message || `Failed to generate ${section}`);
  if (data?.error) throw new Error(data.error);

  return data.data as SetupSectionData;
}
