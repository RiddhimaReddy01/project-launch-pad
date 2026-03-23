import { supabase } from "@/integrations/supabase/client";

// ── Types ──

export interface LandingPageOutput {
  headline: string;
  subheadline: string;
  benefits: string[];
  cta: string;
  social_proof: string;
}

export interface SurveyQuestion {
  id: string;
  question: string;
  type: 'scale' | 'multiple_choice' | 'open' | 'yes_no' | 'email';
  options?: string[];
}

export interface WhatsAppOutput {
  message: string;
  tone: string;
}

export interface Community {
  name: string;
  platform: string;
  members: string;
  url: string;
  rationale: string;
}

export interface ScorecardMetric {
  id: string;
  label: string;
  target: number;
  target_label: string;
  unit: string;
  actual: number;
}

export interface ValidateResult {
  landing_page: LandingPageOutput;
  survey: SurveyQuestion[];
  whatsapp: WhatsAppOutput;
  communities: Community[];
  scorecard: ScorecardMetric[];
}

export interface ValidateContext {
  business_type: string;
  city: string;
  state: string;
  target_customers?: string[];
  price_tier?: string;
  insight_title?: string;
  insight_evidence?: string;
  customer_quotes?: string[];
  som_value?: string;
  competitor_gaps?: string[];
  root_causes?: string[];
  cost_estimate?: string;
  timeline_summary?: string;
}

export async function generateValidation(context: ValidateContext): Promise<ValidateResult> {
  const { data, error } = await supabase.functions.invoke('validate-idea', {
    body: { context },
  });

  if (error) throw new Error(error.message || 'Failed to generate validation assets');
  if (!data) throw new Error('No data returned');

  return data as ValidateResult;
}
