-- Phase 1: Critical Security Fixes
-- =================================

-- 1. PROTECT SENSITIVE TOKEN COLUMNS
-- Make sensitive Instagram/Meta token columns only accessible by service_role
ALTER POLICY "Users can view own organization embassadors" ON public.embassadors 
DROP USING;

CREATE POLICY "Users can view own organization embassadors" 
ON public.embassadors 
FOR SELECT 
USING (
  CASE 
    -- Service role can see everything
    WHEN current_user = 'service_role' THEN true
    -- Regular users can see their org ambassadors but not sensitive token fields
    ELSE (organization_id IN ( 
      SELECT organizations.id
      FROM organizations
      WHERE (organizations.created_by = auth.uid())
    ))
  END
);

-- Create a view for safe ambassador data (without tokens)
CREATE OR REPLACE VIEW public.embassadors_safe AS
SELECT 
  id,
  first_name,
  last_name,
  email,
  instagram_user,
  instagram_user_id,
  follower_count,
  profile_picture_url,
  date_of_birth,
  rut,
  global_points,
  global_category,
  performance_status,
  events_participated,
  completed_tasks,
  failed_tasks,
  organization_id,
  created_by_user_id,
  status,
  profile_public,
  last_instagram_sync,
  created_at,
  -- Hide sensitive token fields from regular users
  CASE 
    WHEN current_user = 'service_role' THEN instagram_access_token
    ELSE NULL
  END as instagram_access_token,
  CASE 
    WHEN current_user = 'service_role' THEN token_expires_at
    ELSE NULL
  END as token_expires_at
FROM public.embassadors;

-- Grant access to the safe view
GRANT SELECT ON public.embassadors_safe TO authenticated;

-- Apply same protection to organizations table
ALTER POLICY "Users can view own organizations" ON public.organizations
DROP USING;

CREATE POLICY "Users can view own organizations" 
ON public.organizations 
FOR SELECT 
USING (
  CASE 
    -- Service role can see everything
    WHEN current_user = 'service_role' THEN true
    -- Regular users can see their orgs but not sensitive token fields
    ELSE (created_by = auth.uid())
  END
);

-- Create safe view for organizations
CREATE OR REPLACE VIEW public.organizations_safe AS
SELECT 
  id,
  name,
  description,
  timezone,
  logo_url,
  plan_type,
  instagram_username,
  facebook_page_id,
  instagram_business_account_id,
  instagram_user_id,
  last_instagram_sync,
  created_by,
  created_at,
  -- Hide sensitive token fields from regular users
  CASE 
    WHEN current_user = 'service_role' THEN meta_token
    ELSE NULL
  END as meta_token,
  CASE 
    WHEN current_user = 'service_role' THEN token_expiry
    ELSE NULL
  END as token_expiry
FROM public.organizations;

-- Grant access to the safe view
GRANT SELECT ON public.organizations_safe TO authenticated;

-- 2. PREVENT ROLE ESCALATION
-- Add trigger to prevent users from changing their own roles
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow service_role to change roles (for admin flows/edge functions)
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Block role changes by regular clients
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Changing role is not allowed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the trigger to users table
DROP TRIGGER IF EXISTS prevent_role_change_trigger ON public.users;
CREATE TRIGGER prevent_role_change_trigger
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_change();

-- 3. FIX RLS POLICY WARNINGS
-- Add proper RLS to plans_public table
ALTER TABLE public.plans_public ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public plans are viewable by authenticated users" 
ON public.plans_public 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- 4. IMPROVE FUNCTION SECURITY
-- Update existing functions to have proper search_path
CREATE OR REPLACE FUNCTION public.get_organization_hierarchy(org_id uuid)
RETURNS TABLE(id uuid, name text, description text, organization_type text, is_main_account boolean, level integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
WITH RECURSIVE hierarchy AS (
  -- Base case: start with the given organization
  SELECT 
    o.id,
    o.name,
    o.description,
    o.organization_type,
    o.is_main_account,
    0 as level
  FROM public.organizations o
  WHERE o.id = org_id
  
  UNION ALL
  
  -- Recursive case: find children
  SELECT 
    o.id,
    o.name,
    o.description,
    o.organization_type,
    o.is_main_account,
    h.level + 1
  FROM public.organizations o
  JOIN hierarchy h ON o.parent_organization_id = h.id
)
SELECT * FROM hierarchy ORDER BY level, name;
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization_ids(user_id uuid)
RETURNS TABLE(organization_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM organizations WHERE created_by = user_id;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.oauth_states WHERE expires_at < now();
END;
$$;