-- Add columns for story mention verification tracking
ALTER TABLE public.social_mentions 
ADD COLUMN IF NOT EXISTS checks_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_check_at timestamp with time zone;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_social_mentions_org_type_state 
ON public.social_mentions (organization_id, mention_type, state);

CREATE INDEX IF NOT EXISTS idx_social_mentions_org_type_mentioned_at 
ON public.social_mentions (organization_id, mention_type, mentioned_at DESC);

-- Create index for story verification queries
CREATE INDEX IF NOT EXISTS idx_social_mentions_verification 
ON public.social_mentions (mention_type, state, checks_count, mentioned_at)
WHERE mention_type = 'story_referral';

-- Schedule story mentions verification job to run every hour
SELECT cron.schedule(
  'verify-story-mentions',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://awpfslcepylnipaolmvv.supabase.co/functions/v1/story-mentions-state-worker',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3cGZzbGNlcHlsbmlwYW9sbXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NTUzOTUsImV4cCI6MjA2OTMzMTM5NX0.KyXrezLFMXhsOr3zyrNm1nb1T3w6C6R3WdJZ2w21oOY", "X-Cron-Secret": "' || current_setting('app.settings.cron_secret', true) || '"}'::jsonb,
        body:='{"source": "cron", "type": "verification"}'::jsonb
    ) as request_id;
  $$
);

-- Add settings for story mentions feature in organization_settings
UPDATE public.organization_settings 
SET instagram_settings = instagram_settings || '{"story_mentions_enabled": true, "story_verification_intervals": [60, 720, 1380]}'::jsonb
WHERE instagram_settings IS NOT NULL;

-- Insert default settings for organizations without settings
INSERT INTO public.organization_settings (organization_id, instagram_settings)
SELECT o.id, '{"auto_sync": true, "sync_interval": "hourly", "auto_validate_tasks": false, "story_validation_24h": true, "story_mentions_enabled": true, "story_verification_intervals": [60, 720, 1380]}'::jsonb
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_settings os WHERE os.organization_id = o.id
);