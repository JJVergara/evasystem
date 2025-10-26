-- Create table for OAuth state management
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state TEXT NOT NULL UNIQUE,
  user_id UUID,
  organization_id UUID,
  type TEXT NOT NULL CHECK (type IN ('ambassador', 'organization')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Add Instagram fields to embassadors table
ALTER TABLE embassadors 
ADD COLUMN IF NOT EXISTS instagram_access_token TEXT,
ADD COLUMN IF NOT EXISTS instagram_user_id TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_instagram_sync TIMESTAMP WITH TIME ZONE;

-- Add Instagram sync field to organizations table  
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS last_instagram_sync TIMESTAMP WITH TIME ZONE;

-- Enable RLS on oauth_states
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- Create policy for oauth_states
CREATE POLICY "Users can manage own oauth states" 
ON oauth_states 
FOR ALL 
USING (user_id = auth.uid() OR user_id IN (
  SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()
));

-- Create index for oauth_states cleanup
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);

-- Create function to cleanup expired oauth states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_states WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;