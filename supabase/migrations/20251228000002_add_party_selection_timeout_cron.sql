-- Create cron job to check for party selection timeouts every 30 minutes
-- Marks mentions as 'timeout' if no response received within 4 hours

-- Unschedule existing job if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'party-selection-timeout-check') THEN
    PERFORM cron.unschedule('party-selection-timeout-check');
  END IF;
END$$;

-- Schedule job to run every 30 minutes
SELECT cron.schedule(
  'party-selection-timeout-check',
  '*/30 * * * *', -- Every 30 minutes
  $$
  SELECT
    net.http_post(
      url    := 'https://awpfslcepylnipaolmvv.supabase.co/functions/v1/party-selection-timeout-worker',
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
COMMENT ON EXTENSION cron IS 'Includes job: party-selection-timeout-check - Checks for party selection timeouts every 30 minutes (4 hour timeout)';
