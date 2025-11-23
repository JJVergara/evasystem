-- Create cron job to collect Story insights every 2 hours
-- This ensures we capture snapshots at key points in the 24h Story lifecycle
-- Snapshots will be taken approximately at: 1h, 4h, 8h, 12h, 20h, 23h after story creation

-- Unschedule existing job if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'collect-story-insights-every-2h') THEN
    PERFORM cron.unschedule('collect-story-insights-every-2h');
  END IF;
END$$;

-- Schedule new job to run every 2 hours
SELECT cron.schedule(
  'collect-story-insights-every-2h',
  '0 */2 * * *', -- Every 2 hours at minute 0 (e.g., 00:00, 02:00, 04:00, etc.)
  $$
  SELECT
    net.http_post(
      url    := 'https://awpfslcepylnipaolmvv.supabase.co/functions/v1/collect-story-insights',
      headers:= jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'x-cron-secret', current_setting('app.settings.cron_secret', true)
      ),
      body   := '{"source":"cron"}'::jsonb
    );
  $$
);

-- Add comment for documentation
COMMENT ON EXTENSION cron IS 'Includes job: collect-story-insights-every-2h - Collects Instagram Story insights every 2 hours for stories within their 24h lifecycle';

