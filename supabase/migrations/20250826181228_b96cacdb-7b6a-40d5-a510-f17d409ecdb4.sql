-- Fix Critical Security Issues

-- 1. Fix organization_settings RLS policy bug (cross-tenant write vulnerability)
DROP POLICY IF EXISTS "Owners or permitted members can create organization settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Owners or permitted members can update organization settings" ON public.organization_settings;

CREATE POLICY "Owners or permitted members can create organization settings" 
ON public.organization_settings 
FOR INSERT 
WITH CHECK (
  -- Organization owner can create settings
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = organization_settings.organization_id 
    AND o.created_by = auth.uid()
  ) OR
  -- OR member with manage_instagram permission
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_settings.organization_id 
    AND om.user_id = auth.uid() 
    AND om.status = 'active'
    AND COALESCE((om.permissions->>'manage_instagram')::boolean, false) = true
  )
);

CREATE POLICY "Owners or permitted members can update organization settings" 
ON public.organization_settings 
FOR UPDATE 
USING (
  -- Organization owner can update settings
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = organization_settings.organization_id 
    AND o.created_by = auth.uid()
  ) OR
  -- OR member with manage_instagram permission
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_settings.organization_id 
    AND om.user_id = auth.uid() 
    AND om.status = 'active'
    AND COALESCE((om.permissions->>'manage_instagram')::boolean, false) = true
  )
)
WITH CHECK (
  -- Organization owner can update settings
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = organization_settings.organization_id 
    AND o.created_by = auth.uid()
  ) OR
  -- OR member with manage_instagram permission
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_settings.organization_id 
    AND om.user_id = auth.uid() 
    AND om.status = 'active'
    AND COALESCE((om.permissions->>'manage_instagram')::boolean, false) = true
  )
);

-- 2. Add missing privilege escalation protection for users table
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add the missing trigger
DROP TRIGGER IF EXISTS prevent_user_privilege_escalation ON public.users;
CREATE TRIGGER prevent_user_privilege_escalation
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_privilege_escalation();

-- 3. Secure sensitive token RPCs - revoke from clients, allow only service_role
REVOKE EXECUTE ON FUNCTION public.get_organization_token_info(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_token_info(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_ambassador_token_info(uuid) FROM anon, authenticated;  
GRANT EXECUTE ON FUNCTION public.get_ambassador_token_info(uuid) TO service_role;

-- 4. Hide sensitive token columns from clients
-- Remove SELECT privileges on sensitive columns
REVOKE SELECT (meta_token, token_expiry) ON public.organizations FROM anon, authenticated;
REVOKE SELECT (instagram_access_token, token_expires_at) ON public.embassadors FROM anon, authenticated;

-- Grant SELECT on all other columns explicitly
GRANT SELECT (id, name, description, timezone, logo_url, plan_type, instagram_username, facebook_page_id, instagram_business_account_id, instagram_user_id, last_instagram_sync, created_by, created_at) ON public.organizations TO anon, authenticated;

GRANT SELECT (id, first_name, last_name, email, instagram_user, instagram_user_id, follower_count, profile_picture_url, date_of_birth, rut, global_points, global_category, performance_status, events_participated, completed_tasks, failed_tasks, organization_id, created_by_user_id, status, profile_public, last_instagram_sync, created_at) ON public.embassadors TO anon, authenticated;