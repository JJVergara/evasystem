-- Fix infinite recursion in organizations RLS policies
-- Step 1: Create a security definer function to get user organizations safely
CREATE OR REPLACE FUNCTION public.get_user_organization_ids(user_id UUID)
RETURNS TABLE(organization_id UUID)
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM organizations WHERE created_by = user_id;
$$;

-- Step 2: Drop existing problematic RLS policies
DROP POLICY IF EXISTS "Users can view organization hierarchy" ON public.organizations;
DROP POLICY IF EXISTS "Users can create sub-organizations" ON public.organizations;

-- Step 3: Create safe RLS policies without recursion
CREATE POLICY "Users can view own organizations" 
ON public.organizations 
FOR SELECT 
USING (created_by = auth.uid());

CREATE POLICY "Users can view sub-organizations" 
ON public.organizations 
FOR SELECT 
USING (parent_organization_id IN (SELECT organization_id FROM public.get_user_organization_ids(auth.uid())));

CREATE POLICY "Users can create main organizations" 
ON public.organizations 
FOR INSERT 
WITH CHECK (created_by = auth.uid() AND parent_organization_id IS NULL);

CREATE POLICY "Users can create sub-organizations" 
ON public.organizations 
FOR INSERT 
WITH CHECK (
  created_by = auth.uid() 
  AND parent_organization_id IN (SELECT organization_id FROM public.get_user_organization_ids(auth.uid()))
);