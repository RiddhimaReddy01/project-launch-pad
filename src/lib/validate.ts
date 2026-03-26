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
  strategy?: {
    business_model: string;
    recommended_methods: string[];
    effort_estimate_hours: number;
    timeline_weeks: number;
    typical_conversion_rate: number;
    typical_cac: number;
    description: string;
  } | null;
  expected_outcomes?: Record<string, Record<string, string>>;
  simulation?: {
    starting_audience?: number;
    expected_signups?: number;
    expected_paid_conversions?: number;
    expected_survey_responses?: number;
    outreach_messages?: number;
    expected_replies?: number;
    notes?: string[];
  };
  recommended_sequence?: string[];
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

/**
 * Generate validation assets. Supports two modes:
 * - Simple: idea + channels (backend handles internally)
 * - Context: full ValidateContext (for Lovable Cloud fallback)
 */
export async function generateValidation(
  ideaOrContext: string | ValidateContext,
  channelsOrOutputs?: string[]
): Promise<ValidateResult> {
  const body = typeof ideaOrContext === 'string'
    ? { idea: ideaOrContext, channels: channelsOrOutputs || [] }
    : { context: ideaOrContext, required_outputs: channelsOrOutputs };

  const result = await invokeApi<any>("validate-idea", body);
  return {
    landing_page: result?.landing_page || null,
    survey: Array.isArray(result?.survey)
      ? result.survey
      : Array.isArray(result?.survey?.questions)
        ? result.survey.questions
        : null,
    whatsapp: result?.whatsapp || result?.whatsapp_message || null,
    communities: Array.isArray(result?.communities) ? result.communities : null,
    scorecard: Array.isArray(result?.scorecard)
      ? result.scorecard
      : Array.isArray(result?.scorecard?.metrics)
        ? result.scorecard.metrics
        : [],
    strategy: result?.strategy || null,
    expected_outcomes: result?.expected_outcomes || {},
    simulation: result?.simulation || {},
    recommended_sequence: Array.isArray(result?.recommended_sequence) ? result.recommended_sequence : [],
  };
}
