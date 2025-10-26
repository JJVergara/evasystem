-- Fix infinite recursion in embassadors table RLS policies
-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can manage embassadors" ON public.embassadors;
DROP POLICY IF EXISTS "Users can view org embassadors" ON public.embassadors;

-- Create a security definer function to get user's organization safely
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Create new non-recursive policies for embassadors table
CREATE POLICY "Users can view org embassadors" 
ON public.embassadors 
FOR SELECT 
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can insert embassadors" 
ON public.embassadors 
FOR INSERT 
WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update org embassadors" 
ON public.embassadors 
FOR UPDATE 
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can delete org embassadors" 
ON public.embassadors 
FOR DELETE 
USING (organization_id = public.get_user_organization_id());