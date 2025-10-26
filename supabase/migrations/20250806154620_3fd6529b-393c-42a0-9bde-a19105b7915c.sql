-- Fix the infinite recursion issue in users table RLS policies
-- Remove the problematic policy that causes recursion
DROP POLICY IF EXISTS "Users can view org users" ON public.users;

-- Create a new policy that avoids recursion by using the security definer function
CREATE POLICY "Users can view org users" ON public.users
FOR SELECT USING (
  organization_id = get_user_organization_id()
);