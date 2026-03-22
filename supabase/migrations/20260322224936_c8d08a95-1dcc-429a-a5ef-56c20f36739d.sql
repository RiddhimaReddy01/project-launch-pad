CREATE TABLE public.decompose_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_text_hash text NOT NULL UNIQUE,
  idea_text text NOT NULL,
  stage1_data jsonb DEFAULT '{}'::jsonb,
  stage2_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.decompose_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cache"
  ON public.decompose_cache FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert cache"
  ON public.decompose_cache FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update cache"
  ON public.decompose_cache FOR UPDATE
  TO anon, authenticated
  USING (true);