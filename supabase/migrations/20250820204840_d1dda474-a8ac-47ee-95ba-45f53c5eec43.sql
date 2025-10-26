-- CRITICAL SECURITY FIXES - Phase 1B
-- Fix RLS policies with correct syntax

-- Add proper RLS policies for users table with stricter checks
DROP POLICY IF EXISTS "Users can create own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can create own profile" ON public.users
  FOR INSERT WITH CHECK (
    auth.uid() = auth_user_id AND
    role = 'user' AND
    (organization_id IS NULL OR organization_id IN (
      SELECT id FROM public.organizations WHERE created_by = auth.uid()
    ))
  );

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Create secure RPC functions to replace unsafe views
CREATE OR REPLACE FUNCTION public.get_organization_safe_info(org_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  timezone text,
  logo_url text,
  plan_type text,
  instagram_username text,
  instagram_connected boolean,
  last_instagram_sync timestamp with time zone,
  created_at timestamp with time zone
) LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT 
    o.id,
    o.name,
    o.description,
    o.timezone,
    o.logo_url,
    o.plan_type,
    o.instagram_username,
    (o.meta_token IS NOT NULL) as instagram_connected,
    o.last_instagram_sync,
    o.created_at
  FROM public.organizations o
  WHERE (org_id IS NULL OR o.id = org_id)
    AND o.created_by = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_ambassador_safe_info(org_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  email text,
  instagram_user text,
  follower_count integer,
  profile_picture_url text,
  global_points integer,
  global_category text,
  performance_status text,
  events_participated integer,
  completed_tasks integer,
  failed_tasks integer,
  organization_id uuid,
  status text,
  profile_public boolean,
  last_instagram_sync timestamp with time zone,
  created_at timestamp with time zone
) LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT 
    e.id,
    e.first_name,
    e.last_name,
    e.email,
    e.instagram_user,
    e.follower_count,
    e.profile_picture_url,
    e.global_points,
    e.global_category,
    e.performance_status,
    e.events_participated,
    e.completed_tasks,
    e.failed_tasks,
    e.organization_id,
    e.status,
    e.profile_public,
    e.last_instagram_sync,
    e.created_at
  FROM public.embassadors e
  WHERE (org_id IS NULL OR e.organization_id = org_id)
    AND e.organization_id IN (
      SELECT id FROM public.organizations WHERE created_by = auth.uid()
    );
$$;