-- Add columns to track pending fiesta selection for story mentions
-- When someone tags the org in a story, we ask which party they posted about
-- These columns track the pending state until user responds

ALTER TABLE public.social_mentions
ADD COLUMN IF NOT EXISTS awaiting_fiesta_selection BOOLEAN DEFAULT false;

ALTER TABLE public.social_mentions
ADD COLUMN IF NOT EXISTS fiesta_selection_expires_at TIMESTAMPTZ;

-- Index for efficient lookup of pending selections by user
CREATE INDEX IF NOT EXISTS idx_social_mentions_awaiting_fiesta
ON public.social_mentions (organization_id, instagram_user_id, awaiting_fiesta_selection)
WHERE awaiting_fiesta_selection = true;

COMMENT ON COLUMN public.social_mentions.awaiting_fiesta_selection IS 'True when waiting for user to select which party their story mention is about';
COMMENT ON COLUMN public.social_mentions.fiesta_selection_expires_at IS 'When the fiesta selection prompt expires (24h after sending)';
