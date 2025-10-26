
-- 1) Nuevas columnas para gestionar 24h, estados y deep links
ALTER TABLE public.social_mentions
  ADD COLUMN IF NOT EXISTS mentioned_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS deep_link text;

-- Opcional: validar valores de estado (estático, no dependiente de tiempo)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'social_mentions_state_chk'
  ) THEN
    ALTER TABLE public.social_mentions
      ADD CONSTRAINT social_mentions_state_chk
      CHECK (state IN ('new','flagged_early_delete','completed','expired_unknown'));
  END IF;
END$$;

-- 2) Idempotencia adicional cuando no haya external_event_id
CREATE UNIQUE INDEX IF NOT EXISTS ux_social_mentions_story_referral_user_ts
ON public.social_mentions (organization_id, instagram_user_id, mentioned_at)
WHERE mention_type = 'story_referral';

-- 3) Índices para el worker
CREATE INDEX IF NOT EXISTS idx_social_mentions_story_referral_expires_at
ON public.social_mentions (expires_at)
WHERE mention_type = 'story_referral' AND state = 'new';

CREATE INDEX IF NOT EXISTS idx_social_mentions_story_referral_state
ON public.social_mentions (state)
WHERE mention_type = 'story_referral';

-- 4) Trigger para setear expires_at = mentioned_at + 24h
CREATE OR REPLACE FUNCTION public.set_social_mention_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.mentioned_at + interval '24 hours';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_set_social_mention_expiry ON public.social_mentions;
CREATE TRIGGER trg_set_social_mention_expiry
BEFORE INSERT ON public.social_mentions
FOR EACH ROW
EXECUTE PROCEDURE public.set_social_mention_expiry();

-- 5) Trigger para crear/actualizar Solicitud de Embajador a partir de menciones no emparejadas
-- La función public.handle_social_mention_ambassador_request() ya existe
DROP TRIGGER IF EXISTS trg_handle_social_mention_ambassador_request ON public.social_mentions;
CREATE TRIGGER trg_handle_social_mention_ambassador_request
AFTER INSERT ON public.social_mentions
FOR EACH ROW
EXECUTE PROCEDURE public.handle_social_mention_ambassador_request();
