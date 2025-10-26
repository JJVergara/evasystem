-- Phase 1: User Onboarding System & Phase 2: Multi-User Support

-- Create organization_members table for multi-user support
CREATE TABLE public.organization_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  invited_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'active',
  permissions jsonb DEFAULT '{"manage_ambassadors": true, "manage_events": true, "manage_instagram": false, "view_analytics": true}'::jsonb,
  UNIQUE(organization_id, user_id)
);

-- Enable RLS on organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Create policies for organization_members
CREATE POLICY "Users can view memberships for their organizations" 
ON public.organization_members 
FOR SELECT 
USING (
  organization_id IN (
    SELECT id FROM public.organizations WHERE created_by = auth.uid()
  ) OR user_id = auth.uid()
);

CREATE POLICY "Org owners can manage memberships" 
ON public.organization_members 
FOR ALL 
USING (
  organization_id IN (
    SELECT id FROM public.organizations WHERE created_by = auth.uid()
  )
);

-- Function to check if user is member of organization
CREATE OR REPLACE FUNCTION public.is_organization_member(user_auth_id uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = user_auth_id 
    AND om.organization_id = org_id 
    AND om.status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = org_id 
    AND o.created_by = user_auth_id
  );
$$;

-- Function to get user's accessible organizations
CREATE OR REPLACE FUNCTION public.get_user_organizations(user_auth_id uuid)
RETURNS TABLE(organization_id uuid, role text, is_owner boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Organizations owned by user
  SELECT o.id, 'owner'::text, true
  FROM public.organizations o
  WHERE o.created_by = user_auth_id
  
  UNION
  
  -- Organizations where user is member
  SELECT om.organization_id, om.role, false
  FROM public.organization_members om
  WHERE om.user_id = user_auth_id 
  AND om.status = 'active';
$$;

-- Trigger to automatically add owner as member when organization is created
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role, status, permissions)
  VALUES (
    NEW.id, 
    NEW.created_by, 
    'owner', 
    'active',
    '{"manage_ambassadors": true, "manage_events": true, "manage_instagram": true, "view_analytics": true, "manage_members": true}'::jsonb
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_organization_created
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();

-- Function to handle new user registration (creates user profile automatically)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create if user doesn't already exist in public.users
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = NEW.id) THEN
    INSERT INTO public.users (
      auth_user_id,
      email,
      name,
      role
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      'user'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Update RLS policies to use membership instead of created_by

-- Update embassadors policies
DROP POLICY IF EXISTS "Users can view own organization embassadors" ON public.embassadors;
DROP POLICY IF EXISTS "Users can create embassadors for own organization" ON public.embassadors;
DROP POLICY IF EXISTS "Users can update own organization embassadors" ON public.embassadors;

CREATE POLICY "Members can view organization embassadors" 
ON public.embassadors 
FOR SELECT 
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Members can create embassadors for organization" 
ON public.embassadors 
FOR INSERT 
WITH CHECK (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Members can update organization embassadors" 
ON public.embassadors 
FOR UPDATE 
USING (public.is_organization_member(auth.uid(), organization_id));

-- Update fiestas policies
DROP POLICY IF EXISTS "Users can view own organization fiestas" ON public.fiestas;
DROP POLICY IF EXISTS "Users can create fiestas for own organization" ON public.fiestas;
DROP POLICY IF EXISTS "Users can update own organization fiestas" ON public.fiestas;

CREATE POLICY "Members can view organization fiestas" 
ON public.fiestas 
FOR SELECT 
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Members can create fiestas for organization" 
ON public.fiestas 
FOR INSERT 
WITH CHECK (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Members can update organization fiestas" 
ON public.fiestas 
FOR UPDATE 
USING (public.is_organization_member(auth.uid(), organization_id));

-- Update events policies to use membership through fiestas
DROP POLICY IF EXISTS "Users can view events from own organization fiestas" ON public.events;
DROP POLICY IF EXISTS "Users can create events for own organization fiestas" ON public.events;
DROP POLICY IF EXISTS "Users can update events from own organization fiestas" ON public.events;

CREATE POLICY "Members can view organization events" 
ON public.events 
FOR SELECT 
USING (
  fiesta_id IN (
    SELECT f.id FROM public.fiestas f 
    WHERE public.is_organization_member(auth.uid(), f.organization_id)
  )
);

CREATE POLICY "Members can create events for organization" 
ON public.events 
FOR INSERT 
WITH CHECK (
  fiesta_id IN (
    SELECT f.id FROM public.fiestas f 
    WHERE public.is_organization_member(auth.uid(), f.organization_id)
  )
);

CREATE POLICY "Members can update organization events" 
ON public.events 
FOR UPDATE 
USING (
  fiesta_id IN (
    SELECT f.id FROM public.fiestas f 
    WHERE public.is_organization_member(auth.uid(), f.organization_id)
  )
);

-- Update social_mentions policies
DROP POLICY IF EXISTS "Users can view own organization social mentions" ON public.social_mentions;
DROP POLICY IF EXISTS "Users can update own organization social mentions" ON public.social_mentions;
DROP POLICY IF EXISTS "Users can delete own organization social mentions" ON public.social_mentions;

CREATE POLICY "Members can view organization social mentions" 
ON public.social_mentions 
FOR SELECT 
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Members can update organization social mentions" 
ON public.social_mentions 
FOR UPDATE 
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Members can delete organization social mentions" 
ON public.social_mentions 
FOR DELETE 
USING (public.is_organization_member(auth.uid(), organization_id));

-- Update notifications policies
DROP POLICY IF EXISTS "Users can view own organization notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own organization notifications" ON public.notifications;

CREATE POLICY "Members can view organization notifications" 
ON public.notifications 
FOR SELECT 
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Members can update organization notifications" 
ON public.notifications 
FOR UPDATE 
USING (public.is_organization_member(auth.uid(), organization_id));

-- Update ambassador_requests policies
DROP POLICY IF EXISTS "Users can view own organization ambassador requests" ON public.ambassador_requests;
DROP POLICY IF EXISTS "Users can update own organization ambassador requests" ON public.ambassador_requests;
DROP POLICY IF EXISTS "Users can delete own organization ambassador requests" ON public.ambassador_requests;

CREATE POLICY "Members can view organization ambassador requests" 
ON public.ambassador_requests 
FOR SELECT 
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Members can update organization ambassador requests" 
ON public.ambassador_requests 
FOR UPDATE 
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Members can delete organization ambassador requests" 
ON public.ambassador_requests 
FOR DELETE 
USING (public.is_organization_member(auth.uid(), organization_id));

-- Update organization_settings policies
DROP POLICY IF EXISTS "Users can view own organization settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Users can create settings for own organization" ON public.organization_settings;
DROP POLICY IF EXISTS "Users can update own organization settings" ON public.organization_settings;

CREATE POLICY "Members can view organization settings" 
ON public.organization_settings 
FOR SELECT 
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Members can create organization settings" 
ON public.organization_settings 
FOR INSERT 
WITH CHECK (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Members can update organization settings" 
ON public.organization_settings 
FOR UPDATE 
USING (public.is_organization_member(auth.uid(), organization_id));

-- Update tasks policies to use membership through embassadors
DROP POLICY IF EXISTS "Users can view tasks from own organization" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks for own organization" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks from own organization" ON public.tasks;

CREATE POLICY "Members can view organization tasks" 
ON public.tasks 
FOR SELECT 
USING (
  embassador_id IN (
    SELECT e.id FROM public.embassadors e 
    WHERE public.is_organization_member(auth.uid(), e.organization_id)
  )
);

CREATE POLICY "Members can create tasks for organization" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  embassador_id IN (
    SELECT e.id FROM public.embassadors e 
    WHERE public.is_organization_member(auth.uid(), e.organization_id)
  )
);

CREATE POLICY "Members can update organization tasks" 
ON public.tasks 
FOR UPDATE 
USING (
  embassador_id IN (
    SELECT e.id FROM public.embassadors e 
    WHERE public.is_organization_member(auth.uid(), e.organization_id)
  )
);

-- Update leaderboards policies
DROP POLICY IF EXISTS "Users can view own organization leaderboards" ON public.leaderboards;

CREATE POLICY "Members can view organization leaderboards" 
ON public.leaderboards 
FOR SELECT 
USING (
  event_id IN (
    SELECT e.id FROM public.events e
    JOIN public.fiestas f ON e.fiesta_id = f.id
    WHERE public.is_organization_member(auth.uid(), f.organization_id)
  )
);

-- Update task_logs policies
DROP POLICY IF EXISTS "Users can view own organization task logs" ON public.task_logs;

CREATE POLICY "Members can view organization task logs" 
ON public.task_logs 
FOR SELECT 
USING (
  task_id IN (
    SELECT t.id FROM public.tasks t
    JOIN public.embassadors e ON t.embassador_id = e.id
    WHERE public.is_organization_member(auth.uid(), e.organization_id)
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_status ON public.organization_members(status);