
-- 1) Permitir que cualquier miembro consulte el estado de credenciales
create or replace function public.get_org_meta_credentials_status(
  p_organization_id uuid
)
returns table(
  has_credentials boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Permitir a cualquier miembro (o dueño) consultar el estado
  if not public.is_organization_member(auth.uid(), p_organization_id) then
    raise exception 'No autorizado para ver el estado de credenciales de esta organización';
  end if;

  return query
  select
    exists(select 1 from public.organization_meta_credentials omc where omc.organization_id = p_organization_id) as has_credentials,
    (select omc2.updated_at from public.organization_meta_credentials omc2 where omc2.organization_id = p_organization_id limit 1) as updated_at;
end;
$$;

-- 2) Permitir que el dueño o un miembro con manage_instagram guarde/actualice credenciales
create or replace function public.upsert_org_meta_credentials(
  p_organization_id uuid,
  p_meta_app_id text,
  p_meta_app_secret text,
  p_webhook_verify_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Autorizar si: (a) el usuario es dueño de la organización
  --        o (b) es miembro activo con permiso manage_instagram = true
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
        and coalesce((om.permissions->>'manage_instagram')::boolean, false) = true
    )
  ) then
    raise exception 'No autorizado para gestionar credenciales de esta organización';
  end if;

  insert into public.organization_meta_credentials(
    organization_id, meta_app_id, meta_app_secret, webhook_verify_token
  )
  values (p_organization_id, p_meta_app_id, p_meta_app_secret, p_webhook_verify_token)
  on conflict (organization_id)
  do update set
    meta_app_id = excluded.meta_app_id,
    meta_app_secret = excluded.meta_app_secret,
    webhook_verify_token = excluded.webhook_verify_token,
    updated_at = now();
end;
$$;
