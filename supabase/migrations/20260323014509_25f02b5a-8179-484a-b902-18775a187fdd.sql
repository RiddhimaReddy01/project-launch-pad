-- 1. Extend saved_ideas to function as 'projects'
ALTER TABLE public.saved_ideas 
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_section text;

-- Backfill title from idea_text (truncate to 80 chars)
UPDATE public.saved_ideas SET title = LEFT(idea_text, 80) WHERE title IS NULL;

-- 2. Project notes table
CREATE TABLE public.project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.saved_ideas(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Section history (per-section snapshots on regenerate)
CREATE TABLE public.section_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.saved_ideas(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  section_key text NOT NULL,
  section_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Saved insights (cross-project pinned insights)
CREATE TABLE public.saved_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.saved_ideas(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  section_type text NOT NULL DEFAULT 'general',
  source_data jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Validation assets library
CREATE TABLE public.validation_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.saved_ideas(id) ON DELETE CASCADE NOT NULL,
  asset_type text NOT NULL,
  asset_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  method_id text,
  status text DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Enable RLS on all new tables
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_assets ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies
CREATE POLICY "Users manage own notes" ON public.project_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own history" ON public.section_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own insights" ON public.saved_insights FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own assets" ON public.validation_assets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. Triggers for updated_at
CREATE TRIGGER project_notes_updated_at BEFORE UPDATE ON public.project_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER validation_assets_updated_at BEFORE UPDATE ON public.validation_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();