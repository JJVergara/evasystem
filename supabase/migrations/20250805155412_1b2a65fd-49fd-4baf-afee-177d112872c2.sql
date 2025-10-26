-- Fix infinite recursion in users table RLS policies
-- First, drop existing problematic policies
DROP POLICY IF EXISTS "Users can access own data" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Create new non-recursive policies for users table
CREATE POLICY "Users can view own data"
ON public.users FOR SELECT
USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update own data"
ON public.users FOR UPDATE
USING (auth_user_id = auth.uid());

-- Allow users to insert their own record (for registration)
CREATE POLICY "Users can insert own record"
ON public.users FOR INSERT
WITH CHECK (auth_user_id = auth.uid());