-- Add new fields to embassadors table
ALTER TABLE public.embassadors 
ADD COLUMN performance_status performance_status DEFAULT 'cumple'::performance_status,
ADD COLUMN profile_picture_url TEXT,
ADD COLUMN created_by_user_id UUID,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN events_participated INTEGER DEFAULT 0,
ADD COLUMN completed_tasks INTEGER DEFAULT 0,
ADD COLUMN failed_tasks INTEGER DEFAULT 0,
ADD COLUMN approved_by UUID;

-- Create performance_status enum
CREATE TYPE performance_status AS ENUM ('no_cumple', 'cumple', 'advertencia', 'exclusivo');

-- Add new fields to events table
ALTER TABLE public.events 
ADD COLUMN is_cyclic BOOLEAN DEFAULT false,
ADD COLUMN cyclic_type cyclic_type,
ADD COLUMN main_hashtag TEXT,
ADD COLUMN active BOOLEAN DEFAULT true,
ADD COLUMN stats_json JSONB DEFAULT '{}';

-- Create cyclic_type enum
CREATE TYPE cyclic_type AS ENUM ('semanal', 'mensual', 'personalizado');

-- Add new fields to tasks table
ALTER TABLE public.tasks
ADD COLUMN task_type task_type DEFAULT 'story'::task_type,
ADD COLUMN reposted_from_story_id TEXT,
ADD COLUMN time_in_air INTEGER DEFAULT 0,
ADD COLUMN last_status_update TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create task_type enum
CREATE TYPE task_type AS ENUM ('story', 'repost');

-- Add new fields to notifications table
ALTER TABLE public.notifications
ADD COLUMN target_type target_type DEFAULT 'user'::target_type,
ADD COLUMN target_id UUID,
ADD COLUMN priority notification_priority DEFAULT 'normal'::notification_priority;

-- Create target_type enum
CREATE TYPE target_type AS ENUM ('user', 'rrpp', 'admin');

-- Create notification_priority enum
CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high');

-- Add settings_json to organizations table
ALTER TABLE public.organizations
ADD COLUMN settings_json JSONB DEFAULT '{"scoring_rules": {"story_uploaded": 1, "story_completed": 2, "story_invalid": -1}, "categories": {"bronze": 0, "silver": 50, "gold": 150, "diamond": 300}}';

-- Create leaderboards table
CREATE TABLE public.leaderboards (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    embassador_id UUID REFERENCES public.embassadors(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    rank INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(event_id, embassador_id)
);

-- Create import_logs table
CREATE TABLE public.import_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    type import_export_type NOT NULL,
    source import_source NOT NULL,
    file_name TEXT,
    result_json JSONB DEFAULT '{}',
    status import_status DEFAULT 'pending'::import_status,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create import_export_type enum
CREATE TYPE import_export_type AS ENUM ('import', 'export');

-- Create import_source enum
CREATE TYPE import_source AS ENUM ('manual', 'google_drive', 'excel', 'csv');

-- Create import_status enum
CREATE TYPE import_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create embassador_events junction table
CREATE TABLE public.embassador_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    embassador_id UUID REFERENCES public.embassadors(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    UNIQUE(embassador_id, event_id)
);

-- Create event_instagram_accounts table
CREATE TABLE public.event_instagram_accounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    instagram_account TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_organization_roles table
CREATE TABLE public.user_organization_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, organization_id)
);

-- Enable RLS on new tables
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embassador_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_instagram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organization_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leaderboards
CREATE POLICY "Users can view org leaderboards" 
ON public.leaderboards 
FOR SELECT 
USING (event_id IN (
    SELECT e.id FROM events e 
    JOIN users u ON e.organization_id = u.organization_id 
    WHERE u.auth_user_id = auth.uid()
));

CREATE POLICY "Users can manage leaderboards" 
ON public.leaderboards 
FOR ALL 
USING (event_id IN (
    SELECT e.id FROM events e 
    JOIN users u ON e.organization_id = u.organization_id 
    WHERE u.auth_user_id = auth.uid()
));

-- RLS Policies for import_logs
CREATE POLICY "Users can view org import logs" 
ON public.import_logs 
FOR SELECT 
USING (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Users can create import logs" 
ON public.import_logs 
FOR INSERT 
WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
));

-- RLS Policies for embassador_events
CREATE POLICY "Users can view org embassador events" 
ON public.embassador_events 
FOR SELECT 
USING (event_id IN (
    SELECT e.id FROM events e 
    JOIN users u ON e.organization_id = u.organization_id 
    WHERE u.auth_user_id = auth.uid()
));

CREATE POLICY "Users can manage embassador events" 
ON public.embassador_events 
FOR ALL 
USING (event_id IN (
    SELECT e.id FROM events e 
    JOIN users u ON e.organization_id = u.organization_id 
    WHERE u.auth_user_id = auth.uid()
));

-- RLS Policies for event_instagram_accounts
CREATE POLICY "Users can view org event instagram accounts" 
ON public.event_instagram_accounts 
FOR SELECT 
USING (event_id IN (
    SELECT e.id FROM events e 
    JOIN users u ON e.organization_id = u.organization_id 
    WHERE u.auth_user_id = auth.uid()
));

CREATE POLICY "Users can manage event instagram accounts" 
ON public.event_instagram_accounts 
FOR ALL 
USING (event_id IN (
    SELECT e.id FROM events e 
    JOIN users u ON e.organization_id = u.organization_id 
    WHERE u.auth_user_id = auth.uid()
));

-- RLS Policies for user_organization_roles
CREATE POLICY "Users can view their org roles" 
ON public.user_organization_roles 
FOR SELECT 
USING (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Admins can manage org roles" 
ON public.user_organization_roles 
FOR ALL 
USING (organization_id IN (
    SELECT organization_id FROM users 
    WHERE auth_user_id = auth.uid() AND role = 'admin'
));

-- Create triggers for updated_at columns
CREATE TRIGGER update_embassadors_updated_at
    BEFORE UPDATE ON public.embassadors
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leaderboards_updated_at
    BEFORE UPDATE ON public.leaderboards
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_last_status_update
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();