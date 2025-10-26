-- Create secure token rotation logs table for audit trail
CREATE TABLE IF NOT EXISTS public.token_rotation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ambassador_id UUID REFERENCES public.embassadors(id) ON DELETE CASCADE,
  rotation_type TEXT NOT NULL CHECK (rotation_type IN ('automatic', 'manual', 'security_event')),
  old_token_hash TEXT, -- Store hash of old token for auditing
  new_token_hash TEXT, -- Store hash of new token for auditing
  reason TEXT,
  rotated_by UUID, -- User who initiated manual rotation
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on token rotation logs
ALTER TABLE public.token_rotation_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing token rotation logs
CREATE POLICY "Members can view organization token rotation logs" 
ON public.token_rotation_logs 
FOR SELECT 
USING (
  (organization_id IS NOT NULL AND is_organization_member(auth.uid(), organization_id))
  OR 
  (ambassador_id IS NOT NULL AND ambassador_id IN (
    SELECT e.id FROM embassadors e WHERE is_organization_member(auth.uid(), e.organization_id)
  ))
);

-- Create policy for service role to manage logs
CREATE POLICY "Service role can manage token rotation logs" 
ON public.token_rotation_logs 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Function to create secure hash of token for logging (without exposing the token)
CREATE OR REPLACE FUNCTION public.hash_token_for_audit(token_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create a SHA256 hash of the token for audit purposes
  -- Only first and last 4 characters of hash for identification
  RETURN substring(encode(digest(token_text, 'sha256'), 'hex'), 1, 8);
END;
$$;

-- Create automatic token rotation policy function
CREATE OR REPLACE FUNCTION public.schedule_token_rotation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create triggers for token expiry monitoring
DROP TRIGGER IF EXISTS organization_token_expiry_check ON organization_instagram_tokens;
CREATE TRIGGER organization_token_expiry_check
  AFTER UPDATE ON organization_instagram_tokens
  FOR EACH ROW
  EXECUTE FUNCTION schedule_token_rotation();

DROP TRIGGER IF EXISTS ambassador_token_expiry_check ON ambassador_tokens;  
CREATE TRIGGER ambassador_token_expiry_check
  AFTER UPDATE ON ambassador_tokens
  FOR EACH ROW
  EXECUTE FUNCTION schedule_token_rotation();