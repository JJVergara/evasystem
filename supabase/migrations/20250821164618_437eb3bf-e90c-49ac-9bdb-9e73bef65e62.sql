-- Security Fix 1: Prevent privilege escalation in users table
-- Add trigger to prevent users from changing their role to admin
CREATE TRIGGER prevent_user_role_escalation
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_privilege_escalation();

-- Security Fix 2: Remove client SELECT access to Instagram tokens
-- This prevents potential token leakage to client applications
DROP POLICY IF EXISTS "Users can view own organization instagram tokens" ON public.organization_instagram_tokens;

-- Security Fix 3: Fix function search paths for security
-- Update existing functions to use secure search path
CREATE OR REPLACE FUNCTION public.prevent_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Allow service_role to change roles (for admin flows/edge functions).
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Block role changes by regular clients.
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Changing role is not allowed';
  END IF;

  RETURN NEW;
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.get_safe_organization_data(user_id uuid)
 RETURNS TABLE(id uuid, name text, description text, timezone text, logo_url text, plan_type text, instagram_username text, facebook_page_id text, instagram_business_account_id text, instagram_user_id text, last_instagram_sync timestamp with time zone, created_by uuid, created_at timestamp with time zone, meta_token text, token_expiry timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    o.id,
    o.name,
    o.description,
    o.timezone,
    o.logo_url,
    o.plan_type,
    o.instagram_username,
    o.facebook_page_id,
    o.instagram_business_account_id,
    o.instagram_user_id,
    o.last_instagram_sync,
    o.created_by,
    o.created_at,
    -- ALWAYS return NULL for token fields - tokens are now in private tables
    NULL::text as meta_token,
    NULL::timestamp with time zone as token_expiry
  FROM public.organizations o
  WHERE o.created_by = user_id;
$function$;

CREATE OR REPLACE FUNCTION public.get_safe_ambassador_data(user_organization_ids uuid[])
 RETURNS TABLE(id uuid, first_name text, last_name text, email text, instagram_user text, instagram_user_id text, follower_count integer, profile_picture_url text, date_of_birth date, rut text, global_points integer, global_category text, performance_status text, events_participated integer, completed_tasks integer, failed_tasks integer, organization_id uuid, created_by_user_id uuid, status text, profile_public boolean, last_instagram_sync timestamp with time zone, created_at timestamp with time zone, instagram_access_token text, token_expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    e.id,
    e.first_name,
    e.last_name,
    e.email,
    e.instagram_user,
    e.instagram_user_id,
    e.follower_count,
    e.profile_picture_url,
    e.date_of_birth,
    e.rut,
    e.global_points,
    e.global_category,
    e.performance_status,
    e.events_participated,
    e.completed_tasks,
    e.failed_tasks,
    e.organization_id,
    e.created_by_user_id,
    e.status,
    e.profile_public,
    e.last_instagram_sync,
    e.created_at,
    -- ALWAYS return NULL for token fields - tokens are now in private tables
    NULL::text as instagram_access_token,
    NULL::timestamp with time zone as token_expires_at
  FROM public.embassadors e
  WHERE e.organization_id = ANY(user_organization_ids);
$function$;