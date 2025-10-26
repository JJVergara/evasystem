-- Drop the problematic policy and recreate it properly
DROP POLICY IF EXISTS "Users can view org users" ON public.users;

-- Create the corrected policy using the security definer function
CREATE POLICY "Users can view org users" 
ON public.users 
FOR SELECT 
USING (organization_id = get_user_organization_id());