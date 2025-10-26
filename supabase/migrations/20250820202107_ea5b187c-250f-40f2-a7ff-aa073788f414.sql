
-- 1) Column-level privilege hardening for sensitive tokens

-- Organizations: prevent clients from reading token columns, but allow service_role.
REVOKE SELECT (meta_token, token_expiry) ON TABLE public.organizations FROM anon, authenticated, PUBLIC;
GRANT SELECT (meta_token, token_expiry) ON TABLE public.organizations TO service_role;

-- Keep UPDATE on these columns for authenticated so users can disconnect (set to NULL) if your UI does that.
-- If you prefer to block client updates too, uncomment the next lines:
-- REVOKE UPDATE (meta_token, token_expiry) ON TABLE public.organizations FROM anon, authenticated, PUBLIC;
-- GRANT UPDATE (meta_token, token_expiry) ON TABLE public.organizations TO service_role;

-- Embassadors: block clients from reading and updating token columns; allow only service_role.
REVOKE SELECT (instagram_access_token, token_expires_at) ON TABLE public.embassadors FROM anon, authenticated, PUBLIC;
REVOKE UPDATE (instagram_access_token, token_expires_at) ON TABLE public.embassadors FROM anon, authenticated, PUBLIC;
GRANT SELECT (instagram_access_token, token_expires_at) ON TABLE public.embassadors TO service_role;
GRANT UPDATE (instagram_access_token, token_expires_at) ON TABLE public.embassadors TO service_role;

-- 2) Tighten UPDATE on organizations: require created_by to remain the same
DROP POLICY IF EXISTS "Users can update own organizations" ON public.organizations;

CREATE POLICY "Users can update own organizations"
ON public.organizations
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- 3) Prevent user-controlled role escalation in users via trigger

-- Create the trigger function (idempotent-guarded)
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow service_role to change roles (for admin flows/edge functions).
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Block role changes by regular clients.
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Changing role is not allowed';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.users'::regclass
      AND tgname = 'trg_prevent_role_change'
  ) THEN
    CREATE TRIGGER trg_prevent_role_change
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_role_change();
  END IF;
END$$;

  