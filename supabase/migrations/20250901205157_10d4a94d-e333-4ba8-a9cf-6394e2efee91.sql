-- Fix set_social_mention_expiry function search_path security warning
CREATE OR REPLACE FUNCTION public.set_social_mention_expiry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.mentioned_at + interval '24 hours';
  END IF;
  RETURN NEW;
END;
$function$;