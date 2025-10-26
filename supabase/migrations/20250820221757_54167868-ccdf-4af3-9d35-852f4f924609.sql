-- Step 1: Create private token tables with strong RLS policies

-- Create organization_instagram_tokens table (private token storage)
CREATE TABLE public.organization_instagram_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ambassador_tokens table (private token storage) 
CREATE TABLE public.ambassador_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  embassador_id UUID NOT NULL UNIQUE REFERENCES public.embassadors(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables but DO NOT add any client policies
-- This makes them accessible ONLY by Edge Functions with service_role
ALTER TABLE public.organization_instagram_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_tokens ENABLE ROW LEVEL SECURITY;

-- Revoke ALL permissions from anon and authenticated users
REVOKE ALL ON TABLE public.organization_instagram_tokens FROM anon, authenticated;
REVOKE ALL ON TABLE public.ambassador_tokens FROM anon, authenticated;

-- Create update triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_organization_instagram_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.update_ambassador_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER update_organization_instagram_tokens_updated_at
  BEFORE UPDATE ON public.organization_instagram_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_organization_instagram_tokens_updated_at();

CREATE TRIGGER update_ambassador_tokens_updated_at
  BEFORE UPDATE ON public.ambassador_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ambassador_tokens_updated_at();

-- Migrate existing token data from organizations table
INSERT INTO public.organization_instagram_tokens (organization_id, access_token, token_expiry)
SELECT id, meta_token, token_expiry 
FROM public.organizations 
WHERE meta_token IS NOT NULL;

-- Migrate existing token data from embassadors table
INSERT INTO public.ambassador_tokens (embassador_id, access_token, token_expiry)
SELECT id, instagram_access_token, token_expires_at 
FROM public.embassadors 
WHERE instagram_access_token IS NOT NULL;

-- Step 2: OAuth state hardening - add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_states_state_unique ON public.oauth_states(state);

-- Step 3: Update existing SECURITY DEFINER functions to include search_path
-- (Most already have it, but let's ensure consistency)

-- Update get_safe_organization_data to completely hide token fields
CREATE OR REPLACE FUNCTION public.get_safe_organization_data(user_id uuid)
 RETURNS TABLE(id uuid, name text, description text, timezone text, logo_url text, plan_type text, instagram_username text, facebook_page_id text, instagram_business_account_id text, instagram_user_id text, last_instagram_sync timestamp with time zone, created_by uuid, created_at timestamp with time zone, meta_token text, token_expiry timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
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

-- Update get_safe_ambassador_data to completely hide token fields
CREATE OR REPLACE FUNCTION public.get_safe_ambassador_data(user_organization_ids uuid[])
 RETURNS TABLE(id uuid, first_name text, last_name text, email text, instagram_user text, instagram_user_id text, follower_count integer, profile_picture_url text, date_of_birth date, rut text, global_points integer, global_category text, performance_status text, events_participated integer, completed_tasks integer, failed_tasks integer, organization_id uuid, created_by_user_id uuid, status text, profile_public boolean, last_instagram_sync timestamp with time zone, created_at timestamp with time zone, instagram_access_token text, token_expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
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

-- Create function to securely get organization token status (for Edge Functions only)
CREATE OR REPLACE FUNCTION public.get_organization_token_info(org_id uuid)
 RETURNS TABLE(access_token text, token_expiry timestamp with time zone, is_expired boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    oit.access_token,
    oit.token_expiry,
    (oit.token_expiry IS NOT NULL AND oit.token_expiry < now()) as is_expired
  FROM public.organization_instagram_tokens oit
  WHERE oit.organization_id = org_id;
$function$;

-- Create function to securely get ambassador token info (for Edge Functions only)
CREATE OR REPLACE FUNCTION public.get_ambassador_token_info(ambassador_id uuid)
 RETURNS TABLE(access_token text, token_expiry timestamp with time zone, is_expired boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    at.access_token,
    at.token_expiry,
    (at.token_expiry IS NOT NULL AND at.token_expiry < now()) as is_expired
  FROM public.ambassador_tokens at
  WHERE at.embassador_id = ambassador_id;
$function$;