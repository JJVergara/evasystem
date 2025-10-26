
-- Expansión conservativa de la tabla organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Santiago',
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS meta_token TEXT,
ADD COLUMN IF NOT EXISTS token_expiry TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'basic', 'intermediate', 'advanced', 'elite'));

-- Expansión conservativa de la tabla users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'viewer')),
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Expansión conservativa de la tabla embassadors
ALTER TABLE public.embassadors 
ADD COLUMN IF NOT EXISTS rut TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS global_category TEXT DEFAULT 'bronze' CHECK (global_category IN ('bronze', 'plata', 'oro', 'diamante')),
ADD COLUMN IF NOT EXISTS performance_status TEXT DEFAULT 'cumple' CHECK (performance_status IN ('no_cumple', 'cumple', 'advertencia', 'exclusivo')),
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
ADD COLUMN IF NOT EXISTS profile_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS global_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS events_participated INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_tasks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_tasks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES public.users(id);

-- Expansión conservativa de la tabla events
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
ADD COLUMN IF NOT EXISTS main_hashtag TEXT,
ADD COLUMN IF NOT EXISTS secondary_hashtags TEXT[],
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES public.users(id);

-- Crear tabla tasks para gestión de historias y menciones
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embassador_id UUID NOT NULL REFERENCES public.embassadors(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('story', 'mention', 'repost')),
  platform TEXT DEFAULT 'instagram',
  expected_hashtag TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'in_progress', 'completed', 'invalid', 'expired')),
  instagram_story_id TEXT,
  story_url TEXT,
  upload_time TIMESTAMP WITH TIME ZONE,
  expiry_time TIMESTAMP WITH TIME ZONE,
  completion_method TEXT DEFAULT '24h_validation' CHECK (completion_method IN ('24h_validation', 'manual')),
  engagement_score FLOAT DEFAULT 0,
  reach_count INTEGER DEFAULT 0,
  verified_through_api BOOLEAN DEFAULT false,
  points_earned INTEGER DEFAULT 0,
  last_status_update TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla task_logs para auditoría
CREATE TABLE IF NOT EXISTS public.task_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  timestamp_checked TIMESTAMP WITH TIME ZONE DEFAULT now(),
  was_active BOOLEAN,
  story_status TEXT,
  api_response JSONB,
  details TEXT,
  checked_by TEXT DEFAULT 'system'
);

-- Crear tabla plans para configuración de límites
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price DECIMAL(10,2) DEFAULT 0,
  max_ambassadors INTEGER,
  max_events INTEGER,
  max_users INTEGER,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla leaderboards para rankings
CREATE TABLE IF NOT EXISTS public.leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  embassador_id UUID NOT NULL REFERENCES public.embassadors(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  rank INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, embassador_id)
);

-- Crear tabla notifications para sistema de notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  target_type TEXT,
  target_id UUID,
  read_status BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla import_logs para auditoría de importaciones
CREATE TABLE IF NOT EXISTS public.import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  type TEXT NOT NULL,
  source TEXT,
  file_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insertar planes predefinidos
INSERT INTO public.plans (name, slug, price, max_ambassadors, max_events, max_users, features) 
VALUES 
  ('Free', 'free', 0, 10, 2, 1, '{"analytics": "basic", "export": "csv", "support": "community"}'),
  ('Basic', 'basic', 29.99, 50, 5, 3, '{"analytics": "advanced", "export": "csv,pdf", "support": "email"}'),
  ('Intermediate', 'intermediate', 59.99, 100, 10, 5, '{"analytics": "advanced", "export": "csv,pdf", "support": "priority"}'),
  ('Advanced', 'advanced', 99.99, 250, 25, 10, '{"analytics": "advanced", "export": "all", "support": "priority", "custom_branding": true}'),
  ('Elite', 'elite', 199.99, 500, 50, 25, '{"analytics": "advanced", "export": "all", "support": "dedicated", "custom_branding": true, "api_access": true}')
ON CONFLICT (slug) DO NOTHING;

-- RLS Policies para las nuevas tablas
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tasks
CREATE POLICY "Users can view tasks from own organization" ON public.tasks
  FOR SELECT USING (
    embassador_id IN (
      SELECT e.id FROM public.embassadors e
      INNER JOIN public.organizations o ON e.organization_id = o.id
      WHERE o.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks for own organization" ON public.tasks
  FOR INSERT WITH CHECK (
    embassador_id IN (
      SELECT e.id FROM public.embassadors e
      INNER JOIN public.organizations o ON e.organization_id = o.id
      WHERE o.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks from own organization" ON public.tasks
  FOR UPDATE USING (
    embassador_id IN (
      SELECT e.id FROM public.embassadors e
      INNER JOIN public.organizations o ON e.organization_id = o.id
      WHERE o.created_by = auth.uid()
    )
  );

-- Políticas similares para las demás tablas
CREATE POLICY "Users can view own organization task logs" ON public.task_logs
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      INNER JOIN public.embassadors e ON t.embassador_id = e.id
      INNER JOIN public.organizations o ON e.organization_id = o.id
      WHERE o.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view all plans" ON public.plans
  FOR SELECT USING (true);

CREATE POLICY "Users can view own organization leaderboards" ON public.leaderboards
  FOR SELECT USING (
    event_id IN (
      SELECT ev.id FROM public.events ev
      INNER JOIN public.organizations o ON ev.organization_id = o.id
      WHERE o.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view own organization notifications" ON public.notifications
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update own organization notifications" ON public.notifications
  FOR UPDATE USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view own import logs" ON public.import_logs
  FOR SELECT USING (user_id = auth.uid());

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_tasks_embassador_event ON public.tasks(embassador_id, event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_expiry ON public.tasks(status, expiry_time);
CREATE INDEX IF NOT EXISTS idx_task_logs_task_timestamp ON public.task_logs(task_id, timestamp_checked);
CREATE INDEX IF NOT EXISTS idx_leaderboards_event_rank ON public.leaderboards(event_id, rank);
CREATE INDEX IF NOT EXISTS idx_notifications_org_read ON public.notifications(organization_id, read_status);
