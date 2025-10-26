
-- Idempotencia para menciones desde historias (DM referrals)
CREATE UNIQUE INDEX IF NOT EXISTS ux_social_mentions_story_referral_external_event
ON public.social_mentions (organization_id, external_event_id)
WHERE mention_type = 'story_referral';
