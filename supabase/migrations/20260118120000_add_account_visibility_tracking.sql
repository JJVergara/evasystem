ALTER TABLE public.social_mentions
  ADD COLUMN IF NOT EXISTS account_visibility TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS permission_requested_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'social_mentions_account_visibility_chk'
  ) THEN
    ALTER TABLE public.social_mentions
      ADD CONSTRAINT social_mentions_account_visibility_chk
      CHECK (account_visibility IN ('unknown', 'public', 'private'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_social_mentions_public_no_permission
ON public.social_mentions (organization_id, account_visibility)
WHERE account_visibility = 'public'
  AND permission_requested_at IS NULL
  AND matched_ambassador_id IS NOT NULL;

COMMENT ON COLUMN public.social_mentions.account_visibility IS
  'Detected account visibility: unknown (not checked), public (verified with org token), private (verification failed due to permissions)';

COMMENT ON COLUMN public.social_mentions.permission_requested_at IS
  'When we sent a request to the user asking them to connect their Instagram for enhanced tracking';
