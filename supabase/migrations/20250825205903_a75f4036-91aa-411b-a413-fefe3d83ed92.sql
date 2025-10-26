
-- 1) Restrict access to SECURITY DEFINER functions that can be abused

-- Revoke public access to "safe" functions that accept caller-supplied IDs
REVOKE EXECUTE ON FUNCTION public.get_safe_organization_data(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_safe_ambassador_data(uuid[]) FROM PUBLIC, anon, authenticated;

-- Ensure token info functions are only callable by service_role
REVOKE EXECUTE ON FUNCTION public.get_organization_token_info(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_ambassador_token_info(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_token_info(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_ambassador_token_info(uuid) TO service_role;

-- 2) Enforce role/org integrity on public.users using the existing function
-- Note: prevent_user_privilege_escalation() is already defined in your DB.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_prevent_privilege_escalation'
  ) THEN
    CREATE TRIGGER trg_users_prevent_privilege_escalation
    BEFORE INSERT OR UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_user_privilege_escalation();
  END IF;
END
$$;

-- 3) Tighten RLS for organization_settings UPDATE (and INSERT)

-- Remove broad update policy
DROP POLICY IF EXISTS "Members can update organization settings" ON public.organization_settings;

-- Create stricter UPDATE policy:
-- Owners OR members with explicit permission manage_instagram = true
CREATE POLICY "Owners or permitted members can update organization settings"
ON public.organization_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = organization_id
      AND o.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = organization_id
      AND om.user_id = auth.uid()
      AND COALESCE((om.permissions->>'manage_instagram')::boolean, false) = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = organization_id
      AND o.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = organization_id
      AND om.user_id = auth.uid()
      AND COALESCE((om.permissions->>'manage_instagram')::boolean, false) = true
  )
);

-- Optional but recommended: apply the same restriction for INSERT
DROP POLICY IF EXISTS "Members can create organization settings" ON public.organization_settings;

CREATE POLICY "Owners or permitted members can create organization settings"
ON public.organization_settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = organization_id
      AND o.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = organization_id
      AND om.user_id = auth.uid()
      AND COALESCE((om.permissions->>'manage_instagram')::boolean, false) = true
  )
);
