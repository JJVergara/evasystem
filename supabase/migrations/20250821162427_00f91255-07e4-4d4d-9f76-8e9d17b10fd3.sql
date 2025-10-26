
-- 1) Extensiones necesarias (idempotentes)
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- 2) Realtime robusto (old/new)
alter table public.social_mentions replica identity full;
alter table public.ambassador_requests replica identity full;

-- Añadir tablas a la publicación realtime (puede fallar si ya están añadidas; si es así, ignora ese error)
alter publication supabase_realtime add table public.social_mentions;
alter publication supabase_realtime add table public.ambassador_requests;

-- 3) Cron cada 5 minutos para instagram-sync
-- Nota: Inicialmente llamará con el ANON key; en el siguiente paso haré la función pública (verify_jwt = false)
-- para que la llamada del cron funcione sin usuario.
-- Evitar duplicados si ya existe un job con el mismo nombre
do $$
begin
  if exists (select 1 from cron.job where jobname = 'instagram_sync_every_5_min') then
    perform cron.unschedule('instagram_sync_every_5_min');
  end if;

  perform cron.schedule(
    'instagram_sync_every_5_min',
    '*/5 * * * *',
    $sql$
    select
      net.http_post(
        url    := 'https://awpfslcepylnipaolmvv.supabase.co/functions/v1/instagram-sync',
        headers:= '{
          "Content-Type": "application/json",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3cGZzbGNlcHlsbmlwYW9sbXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NTUzOTUsImV4cCI6MjA2OTMzMTM5NX0.KyXrezLFMXhsOr3zyrNm1nb1T3w6C6R3WdJZ2w21oOY"
        }'::jsonb,
        body   := '{"source":"cron","cron":true}'::jsonb
      );
    $sql$
  );
end$$;
