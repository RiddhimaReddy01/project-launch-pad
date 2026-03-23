import { invokeApi } from "@/lib/api-client";

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
  landing_page: LandingPageOutput | null;
  survey: SurveyQuestion[] | null;
  whatsapp: WhatsAppOutput | null;
  communities: Community[] | null;
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

export async function generateValidation(
  context: ValidateContext,
  requiredOutputs?: string[]
): Promise<ValidateResult> {
  return await invokeApi<ValidateResult>("validate-idea", {
    context,
    required_outputs: requiredOutputs,
  });
}
