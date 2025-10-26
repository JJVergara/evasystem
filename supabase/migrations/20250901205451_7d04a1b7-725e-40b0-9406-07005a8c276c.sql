-- Fix prevent_user_privilege_escalation function search_path security warning  
CREATE OR REPLACE FUNCTION public.prevent_user_privilege_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;