-- Fix audit_credentials_access function search_path security warning
CREATE OR REPLACE FUNCTION public.audit_credentials_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;