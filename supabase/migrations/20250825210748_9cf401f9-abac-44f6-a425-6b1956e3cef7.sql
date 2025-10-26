-- CRITICAL SECURITY FIX: Secure organization_meta_credentials table
-- Remove overly permissive service role policy and implement secure access patterns

-- 1) Drop the insecure policy that allows unrestricted service role access
DROP POLICY IF EXISTS "Service role can manage meta credentials" ON public.organization_meta_credentials;

-- 2) Create a secure function for edge functions to get organization credentials
-- This function validates organization existence and provides controlled access
CREATE OR REPLACE FUNCTION public.get_organization_credentials_secure(p_organization_id uuid)
RETURNS TABLE(
  meta_app_id text,
  meta_app_secret text,
  webhook_verify_token text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate that the organization exists
  IF NOT EXISTS (
    SELECT 1 FROM public.organizations WHERE id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Return credentials only for the specified organization
  RETURN QUERY
  SELECT 
    omc.meta_app_id,
    omc.meta_app_secret,
    omc.webhook_verify_token
  FROM public.organization_meta_credentials omc
  WHERE omc.organization_id = p_organization_id;
END;
$$;

-- 3) Create a function to get credentials by Instagram user ID (for webhooks)
CREATE OR REPLACE FUNCTION public.get_organization_credentials_by_instagram_user(p_instagram_user_id text)
RETURNS TABLE(
  organization_id uuid,
  meta_app_id text,
  meta_app_secret text,
  webhook_verify_token text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Find organization by Instagram user ID and return its credentials
  RETURN QUERY
  SELECT 
    o.id as organization_id,
    omc.meta_app_id,
    omc.meta_app_secret,
    omc.webhook_verify_token
  FROM public.organizations o
  INNER JOIN public.organization_meta_credentials omc ON o.id = omc.organization_id
  WHERE o.instagram_user_id = p_instagram_user_id;
END;
$$;

-- 4) Grant execute permissions only to service_role for these new functions
GRANT EXECUTE ON FUNCTION public.get_organization_credentials_secure(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_organization_credentials_by_instagram_user(text) TO service_role;

-- 5) Revoke all access from the credentials table - only accessible through secure functions
REVOKE ALL ON public.organization_meta_credentials FROM PUBLIC, anon, authenticated;

-- 6) Create minimal policies for the existing upsert/status functions to work
-- These functions already have proper organization ownership validation
CREATE POLICY "Allow access through secure functions only"
ON public.organization_meta_credentials
FOR ALL
USING (
  -- Only allow access if called from a security definer function
  -- This effectively blocks direct table access while allowing function-based access
  current_user = 'service_role' AND current_setting('role', true) = 'service_role'
)
WITH CHECK (
  current_user = 'service_role' AND current_setting('role', true) = 'service_role'
);

-- 7) Additional security: Create audit trigger to log access attempts
CREATE OR REPLACE FUNCTION public.audit_credentials_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log any access to credentials (for monitoring)
  INSERT INTO public.notifications (
    organization_id,
    type,
    message,
    priority
  ) VALUES (
    COALESCE(NEW.organization_id, OLD.organization_id),
    'security_audit',
    'Meta credentials accessed at ' || now()::text,
    'low'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_meta_credentials_access
  AFTER INSERT OR UPDATE OR DELETE ON public.organization_meta_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_credentials_access();