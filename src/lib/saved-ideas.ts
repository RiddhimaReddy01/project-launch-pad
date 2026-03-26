import { supabase } from '@/integrations/supabase/client';

function mergeAnalysisData(existingAnalysis: any, data?: {
  decompose?: any;
  analyze?: any;
}) {
  const merged = { ...(existingAnalysis || {}) };

  if (data?.decompose) {
    merged.decompose = data.decompose;
  }

  if (data?.analyze) {
    if (data.analyze.sections || data.analyze.decompose) {
      Object.assign(merged, data.analyze);
    } else {
      merged.sections = data.analyze;
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

export async function saveIdea(ideaText: string, step: string, data?: {
  decompose?: any;
  discover?: any;
  analyze?: any;
  setup?: any;
  validate?: any;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: existing } = await supabase
    .from('saved_ideas')
    .select('id, analysis_data')
    .eq('user_id', user.id)
    .eq('idea_text', ideaText)
    .maybeSingle();

  const analysisData = mergeAnalysisData(existing?.analysis_data, data);

  const payload = {
    current_step: step,
    ...(data?.discover && { discover_data: data.discover }),
    ...(analysisData && { analysis_data: analysisData }),
    ...(data?.setup && { setup_data: data.setup }),
    ...(data?.validate && { validate_data: data.validate }),
  };

  if (existing) {
    const { error } = await supabase
      .from('saved_ideas')
      .update(payload)
      .eq('id', existing.id)
      .eq('user_id', user.id);
    return { error, id: existing.id };
  }

  const { data: newIdea, error } = await supabase
    .from('saved_ideas')
    .insert({
      user_id: user.id,
      idea_text: ideaText,
      ...payload,
    })
    .select('id')
    .single();

  return { error, id: newIdea?.id };
}

export async function saveExperiment(ideaId: string, method: { id: string; name: string }, metrics?: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('experiments').insert({
    idea_id: ideaId,
    user_id: user.id,
    method_id: method.id,
    method_name: method.name,
    status: 'planned',
    metrics: metrics || {},
  });

  return { error };
}

export async function updateExperimentMetrics(experimentId: string, metrics: any, status?: string) {
  const update: any = { metrics };
  if (status) update.status = status;

  const { error } = await supabase.from('experiments').update(update).eq('id', experimentId);
  return { error };
}
