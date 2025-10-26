
-- 1) Lock down RPCs that expose access tokens
REVOKE EXECUTE ON FUNCTION public.get_organization_token_info(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_ambassador_token_info(uuid) FROM PUBLIC, anon, authenticated;

-- Allow only service_role to execute these (Edge Functions).
GRANT EXECUTE ON FUNCTION public.get_organization_token_info(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_ambassador_token_info(uuid) TO service_role;

-- 2) Column-level privilege hardening for sensitive tokens
-- Organizations: block clients from reading token columns; allow only service_role.
REVOKE SELECT (meta_token, token_expiry) ON TABLE public.organizations FROM PUBLIC, anon, authenticated;
GRANT SELECT (meta_token, token_expiry) ON TABLE public.organizations TO service_role;

-- Embassadors: block clients from reading token columns; allow only service_role.
REVOKE SELECT (instagram_access_token, token_expires_at) ON TABLE public.embassadors FROM PUBLIC, anon, authenticated;
GRANT SELECT (instagram_access_token, token_expires_at) ON TABLE public.embassadors TO service_role;

-- If you want maximum hardening, also prevent client-side updates to these columns (optional):
-- REVOKE UPDATE (meta_token, token_expiry) ON TABLE public.organizations FROM PUBLIC, anon, authenticated;
-- GRANT UPDATE (meta_token, token_expiry) ON TABLE public.organizations TO service_role;
-- REVOKE UPDATE (instagram_access_token, token_expires_at) ON TABLE public.embassadors FROM PUBLIC, anon, authenticated;
-- GRANT UPDATE (instagram_access_token, token_expires_at) ON TABLE public.embassadors TO service_role;

-- 3) Remove direct SELECT on Meta App credentials to prevent leaking secrets
DROP POLICY IF EXISTS "Users can view own organization meta credentials" ON public.organization_meta_credentials;

-- Note: Keep existing policy "Service role can manage meta credentials".
-- Clients can still use the safe RPCs:
--  - get_org_meta_credentials_status (status only)
--  - upsert_org_meta_credentials (SECURITY DEFINER with ownership checks)
