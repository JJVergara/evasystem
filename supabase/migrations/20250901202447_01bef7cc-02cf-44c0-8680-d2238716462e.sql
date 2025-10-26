-- Fix remaining function search_path security warning
CREATE OR REPLACE FUNCTION public.handle_social_mention_ambassador_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;