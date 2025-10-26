-- Fix remaining function search path issues
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_states()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.oauth_states WHERE expires_at < now();
END;
$function$;

-- Create OAuth cleanup job (if pg_cron is available)
-- This will run every 15 minutes to clean up expired OAuth states
DO $$
BEGIN
  -- Try to create the cron job, but don't fail if pg_cron is not available
  BEGIN
    PERFORM cron.schedule(
      'cleanup-oauth-states',
      '*/15 * * * *', -- every 15 minutes
      'SELECT public.cleanup_expired_oauth_states();'
    );
    RAISE NOTICE 'OAuth cleanup cron job created successfully';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE NOTICE 'pg_cron extension not available, OAuth cleanup job not created';
    WHEN OTHERS THEN
      RAISE NOTICE 'Failed to create OAuth cleanup job: %', SQLERRM;
  END;
END;
$$;