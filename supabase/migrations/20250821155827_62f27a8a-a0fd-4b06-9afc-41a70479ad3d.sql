-- Create social_mentions table to store all mentions/tags from Instagram
CREATE TABLE public.social_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  instagram_user_id TEXT,
  instagram_username TEXT,
  content TEXT,
  mention_type TEXT NOT NULL CHECK (mention_type IN ('mention', 'hashtag', 'story', 'comment')),
  instagram_media_id TEXT,
  instagram_story_id TEXT,
  story_url TEXT,
  hashtag TEXT,
  reach_count INTEGER DEFAULT 0,
  engagement_score DOUBLE PRECISION DEFAULT 0,
  platform TEXT DEFAULT 'instagram',
  raw_data JSONB,
  processed BOOLEAN DEFAULT false,
  matched_ambassador_id UUID,
  matched_event_id UUID,
  matched_fiesta_id UUID,
  created_task_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_social_mentions_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_social_mentions_ambassador FOREIGN KEY (matched_ambassador_id) REFERENCES embassadors(id) ON DELETE SET NULL,
  CONSTRAINT fk_social_mentions_event FOREIGN KEY (matched_event_id) REFERENCES events(id) ON DELETE SET NULL,
  CONSTRAINT fk_social_mentions_fiesta FOREIGN KEY (matched_fiesta_id) REFERENCES fiestas(id) ON DELETE SET NULL,
  CONSTRAINT fk_social_mentions_task FOREIGN KEY (created_task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

-- Create ambassador_requests table for potential ambassadors detected from mentions
CREATE TABLE public.ambassador_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  instagram_user_id TEXT,
  instagram_username TEXT NOT NULL,
  follower_count INTEGER DEFAULT 0,
  profile_picture_url TEXT,
  bio TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  source_mention_ids UUID[] DEFAULT '{}',
  total_mentions INTEGER DEFAULT 1,
  last_mention_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by_user_id UUID,
  rejection_reason TEXT,
  notes TEXT,
  CONSTRAINT fk_ambassador_requests_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT unique_org_instagram_user UNIQUE (organization_id, instagram_username)
);

-- Add instagram_handle to fiestas table
ALTER TABLE public.fiestas 
ADD COLUMN instagram_handle TEXT;

-- Create indexes for better performance
CREATE INDEX idx_social_mentions_org_created ON public.social_mentions (organization_id, created_at DESC);
CREATE INDEX idx_social_mentions_instagram_user ON public.social_mentions (instagram_user_id);
CREATE INDEX idx_social_mentions_type_processed ON public.social_mentions (mention_type, processed);
CREATE INDEX idx_social_mentions_hashtag ON public.social_mentions (hashtag) WHERE hashtag IS NOT NULL;
CREATE INDEX idx_ambassador_requests_org_status ON public.ambassador_requests (organization_id, status);
CREATE INDEX idx_ambassador_requests_instagram_user ON public.ambassador_requests (instagram_username);
CREATE INDEX idx_fiestas_instagram_handle ON public.fiestas (instagram_handle) WHERE instagram_handle IS NOT NULL;

-- Enable RLS on new tables
ALTER TABLE public.social_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for social_mentions
CREATE POLICY "Users can view own organization social mentions" 
ON public.social_mentions 
FOR SELECT 
USING (organization_id IN (
  SELECT id FROM organizations WHERE created_by = auth.uid()
));

CREATE POLICY "Users can update own organization social mentions" 
ON public.social_mentions 
FOR UPDATE 
USING (organization_id IN (
  SELECT id FROM organizations WHERE created_by = auth.uid()
));

-- RLS policies for ambassador_requests
CREATE POLICY "Users can view own organization ambassador requests" 
ON public.ambassador_requests 
FOR SELECT 
USING (organization_id IN (
  SELECT id FROM organizations WHERE created_by = auth.uid()
));

CREATE POLICY "Users can update own organization ambassador requests" 
ON public.ambassador_requests 
FOR UPDATE 
USING (organization_id IN (
  SELECT id FROM organizations WHERE created_by = auth.uid()
));

-- Create function to automatically update ambassador_requests when social_mentions are added
CREATE OR REPLACE FUNCTION public.handle_social_mention_ambassador_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if this is an unmatched mention (no ambassador found)
  IF NEW.matched_ambassador_id IS NULL AND NEW.instagram_username IS NOT NULL THEN
    -- Insert or update ambassador request
    INSERT INTO public.ambassador_requests (
      organization_id,
      instagram_user_id,
      instagram_username,
      source_mention_ids,
      total_mentions,
      last_mention_at
    )
    VALUES (
      NEW.organization_id,
      NEW.instagram_user_id,
      NEW.instagram_username,
      ARRAY[NEW.id],
      1,
      NEW.created_at
    )
    ON CONFLICT (organization_id, instagram_username)
    DO UPDATE SET
      source_mention_ids = ambassador_requests.source_mention_ids || NEW.id,
      total_mentions = ambassador_requests.total_mentions + 1,
      last_mention_at = NEW.created_at;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for the function
CREATE TRIGGER trigger_social_mention_ambassador_request
  AFTER INSERT ON public.social_mentions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_social_mention_ambassador_request();