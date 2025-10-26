-- Add conversation_id and inbox_link columns to social_mentions table
ALTER TABLE public.social_mentions 
ADD COLUMN conversation_id TEXT,
ADD COLUMN inbox_link TEXT;

-- Add index for conversation_id for better query performance
CREATE INDEX idx_social_mentions_conversation_id ON public.social_mentions(conversation_id);

-- Create CRON job to run the story-mentions-state-worker every hour for verification
-- and every 10 minutes for expiry checks
SELECT cron.schedule(
  'story-mentions-verification-worker',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://awpfslcepylnipaolmvv.supabase.co/functions/v1/story-mentions-state-worker',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
        body:='{"source": "cron", "type": "verification"}'::jsonb
    ) as request_id;
  $$
);

SELECT cron.schedule(
  'story-mentions-expiry-worker',
  '*/10 * * * *', -- Every 10 minutes
  $$
  SELECT
    net.http_post(
        url:='https://awpfslcepylnipaolmvv.supabase.co/functions/v1/story-mentions-state-worker',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
        body:='{"source": "cron", "type": "expiry"}'::jsonb
    ) as request_id;
  $$
);