-- Update the RPC function to be more robust and handle permissions properly
CREATE OR REPLACE FUNCTION public.get_org_meta_credentials_status(p_organization_id uuid)
 RETURNS TABLE(has_credentials boolean, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Check if user has access to organization (either owner or member)
  if not (
    exists (
      select 1
      from public.organizations o
      where o.id = p_organization_id
        and o.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.organization_members om
      where om.organization_id = p_organization_id
        and om.user_id = auth.uid()
        and om.status = 'active'
    )
  ) then
    -- Return false instead of throwing error for better UX
    return query
    select false as has_credentials, null::timestamp with time zone as updated_at;
    return;
  end if;

  -- Return credentials status
  return query
  select
    exists(select 1 from public.organization_meta_credentials omc where omc.organization_id = p_organization_id) as has_credentials,
    (select omc2.updated_at from public.organization_meta_credentials omc2 where omc2.organization_id = p_organization_id limit 1) as updated_at;
end;
$function$;