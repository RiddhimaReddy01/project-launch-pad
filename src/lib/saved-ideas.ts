import { supabase } from '@/integrations/supabase/client';

export async function saveIdea(ideaText: string, step: string, data?: {
  discover?: any;
  analyze?: any;
  setup?: any;
  validate?: any;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Check if idea already saved
  const { data: existing } = await supabase
    .from('saved_ideas')
    .select('id')
    .eq('user_id', user.id)
    .eq('idea_text', ideaText)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('saved_ideas')
      .update({
        current_step: step,
        ...(data?.discover && { discover_data: data.discover }),
        ...(data?.analyze && { analysis_data: data.analyze }),
        ...(data?.setup && { setup_data: data.setup }),
        ...(data?.validate && { validate_data: data.validate }),
      })
      .eq('id', existing.id);
    return { error, id: existing.id };
  }

  const { data: newIdea, error } = await supabase
    .from('saved_ideas')
    .insert({
      user_id: user.id,
      idea_text: ideaText,
      current_step: step,
      ...(data?.discover && { discover_data: data.discover }),
      ...(data?.analyze && { analysis_data: data.analyze }),
      ...(data?.setup && { setup_data: data.setup }),
      ...(data?.validate && { validate_data: data.validate }),
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
