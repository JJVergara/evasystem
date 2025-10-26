-- Fix the user role check constraint to allow 'user' role
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user', 'viewer'));

-- Update any existing users with 'admin' role to 'user' role for non-service accounts
UPDATE public.users SET role = 'user' WHERE role = 'admin' AND auth_user_id IS NOT NULL;