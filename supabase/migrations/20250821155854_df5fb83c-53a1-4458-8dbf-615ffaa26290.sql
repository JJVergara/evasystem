-- Fix RLS policies - Add missing INSERT and DELETE policies for social_mentions
CREATE POLICY "Service role can insert social mentions" 
ON public.social_mentions 
FOR INSERT 
TO service_role
WITH CHECK (true);

CREATE POLICY "Users can delete own organization social mentions" 
ON public.social_mentions 
FOR DELETE 
USING (organization_id IN (
  SELECT id FROM organizations WHERE created_by = auth.uid()
));

-- Fix RLS policies - Add missing INSERT and DELETE policies for ambassador_requests  
CREATE POLICY "Service role can insert ambassador requests" 
ON public.ambassador_requests 
FOR INSERT 
TO service_role
WITH CHECK (true);

CREATE POLICY "Users can delete own organization ambassador requests" 
ON public.ambassador_requests 
FOR DELETE 
USING (organization_id IN (
  SELECT id FROM organizations WHERE created_by = auth.uid()
));

-- Fix RLS policies for organization_instagram_tokens (missing policies)
CREATE POLICY "Users can view own organization instagram tokens" 
ON public.organization_instagram_tokens 
FOR SELECT 
USING (organization_id IN (
  SELECT id FROM organizations WHERE created_by = auth.uid()
));

CREATE POLICY "Service role can manage instagram tokens" 
ON public.organization_instagram_tokens 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Fix RLS policies for organization_meta_credentials (missing policies)
CREATE POLICY "Users can view own organization meta credentials" 
ON public.organization_meta_credentials 
FOR SELECT 
USING (organization_id IN (
  SELECT id FROM organizations WHERE created_by = auth.uid()
));

CREATE POLICY "Service role can manage meta credentials" 
ON public.organization_meta_credentials 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Fix RLS policies for ambassador_tokens (missing policies)
CREATE POLICY "Service role can manage ambassador tokens" 
ON public.ambassador_tokens 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Fix function search path issues
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;