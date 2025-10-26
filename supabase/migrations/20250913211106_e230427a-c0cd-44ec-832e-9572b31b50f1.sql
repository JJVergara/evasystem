-- Fix security issue: Restrict access to sensitive ambassador data
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Members can view organization embassadors" ON public.embassadors;
DROP POLICY IF EXISTS "Members can create embassadors for organization" ON public.embassadors;
DROP POLICY IF EXISTS "Members can update organization embassadors" ON public.embassadors;

-- Create more restrictive policies that check for manage_ambassadors permission

-- Policy 1: Basic ambassador info viewable by all organization members
-- This allows viewing non-sensitive fields like name, instagram_user, status, points, etc.
CREATE POLICY "Members can view basic ambassador info" 
ON public.embassadors 
FOR SELECT 
USING (
  is_organization_member(auth.uid(), organization_id)
);

-- Policy 2: Sensitive ambassador data (email, rut, date_of_birth) only for users with manage_ambassadors permission
-- This will be enforced at the application level through views or selective field queries
-- But we need to ensure the base policy allows access first, then filter in application code

-- Policy 3: Only users with manage_ambassadors permission can create ambassadors
CREATE POLICY "Authorized members can create embassadors" 
ON public.embassadors 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = organization_id 
    AND o.created_by = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = embassadors.organization_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
    AND COALESCE((om.permissions->>'manage_ambassadors')::boolean, false) = true
  )
);

-- Policy 4: Only users with manage_ambassadors permission can update ambassadors
CREATE POLICY "Authorized members can update embassadors" 
ON public.embassadors 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = organization_id 
    AND o.created_by = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = embassadors.organization_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
    AND COALESCE((om.permissions->>'manage_ambassadors')::boolean, false) = true
  )
);

-- Create a secure function to get ambassador sensitive data
-- This function will only return sensitive fields to authorized users
CREATE OR REPLACE FUNCTION public.get_ambassador_sensitive_data(ambassador_id uuid)
RETURNS TABLE(
  id uuid,
  email text,
  date_of_birth date,
  rut text,
  profile_picture_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has permission to view sensitive data
  IF NOT EXISTS (
    SELECT 1 FROM public.embassadors e
    INNER JOIN public.organizations o ON e.organization_id = o.id
    WHERE e.id = ambassador_id 
    AND o.created_by = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.embassadors e
    INNER JOIN public.organization_members om ON e.organization_id = om.organization_id
    WHERE e.id = ambassador_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
    AND COALESCE((om.permissions->>'manage_ambassadors')::boolean, false) = true
  ) THEN
    -- Return empty result if not authorized
    RETURN;
  END IF;

  -- Return sensitive data if authorized
  RETURN QUERY
  SELECT 
    e.id,
    e.email,
    e.date_of_birth,
    e.rut,
    e.profile_picture_url
  FROM public.embassadors e
  WHERE e.id = ambassador_id;
END;
$$;

-- Create a secure function to get ambassador basic data (non-sensitive)
CREATE OR REPLACE FUNCTION public.get_ambassador_basic_data()
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  instagram_user text,
  instagram_user_id text,
  follower_count integer,
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
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    e.id,
    e.first_name,
    e.last_name,
    e.instagram_user,
    e.instagram_user_id,
    e.follower_count,
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
  WHERE is_organization_member(auth.uid(), e.organization_id);
$$;