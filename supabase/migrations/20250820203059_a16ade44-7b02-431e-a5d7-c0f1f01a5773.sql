-- Phase 1: Critical Security Fixes
-- =================================

-- 1. PROTECT SENSITIVE TOKEN COLUMNS
-- Fix ambassadors policy - drop and recreate with proper protection
DROP POLICY IF EXISTS "Users can view own organization embassadors" ON public.embassadors;

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

-- Fix organizations policy - drop and recreate with proper protection
DROP POLICY IF EXISTS "Users can view own organizations" ON public.organizations;

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
-- The function already exists, just ensure the trigger is applied
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