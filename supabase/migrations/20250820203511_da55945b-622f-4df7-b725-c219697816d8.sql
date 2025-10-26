-- Final Security Fix: Add RLS to Safe Views
-- ==========================================

-- Enable RLS on safe views and add proper policies
ALTER VIEW public.embassadors_safe SET (security_barrier = true, check_option = cascaded);
ALTER VIEW public.organizations_safe SET (security_barrier = true, check_option = cascaded);

-- Drop the existing views and recreate them as proper security definer views with RLS
DROP VIEW IF EXISTS public.embassadors_safe;
DROP VIEW IF EXISTS public.organizations_safe;

-- Create secure function to get safe ambassador data
CREATE OR REPLACE FUNCTION public.get_safe_ambassador_data(user_organization_ids uuid[])
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  instagram_user text,
  instagram_user_id text,
  follower_count integer,
  profile_picture_url text,
  date_of_birth date,
  rut text,
  global_points integer,
  global_category text,
  performance_status text,
  events_participated integer,
  completed_tasks integer,
  failed_tasks integer,
  organization_id uuid,
  created_by_user_id uuid,
  status text,
  profile_public boolean,
  last_instagram_sync timestamp with time zone,
  created_at timestamp with time zone,
  instagram_access_token text,
  token_expires_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    e.id,
    e.first_name,
    e.last_name,
    e.email,
    e.instagram_user,
    e.instagram_user_id,
    e.follower_count,
    e.profile_picture_url,
    e.date_of_birth,
    e.rut,
    e.global_points,
    e.global_category,
    e.performance_status,
    e.events_participated,
    e.completed_tasks,
    e.failed_tasks,
    e.organization_id,
    e.created_by_user_id,
    e.status,
    e.profile_public,
    e.last_instagram_sync,
    e.created_at,
    -- Always hide sensitive token fields from regular users
    NULL::text as instagram_access_token,
    NULL::timestamp with time zone as token_expires_at
  FROM public.embassadors e
  WHERE e.organization_id = ANY(user_organization_ids);
$$;

-- Create secure function to get safe organization data
CREATE OR REPLACE FUNCTION public.get_safe_organization_data(user_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  timezone text,
  logo_url text,
  plan_type text,
  instagram_username text,
  facebook_page_id text,
  instagram_business_account_id text,
  instagram_user_id text,
  last_instagram_sync timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone,
  meta_token text,
  token_expiry timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    o.id,
    o.name,
    o.description,
    o.timezone,
    o.logo_url,
    o.plan_type,
    o.instagram_username,
    o.facebook_page_id,
    o.instagram_business_account_id,
    o.instagram_user_id,
    o.last_instagram_sync,
    o.created_by,
    o.created_at,
    -- Always hide sensitive token fields from regular users
    NULL::text as meta_token,
    NULL::timestamp with time zone as token_expiry
  FROM public.organizations o
  WHERE o.created_by = user_id;
$$;

-- Recreate views using the secure functions
CREATE OR REPLACE VIEW public.embassadors_safe AS
SELECT * FROM public.get_safe_ambassador_data(
  ARRAY(SELECT id FROM organizations WHERE created_by = auth.uid())
);

CREATE OR REPLACE VIEW public.organizations_safe AS
SELECT * FROM public.get_safe_organization_data(auth.uid());

-- Grant permissions to authenticated users
GRANT SELECT ON public.embassadors_safe TO authenticated;
GRANT SELECT ON public.organizations_safe TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_safe_ambassador_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_safe_organization_data TO authenticated;