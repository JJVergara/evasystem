-- Add new story insights columns based on Instagram API v24.0
-- See: https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights

-- Make social_mention_id nullable (stories may not have a corresponding mention)
ALTER TABLE public.story_insights_snapshots 
  ALTER COLUMN social_mention_id DROP NOT NULL;

-- Update foreign key to SET NULL on delete
ALTER TABLE public.story_insights_snapshots 
  DROP CONSTRAINT IF EXISTS story_insights_snapshots_social_mention_id_fkey;

ALTER TABLE public.story_insights_snapshots 
  ADD CONSTRAINT story_insights_snapshots_social_mention_id_fkey 
  FOREIGN KEY (social_mention_id) 
  REFERENCES public.social_mentions(id) 
  ON DELETE SET NULL;

-- Add new engagement metrics columns
ALTER TABLE public.story_insights_snapshots 
  ADD COLUMN IF NOT EXISTS profile_visits INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_interactions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- Add index for instagram_story_id lookups
CREATE INDEX IF NOT EXISTS idx_story_insights_snapshots_ig_story_id 
  ON public.story_insights_snapshots(instagram_story_id);

-- Update constraint to include new columns
ALTER TABLE public.story_insights_snapshots
  DROP CONSTRAINT IF EXISTS story_insights_snapshots_positive_metrics;

ALTER TABLE public.story_insights_snapshots
  ADD CONSTRAINT story_insights_snapshots_positive_metrics CHECK (
    impressions >= 0 AND 
    reach >= 0 AND 
    replies >= 0 AND 
    exits >= 0 AND 
    taps_forward >= 0 AND 
    taps_back >= 0 AND
    shares >= 0 AND
    profile_visits >= 0 AND
    total_interactions >= 0 AND
    views >= 0
  );

-- Add comments for new columns
COMMENT ON COLUMN public.story_insights_snapshots.profile_visits IS 
  'Number of times profile was visited from this story';

COMMENT ON COLUMN public.story_insights_snapshots.total_interactions IS 
  'Total interactions (likes, saves, comments, shares minus unlikes/unsaves/deleted)';

COMMENT ON COLUMN public.story_insights_snapshots.views IS 
  'Total views of the story (metric in development by Meta)';

COMMENT ON COLUMN public.story_insights_snapshots.social_mention_id IS 
  'Optional reference to social_mentions. NULL for stories fetched directly without a mention record.';
