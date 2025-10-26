-- Create oauth_states table for managing OAuth flow security
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state TEXT NOT NULL UNIQUE,
  user_id UUID,
  organization_id UUID,
  type TEXT NOT NULL CHECK (type IN ('ambassador', 'organization')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable RLS
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own OAuth states
CREATE POLICY "Users can manage own oauth states" 
ON public.oauth_states 
FOR ALL 
USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON public.oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON public.oauth_states(expires_at);