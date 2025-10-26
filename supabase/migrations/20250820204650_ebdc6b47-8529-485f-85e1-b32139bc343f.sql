-- CRITICAL SECURITY FIXES - Phase 1A
-- Fix exposed sensitive data and privilege escalation vulnerabilities

-- 1. Drop insecure safe views that expose sensitive data
DROP VIEW IF EXISTS public.embassadors_safe CASCADE;
DROP VIEW IF EXISTS public.organizations_safe CASCADE;
DROP VIEW IF EXISTS public.plans_public CASCADE;

-- 2. Update users table default role to 'user' instead of 'admin'
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'user';

-- 3. Add trigger to prevent role escalation in users table
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