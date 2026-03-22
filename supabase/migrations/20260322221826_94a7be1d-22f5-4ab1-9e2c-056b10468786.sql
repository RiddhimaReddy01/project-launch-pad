
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.saved_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idea_text TEXT NOT NULL,
  analysis_data JSONB DEFAULT '{}'::jsonb,
  discover_data JSONB DEFAULT '{}'::jsonb,
  setup_data JSONB DEFAULT '{}'::jsonb,
  validate_data JSONB DEFAULT '{}'::jsonb,
  current_step TEXT DEFAULT 'discover',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ideas" ON public.saved_ideas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own ideas" ON public.saved_ideas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ideas" ON public.saved_ideas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ideas" ON public.saved_ideas FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_saved_ideas_updated_at BEFORE UPDATE ON public.saved_ideas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES public.saved_ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method_id TEXT NOT NULL,
  method_name TEXT NOT NULL,
  status TEXT DEFAULT 'planned',
  metrics JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  guide_data JSONB DEFAULT '{}'::jsonb,
  assets_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own experiments" ON public.experiments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own experiments" ON public.experiments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own experiments" ON public.experiments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own experiments" ON public.experiments FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_experiments_updated_at BEFORE UPDATE ON public.experiments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
