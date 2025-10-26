-- Fix the user role check constraint to properly allow 'user' role
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user', 'viewer'));

-- Add foreign key constraint between users and organizations for data integrity
ALTER TABLE public.users 
ADD CONSTRAINT fk_users_organization 
FOREIGN KEY (organization_id) 
REFERENCES public.organizations(id) 
ON DELETE SET NULL;