-- Create story_insights_snapshots table for tracking Story insights over time
-- This table stores periodic snapshots of Instagram Story metrics during their 24h lifecycle

CREATE TABLE IF NOT EXISTS public.story_insights_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to the story mention
  social_mention_id UUID NOT NULL REFERENCES public.social_mentions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Instagram Story identifiers
  instagram_story_id TEXT,
  instagram_media_id TEXT,
  
  -- Snapshot metadata
  snapshot_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  story_age_hours NUMERIC(5,2), -- Age of story when snapshot was taken
  
  -- Core metrics (available for Stories)
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  
  -- Story-specific engagement metrics
  replies INTEGER DEFAULT 0,
  exits INTEGER DEFAULT 0,
  taps_forward INTEGER DEFAULT 0,
  taps_back INTEGER DEFAULT 0,
  
  -- Navigation metrics (JSONB for flexibility)
  navigation JSONB DEFAULT '{}',
  
  -- Additional metrics that might be available
  shares INTEGER DEFAULT 0,
  
  -- Raw data from Instagram API for audit trail
  raw_insights JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT story_insights_snapshots_positive_metrics CHECK (
    impressions >= 0 AND 
    reach >= 0 AND 
    replies >= 0 AND 
    exits >= 0 AND 
    taps_forward >= 0 AND 
    taps_back >= 0 AND
    shares >= 0
  )
);

-- Indexes for efficient querying
CREATE INDEX idx_story_insights_snapshots_mention_id 
  ON public.story_insights_snapshots(social_mention_id);

CREATE INDEX idx_story_insights_snapshots_org_id 
  ON public.story_insights_snapshots(organization_id);

CREATE INDEX idx_story_insights_snapshots_snapshot_at 
  ON public.story_insights_snapshots(snapshot_at DESC);

CREATE INDEX idx_story_insights_snapshots_story_id 
  ON public.story_insights_snapshots(instagram_story_id) 
  WHERE instagram_story_id IS NOT NULL;

-- Composite index for getting latest snapshots per story
CREATE INDEX idx_story_insights_snapshots_mention_snapshot 
  ON public.story_insights_snapshots(social_mention_id, snapshot_at DESC);

-- Enable RLS
ALTER TABLE public.story_insights_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies: Members can view snapshots from their organization
CREATE POLICY "Members can view organization story insights snapshots" 
  ON public.story_insights_snapshots 
  FOR SELECT 
  USING (
    public.is_organization_member(auth.uid(), organization_id)
  );

-- System can insert snapshots (for edge functions)
CREATE POLICY "System can insert story insights snapshots" 
  ON public.story_insights_snapshots 
  FOR INSERT 
  WITH CHECK (true);

-- Create a view for latest snapshots per story
CREATE OR REPLACE VIEW public.story_insights_latest AS
SELECT DISTINCT ON (social_mention_id)
  si.*,
  sm.instagram_username,
  sm.mentioned_at,
  sm.expires_at,
  sm.state
FROM public.story_insights_snapshots si
JOIN public.social_mentions sm ON si.social_mention_id = sm.id
ORDER BY social_mention_id, snapshot_at DESC;

-- Grant access to the view
ALTER VIEW public.story_insights_latest OWNER TO postgres;
GRANT SELECT ON public.story_insights_latest TO authenticated;
GRANT SELECT ON public.story_insights_latest TO service_role;

-- Add comment for documentation
COMMENT ON TABLE public.story_insights_snapshots IS 
  'Stores periodic snapshots of Instagram Story insights during their 24-hour lifecycle. ' ||
  'Snapshots are taken at multiple intervals (1h, 4h, 8h, 12h, 20h, 23h) to track metric evolution.';

COMMENT ON COLUMN public.story_insights_snapshots.story_age_hours IS 
  'Age of the story in hours when this snapshot was taken. Useful for time-series analysis.';

COMMENT ON COLUMN public.story_insights_snapshots.navigation IS 
  'JSON object containing detailed navigation metrics like swipe-forward, swipe-back, etc.';

