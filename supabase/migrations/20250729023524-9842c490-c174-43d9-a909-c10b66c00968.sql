-- Create custom types
CREATE TYPE public.user_role AS ENUM ('admin', 'rrpp');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive');
CREATE TYPE public.embassador_category AS ENUM ('bronze', 'silver', 'gold', 'diamond');
CREATE TYPE public.embassador_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.task_status AS ENUM ('uploaded', 'invalid', 'completed', 'in_progress');
CREATE TYPE public.notification_type AS ENUM ('story_deleted', 'task_expired', 'token_expiry');
CREATE TYPE public.invitation_status AS ENUM ('active', 'expired', 'used');

-- Create organizations table
CREATE TABLE public.organizations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    main_instagram_account TEXT,
    instagram_token TEXT,
    token_expiry TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create users table (Staff y RRPP)
CREATE TABLE public.users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role public.user_role NOT NULL DEFAULT 'rrpp',
    status public.user_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create embassadors table
CREATE TABLE public.embassadors (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    rut TEXT NOT NULL,
    email TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    instagram_user TEXT NOT NULL,
    follower_count INTEGER DEFAULT 0,
    profile_public BOOLEAN DEFAULT true,
    global_points INTEGER DEFAULT 0,
    global_category public.embassador_category DEFAULT 'bronze',
    status public.embassador_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(organization_id, email),
    UNIQUE(organization_id, rut)
);

-- Create events table
CREATE TABLE public.events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    instagram_account TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    embassador_id UUID REFERENCES public.embassadors(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    instagram_story_id TEXT,
    story_url TEXT,
    status public.task_status DEFAULT 'uploaded',
    upload_time TIMESTAMP WITH TIME ZONE,
    expiry_time TIMESTAMP WITH TIME ZONE,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    type public.notification_type NOT NULL,
    read_status BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invitation_tokens table
CREATE TABLE public.invitation_tokens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expiry TIMESTAMP WITH TIME ZONE NOT NULL,
    status public.invitation_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embassadors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organizations
CREATE POLICY "Users can view their organization" ON public.organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can create organizations" ON public.organizations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update their organization" ON public.organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id FROM public.users 
            WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

-- Create RLS policies for users
CREATE POLICY "Users can view org users" ON public.users
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage users" ON public.users
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

-- Create RLS policies for embassadors
CREATE POLICY "Users can view org embassadors" ON public.embassadors
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage embassadors" ON public.embassadors
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Create RLS policies for events
CREATE POLICY "Users can view org events" ON public.events
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage events" ON public.events
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Create RLS policies for tasks
CREATE POLICY "Users can view org tasks" ON public.tasks
    FOR SELECT USING (
        embassador_id IN (
            SELECT e.id FROM public.embassadors e
            JOIN public.users u ON e.organization_id = u.organization_id
            WHERE u.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage tasks" ON public.tasks
    FOR ALL USING (
        embassador_id IN (
            SELECT e.id FROM public.embassadors e
            JOIN public.users u ON e.organization_id = u.organization_id
            WHERE u.auth_user_id = auth.uid()
        )
    );

-- Create RLS policies for notifications
CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- Create RLS policies for invitation_tokens
CREATE POLICY "Admins can manage invitations" ON public.invitation_tokens
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX idx_users_organization_id ON public.users(organization_id);
CREATE INDEX idx_embassadors_organization_id ON public.embassadors(organization_id);
CREATE INDEX idx_events_organization_id ON public.events(organization_id);
CREATE INDEX idx_tasks_embassador_id ON public.tasks(embassador_id);
CREATE INDEX idx_tasks_event_id ON public.tasks(event_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_organization_id ON public.notifications(organization_id);