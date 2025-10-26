-- Add fields to social_mentions table for story mentions and idempotency
ALTER TABLE public.social_mentions
ADD COLUMN IF NOT EXISTS external_event_id TEXT,
ADD COLUMN IF NOT EXISTS recipient_page_id TEXT;

-- Create partial unique index for idempotency (only for non-null external_event_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_mentions_external_event_id 
ON public.social_mentions (external_event_id, organization_id) 
WHERE external_event_id IS NOT NULL;

-- Create index for recipient_page_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_social_mentions_recipient_page_id 
ON public.social_mentions (recipient_page_id);