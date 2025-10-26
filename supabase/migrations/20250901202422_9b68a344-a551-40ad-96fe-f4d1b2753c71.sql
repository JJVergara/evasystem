-- Fix security warnings by setting search_path for functions

-- Update hash_token_for_audit function with proper search_path
CREATE OR REPLACE FUNCTION public.hash_token_for_audit(token_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create a SHA256 hash of the token for audit purposes
  -- Only first and last 4 characters of hash for identification
  RETURN substring(encode(digest(token_text, 'sha256'), 'hex'), 1, 8);
END;
$$;

-- Update schedule_token_rotation function with proper search_path
CREATE OR REPLACE FUNCTION public.schedule_token_rotation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if token is close to expiration (within 7 days)
  IF NEW.token_expiry IS NOT NULL AND NEW.token_expiry - NOW() < INTERVAL '7 days' THEN
    -- Insert notification for upcoming token expiration
    INSERT INTO public.notifications (
      organization_id,
      type,
      message,
      priority,
      target_type,
      target_id
    ) VALUES (
      COALESCE(NEW.organization_id, (SELECT organization_id FROM embassadors WHERE id = NEW.embassador_id)),
      'token_expiry_warning',
      'Token de Instagram expira pronto. Se recomienda renovar para mantener la funcionalidad.',
      'medium',
      CASE WHEN NEW.organization_id IS NOT NULL THEN 'organization' ELSE 'ambassador' END,
      COALESCE(NEW.organization_id, NEW.embassador_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;