-- Add redirect_base column to oauth_states table to support dynamic OAuth redirect URLs
ALTER TABLE oauth_states 
ADD COLUMN redirect_base text;