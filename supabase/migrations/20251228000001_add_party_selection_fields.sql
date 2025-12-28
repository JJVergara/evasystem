-- Add party selection tracking fields to social_mentions table
-- These fields support the automatic party matching flow for story mentions

-- Party selection status for tracking the conversation flow
-- 'not_required' - Only 1 active party, auto-matched
-- 'pending_response' - Multiple parties, waiting for user's response
-- 'resolved' - User responded and party was matched
-- 'timeout' - User didn't respond within 4 hours
ALTER TABLE public.social_mentions
ADD COLUMN IF NOT EXISTS party_selection_status TEXT DEFAULT 'not_required';

-- Timestamp when the party selection message was sent
ALTER TABLE public.social_mentions
ADD COLUMN IF NOT EXISTS party_selection_message_sent_at TIMESTAMP WITH TIME ZONE;

-- JSON storing which party options were presented to the user
-- Format: [{ "id": "uuid", "name": "Party Name", "payload": "party_1" }, ...]
ALTER TABLE public.social_mentions
ADD COLUMN IF NOT EXISTS party_options_sent JSONB;

-- Message ID from Instagram for the party selection message we sent
-- Used to track the conversation and match responses
ALTER TABLE public.social_mentions
ADD COLUMN IF NOT EXISTS party_selection_message_id TEXT;

-- Add constraint for valid party_selection_status values
ALTER TABLE public.social_mentions
ADD CONSTRAINT social_mentions_party_selection_status_check
CHECK (party_selection_status IN ('not_required', 'pending_response', 'resolved', 'timeout'));

-- Index for finding mentions pending response (for timeout worker)
CREATE INDEX IF NOT EXISTS idx_social_mentions_party_pending
ON public.social_mentions(organization_id, party_selection_status, party_selection_message_sent_at)
WHERE party_selection_status = 'pending_response';

-- Index for matching incoming messages to pending mentions
CREATE INDEX IF NOT EXISTS idx_social_mentions_instagram_user_pending
ON public.social_mentions(organization_id, instagram_user_id, party_selection_status)
WHERE party_selection_status = 'pending_response';

-- Add comments for documentation
COMMENT ON COLUMN public.social_mentions.party_selection_status IS
  'Tracks the party selection conversation flow: not_required (auto-matched), pending_response (waiting), resolved (matched), timeout (no response)';

COMMENT ON COLUMN public.social_mentions.party_selection_message_sent_at IS
  'Timestamp when the party selection DM was sent to the user';

COMMENT ON COLUMN public.social_mentions.party_options_sent IS
  'JSON array of party options that were sent to the user for selection';

COMMENT ON COLUMN public.social_mentions.party_selection_message_id IS
  'Instagram message ID for the party selection message, used to track conversation';
