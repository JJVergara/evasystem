-- Phase 1: Critical Security Fixes (Corrected)
-- ===============================================

-- 1. PROTECT SENSITIVE TOKEN COLUMNS
-- Fix ambassadors policy for safe access
DROP POLICY IF EXISTS "Users can view own organization embassadors" ON public.embassadors;

CREATE POLICY "Users can view own organization embassadors" 
ON public.embassadors 
FOR SELECT 
USING (organization_id IN ( 
  SELECT organizations.id
  FROM organizations
  WHERE (organizations.created_by = auth.uid())
));

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
  -- Always hide sensitive token fields from regular users
  NULL as instagram_access_token,
  NULL as token_expires_at
FROM public.embassadors;

-- Grant access to the safe view
GRANT SELECT ON public.embassadors_safe TO authenticated;

-- Fix organizations policy for safe access
DROP POLICY IF EXISTS "Users can view own organizations" ON public.organizations;

CREATE POLICY "Users can view own organizations" 
ON public.organizations 
FOR SELECT 
USING (created_by = auth.uid());

-- Create safe view for organizations (hide sensitive tokens)
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
  -- Always hide sensitive token fields from regular users
  NULL as meta_token,
  NULL as token_expiry
FROM public.organizations;

-- Grant access to the safe view
GRANT SELECT ON public.organizations_safe TO authenticated;

-- 2. PREVENT ROLE ESCALATION
-- Ensure the trigger is applied (function already exists)
DROP TRIGGER IF EXISTS prevent_role_change_trigger ON public.users;
CREATE TRIGGER prevent_role_change_trigger
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_change();