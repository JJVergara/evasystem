-- CRITICAL SECURITY FIXES - Phase 1
-- Fix exposed sensitive data and privilege escalation vulnerabilities

-- 1. Drop insecure safe views that expose sensitive data
DROP VIEW IF EXISTS public.embassadors_safe CASCADE;
DROP VIEW IF EXISTS public.organizations_safe CASCADE;
DROP VIEW IF EXISTS public.plans_public CASCADE;

-- 2. Add trigger to prevent role escalation in users table
CREATE OR REPLACE FUNCTION public.prevent_user_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow service_role to manage all fields
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;
  
  -- For regular users, prevent role changes and organization_id manipulation
  IF TG_OP = 'INSERT' THEN
    -- Force new users to have 'user' role, not 'admin'
    NEW.role := 'user';
    -- Only allow setting organization_id if user owns it
    IF NEW.organization_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.organizations 
        WHERE id = NEW.organization_id AND created_by = auth.uid()
      ) THEN
        RAISE EXCEPTION 'Cannot assign to organization you do not own';
      END IF;
    END IF;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- Prevent role changes by regular users
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Role changes not allowed';
    END IF;
    -- Prevent organization_id changes
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'Organization changes not allowed';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS prevent_user_privilege_escalation_trigger ON public.users;
CREATE TRIGGER prevent_user_privilege_escalation_trigger
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_privilege_escalation();

-- 3. Update users table default role to 'user' instead of 'admin'
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'user';

-- 4. Add proper RLS policies for users table with stricter checks
DROP POLICY IF EXISTS "Users can create own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can create own profile" ON public.users
  FOR INSERT WITH CHECK (
    auth.uid() = auth_user_id AND
    role = 'user' AND
    (organization_id IS NULL OR organization_id IN (
      SELECT id FROM public.organizations WHERE created_by = auth.uid()
    ))
  );

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = auth_user_id)
  WITH CHECK (
    auth.uid() = auth_user_id AND
    role = OLD.role AND -- Prevent role changes
    organization_id = OLD.organization_id -- Prevent org changes
  );

-- 5. Create secure RPC functions to replace unsafe views
CREATE OR REPLACE FUNCTION public.get_organization_safe_info(org_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  timezone text,
  logo_url text,
  plan_type text,
  instagram_username text,
  instagram_connected boolean,
  last_instagram_sync timestamp with time zone,
  created_at timestamp with time zone
) LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT 
    o.id,
    o.name,
    o.description,
    o.timezone,
    o.logo_url,
    o.plan_type,
    o.instagram_username,
    (o.meta_token IS NOT NULL) as instagram_connected,
    o.last_instagram_sync,
    o.created_at
  FROM public.organizations o
  WHERE (org_id IS NULL OR o.id = org_id)
    AND o.created_by = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_ambassador_safe_info(org_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  email text,
  instagram_user text,
  follower_count integer,
  profile_picture_url text,
  global_points integer,
  global_category text,
  performance_status text,
  events_participated integer,
  completed_tasks integer,
  failed_tasks integer,
  organization_id uuid,
  status text,
  profile_public boolean,
  last_instagram_sync timestamp with time zone,
  created_at timestamp with time zone
) LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT 
    e.id,
    e.first_name,
    e.last_name,
    e.email,
    e.instagram_user,
    e.follower_count,
    e.profile_picture_url,
    e.global_points,
    e.global_category,
    e.performance_status,
    e.events_participated,
    e.completed_tasks,
    e.failed_tasks,
    e.organization_id,
    e.status,
    e.profile_public,
    e.last_instagram_sync,
    e.created_at
  FROM public.embassadors e
  WHERE (org_id IS NULL OR e.organization_id = org_id)
    AND e.organization_id IN (
      SELECT id FROM public.organizations WHERE created_by = auth.uid()
    );
$$;

-- 6. Fix existing SECURITY DEFINER functions to have proper search_path
CREATE OR REPLACE FUNCTION public.get_safe_organization_data(user_id uuid)
RETURNS TABLE(
  id uuid, name text, description text, timezone text, logo_url text, plan_type text, 
  instagram_username text, facebook_page_id text, instagram_business_account_id text, 
  instagram_user_id text, last_instagram_sync timestamp with time zone, 
  created_by uuid, created_at timestamp with time zone, 
  meta_token text, token_expiry timestamp with time zone
)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT 
    o.id, o.name, o.description, o.timezone, o.logo_url, o.plan_type,
    o.instagram_username, o.facebook_page_id, o.instagram_business_account_id,
    o.instagram_user_id, o.last_instagram_sync, o.created_by, o.created_at,
    -- Always hide sensitive token fields from regular users
    NULL::text as meta_token,
    NULL::timestamp with time zone as token_expiry
  FROM public.organizations o
  WHERE o.created_by = user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_safe_ambassador_data(user_organization_ids uuid[])
RETURNS TABLE(
  id uuid, first_name text, last_name text, email text, instagram_user text, 
  instagram_user_id text, follower_count integer, profile_picture_url text, 
  date_of_birth date, rut text, global_points integer, global_category text, 
  performance_status text, events_participated integer, completed_tasks integer, 
  failed_tasks integer, organization_id uuid, created_by_user_id uuid, 
  status text, profile_public boolean, last_instagram_sync timestamp with time zone, 
  created_at timestamp with time zone, instagram_access_token text, token_expires_at timestamp with time zone
)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT 
    e.id, e.first_name, e.last_name, e.email, e.instagram_user, e.instagram_user_id,
    e.follower_count, e.profile_picture_url, e.date_of_birth, e.rut, e.global_points,
    e.global_category, e.performance_status, e.events_participated, e.completed_tasks,
    e.failed_tasks, e.organization_id, e.created_by_user_id, e.status, e.profile_public,
    e.last_instagram_sync, e.created_at,
    -- Always hide sensitive token fields from regular users
    NULL::text as instagram_access_token,
    NULL::timestamp with time zone as token_expires_at
  FROM public.embassadors e
  WHERE e.organization_id = ANY(user_organization_ids);
$$;

-- Update other functions to have proper search_path
CREATE OR REPLACE FUNCTION public.get_organization_hierarchy(org_id uuid)
RETURNS TABLE(id uuid, name text, description text, organization_type text, is_main_account boolean, level integer)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
WITH RECURSIVE hierarchy AS (
  SELECT 
    o.id, o.name, o.description, o.organization_type, o.is_main_account, 0 as level
  FROM public.organizations o
  WHERE o.id = org_id
  
  UNION ALL
  
  SELECT 
    o.id, o.name, o.description, o.organization_type, o.is_main_account, h.level + 1
  FROM public.organizations o
  JOIN hierarchy h ON o.parent_organization_id = h.id
)
SELECT * FROM hierarchy ORDER BY level, name;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_states()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  DELETE FROM public.oauth_states WHERE expires_at < now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization_ids(user_id uuid)
RETURNS TABLE(organization_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT id FROM organizations WHERE created_by = user_id;
$$;

CREATE OR REPLACE FUNCTION public.update_organization_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;