
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'viewer');
CREATE TYPE public.algorithm_type AS ENUM ('fixed', 'greedy');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + give first user admin role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INT;
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count <= 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- intersections
CREATE TABLE public.intersections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  approaches JSONB NOT NULL DEFAULT '{"N":true,"S":true,"E":true,"W":true}'::jsonb,
  algorithm public.algorithm_type NOT NULL DEFAULT 'fixed',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.intersections TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.intersections TO authenticated;
GRANT ALL ON public.intersections TO service_role;
ALTER TABLE public.intersections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intersections public read" ON public.intersections FOR SELECT USING (true);
CREATE POLICY "intersections admin write" ON public.intersections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- stat_snapshots
CREATE TABLE public.stat_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  algorithm public.algorithm_type NOT NULL,
  total_vehicles INT NOT NULL,
  vehicles_passed INT NOT NULL,
  avg_wait_seconds DOUBLE PRECISION NOT NULL,
  congestion_score DOUBLE PRECISION NOT NULL,
  emergency_active BOOLEAN NOT NULL DEFAULT false
);
GRANT SELECT ON public.stat_snapshots TO anon, authenticated;
GRANT INSERT ON public.stat_snapshots TO authenticated;
GRANT ALL ON public.stat_snapshots TO service_role;
ALTER TABLE public.stat_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "snapshots public read" ON public.stat_snapshots FOR SELECT USING (true);
CREATE POLICY "snapshots admin insert" ON public.stat_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_snapshots_taken_at ON public.stat_snapshots(taken_at DESC);

-- algorithm_runs
CREATE TABLE public.algorithm_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  algorithm public.algorithm_type NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  avg_wait_seconds DOUBLE PRECISION,
  vehicles_passed INT,
  congestion_score DOUBLE PRECISION,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT ON public.algorithm_runs TO anon, authenticated;
GRANT INSERT, UPDATE ON public.algorithm_runs TO authenticated;
GRANT ALL ON public.algorithm_runs TO service_role;
ALTER TABLE public.algorithm_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runs public read" ON public.algorithm_runs FOR SELECT USING (true);
CREATE POLICY "runs admin write" ON public.algorithm_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- emergency_events
CREATE TABLE public.emergency_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  route JSONB NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
GRANT SELECT ON public.emergency_events TO anon, authenticated;
GRANT INSERT, UPDATE ON public.emergency_events TO authenticated;
GRANT ALL ON public.emergency_events TO service_role;
ALTER TABLE public.emergency_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emergency public read" ON public.emergency_events FOR SELECT USING (true);
CREATE POLICY "emergency admin write" ON public.emergency_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- simulation_logs
CREATE TABLE public.simulation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  meta JSONB
);
GRANT SELECT, INSERT ON public.simulation_logs TO authenticated;
GRANT ALL ON public.simulation_logs TO service_role;
ALTER TABLE public.simulation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs admin all" ON public.simulation_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.intersections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stat_snapshots;
