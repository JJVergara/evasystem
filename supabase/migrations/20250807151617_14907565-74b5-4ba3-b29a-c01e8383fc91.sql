-- Fix security warnings by setting proper search_path for functions

-- Drop and recreate the function with secure search_path
DROP FUNCTION IF EXISTS get_organization_hierarchy(UUID);

CREATE OR REPLACE FUNCTION get_organization_hierarchy(org_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  organization_type TEXT,
  is_main_account BOOLEAN,
  level INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
WITH RECURSIVE hierarchy AS (
  -- Base case: start with the given organization
  SELECT 
    o.id,
    o.name,
    o.description,
    o.organization_type,
    o.is_main_account,
    0 as level
  FROM public.organizations o
  WHERE o.id = org_id
  
  UNION ALL
  
  -- Recursive case: find children
  SELECT 
    o.id,
    o.name,
    o.description,
    o.organization_type,
    o.is_main_account,
    h.level + 1
  FROM public.organizations o
  JOIN hierarchy h ON o.parent_organization_id = h.id
)
SELECT * FROM hierarchy ORDER BY level, name;
$$;

-- Also fix the cleanup function search path
DROP FUNCTION IF EXISTS cleanup_expired_oauth_states();

CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.oauth_states WHERE expires_at < now();
END;
$$;