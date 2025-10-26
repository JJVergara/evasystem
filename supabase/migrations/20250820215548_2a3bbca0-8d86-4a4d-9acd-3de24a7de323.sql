
-- 1) Tabla para credenciales por organización (APP ID/SECRET/VERIFY TOKEN)
create table if not exists public.organization_meta_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meta_app_id text not null,
  meta_app_secret text not null,
  webhook_verify_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

-- Seguridad: habilitar RLS y no crear políticas de lectura/escritura por defecto.
-- (Los clientes no podrán leer esta tabla directamente)
alter table public.organization_meta_credentials enable row level security;

-- Índices útiles
create index if not exists idx_omc_org_id on public.organization_meta_credentials(organization_id);
create index if not exists idx_omc_verify_token on public.organization_meta_credentials(webhook_verify_token);

-- Trigger para updated_at
create or replace function public.update_omc_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_omc_updated_at on public.organization_meta_credentials;
create trigger trg_omc_updated_at
before update on public.organization_meta_credentials
for each row execute procedure public.update_omc_updated_at();

-- 2) RPC: Upsert seguro de credenciales (no expone secretos en el retorno)
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
  -- Validar que el usuario actual sea dueño de la organización
  if not exists (
    select 1 from public.organizations o
    where o.id = p_organization_id and o.created_by = auth.uid()
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

-- 3) RPC: Estado seguro de credenciales (sin exponer valores)
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
  -- Validar que el usuario actual sea dueño de la organización
  if not exists (
    select 1 from public.organizations o
    where o.id = p_organization_id and o.created_by = auth.uid()
  ) then
    raise exception 'No autorizado para ver el estado de credenciales de esta organización';
  end if;

  return query
  select
    exists(select 1 from public.organization_meta_credentials omc where omc.organization_id = p_organization_id) as has_credentials,
    (select omc2.updated_at from public.organization_meta_credentials omc2 where omc2.organization_id = p_organization_id limit 1) as updated_at;
end;
$$;
