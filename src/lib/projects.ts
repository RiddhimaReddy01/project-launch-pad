import { supabase } from '@/integrations/supabase/client';

export interface Project {
  id: string;
  user_id: string;
  idea_text: string;
  title: string | null;
  status: string | null;
  progress: number | null;
  current_step: string | null;
  last_section: string | null;
  discover_data: any;
  analysis_data: any;
  setup_data: any;
  validate_data: any;
  created_at: string;
  updated_at: string;
}

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('saved_ideas')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('saved_ideas')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Project | null;
}

export async function createProject(ideaText: string, userId: string): Promise<Project> {
  const { data, error } = await supabase
    .from('saved_ideas')
    .insert({
      user_id: userId,
      idea_text: ideaText,
      title: ideaText.slice(0, 80),
      status: 'active',
      current_step: 'discover',
      progress: 0,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as Project;
}

export async function updateProject(id: string, updates: Partial<Pick<Project, 'title' | 'status' | 'progress' | 'current_step' | 'last_section' | 'discover_data' | 'analysis_data' | 'setup_data' | 'validate_data'>>) {
  const { error } = await supabase
    .from('saved_ideas')
    .update(updates as any)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteProject(id: string) {
  const { error } = await supabase
    .from('saved_ideas')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Section History ──

export async function saveSectionHistory(projectId: string, userId: string, sectionKey: string, sectionData: any) {
  const { error } = await supabase
    .from('section_history')
    .insert({
      project_id: projectId,
      user_id: userId,
      section_key: sectionKey,
      section_data: sectionData,
    } as any);
  if (error) throw error;
}

export async function getSectionHistory(projectId: string, sectionKey?: string) {
  let query = supabase
    .from('section_history')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (sectionKey) query = query.eq('section_key', sectionKey);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ── Notes ──

export async function getProjectNotes(projectId: string) {
  const { data, error } = await supabase
    .from('project_notes')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addProjectNote(projectId: string, userId: string, content: string) {
  const { data, error } = await supabase
    .from('project_notes')
    .insert({ project_id: projectId, user_id: userId, content } as any)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateProjectNote(noteId: string, content: string) {
  const { error } = await supabase
    .from('project_notes')
    .update({ content } as any)
    .eq('id', noteId);
  if (error) throw error;
}

export async function deleteProjectNote(noteId: string) {
  const { error } = await supabase
    .from('project_notes')
    .delete()
    .eq('id', noteId);
  if (error) throw error;
}

// ── Saved Insights ──

export async function getSavedInsights(userId?: string) {
  const { data, error } = await supabase
    .from('saved_insights')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveInsight(userId: string, insight: {
  project_id?: string;
  title: string;
  content: string;
  section_type: string;
  source_data?: any;
  tags?: string[];
}) {
  const { data, error } = await supabase
    .from('saved_insights')
    .insert({ user_id: userId, ...insight } as any)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteInsight(insightId: string) {
  const { error } = await supabase
    .from('saved_insights')
    .delete()
    .eq('id', insightId);
  if (error) throw error;
}

// ── Validation Assets ──

export async function getValidationAssets(projectId?: string) {
  let query = supabase
    .from('validation_assets')
    .select('*')
    .order('created_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function saveValidationAsset(userId: string, asset: {
  project_id: string;
  asset_type: string;
  asset_data: any;
  method_id?: string;
  status?: string;
}) {
  const { data, error } = await supabase
    .from('validation_assets')
    .insert({ user_id: userId, ...asset } as any)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateValidationAsset(assetId: string, updates: { asset_data?: any; status?: string }) {
  const { error } = await supabase
    .from('validation_assets')
    .update(updates as any)
    .eq('id', assetId);
  if (error) throw error;
}

export async function deleteValidationAsset(assetId: string) {
  const { error } = await supabase
    .from('validation_assets')
    .delete()
    .eq('id', assetId);
  if (error) throw error;
}
