
CREATE TABLE public.result_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  function_name text NOT NULL,
  result_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.result_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cache" ON public.result_cache FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert cache" ON public.result_cache FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update cache" ON public.result_cache FOR UPDATE TO anon, authenticated USING (true);

CREATE INDEX idx_result_cache_key ON public.result_cache (cache_key);
CREATE INDEX idx_result_cache_function ON public.result_cache (function_name);
