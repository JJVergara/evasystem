-- Fix linter ERROR 0010_security_definer_view by enabling security invoker on the affected view
-- This ensures the view enforces the caller's RLS policies instead of the view owner

-- Safeguard: only apply if the view exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'plans_public'
  ) THEN
    EXECUTE 'ALTER VIEW public.plans_public SET (security_invoker = true)';
    COMMENT ON VIEW public.plans_public IS 'Security invoker enabled to enforce caller RLS (per Supabase linter 0010).';
  END IF;
END$$;
