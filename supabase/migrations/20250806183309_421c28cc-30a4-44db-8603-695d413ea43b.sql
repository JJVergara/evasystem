
-- Agregar constraint único para evitar cards duplicadas del mismo usuario con el mismo mensaje
ALTER TABLE cards ADD CONSTRAINT unique_user_message UNIQUE (user_id, message);

-- Opcional: Función para generar cards automáticas de datos existentes
CREATE OR REPLACE FUNCTION generate_auto_cards_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Generar cards para organizaciones existentes
  INSERT INTO public.cards (user_id, type, message, read_status, created_at)
  SELECT 
    p_user_id,
    'info',
    'Organización "' || o.name || '" está activa en el sistema',
    false,
    o.created_at
  FROM organizations o
  JOIN users u ON u.organization_id = o.id
  WHERE u.id = p_user_id
  ON CONFLICT (user_id, message) DO NOTHING;

  -- Generar cards para embajadores aprobados
  INSERT INTO public.cards (user_id, type, message, read_status, created_at)
  SELECT 
    p_user_id,
    'success',
    'Embajador ' || e.first_name || ' ' || e.last_name || ' está activo',
    false,
    e.created_at
  FROM embassadors e
  JOIN users u ON u.organization_id = e.organization_id
  WHERE u.id = p_user_id AND e.status = 'approved'
  ON CONFLICT (user_id, message) DO NOTHING;

  -- Generar cards para eventos activos
  INSERT INTO public.cards (user_id, event_id, type, message, read_status, created_at)
  SELECT 
    p_user_id,
    ev.id,
    'achievement',
    'Evento "' || ev.name || '" está en progreso',
    false,
    ev.created_at
  FROM events ev
  JOIN users u ON u.organization_id = ev.organization_id
  WHERE u.id = p_user_id AND ev.active = true
  ON CONFLICT (user_id, message) DO NOTHING;
END;
$function$;
