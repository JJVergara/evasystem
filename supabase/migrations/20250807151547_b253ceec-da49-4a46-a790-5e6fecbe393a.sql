-- Add hierarchical organization support
ALTER TABLE organizations 
ADD COLUMN parent_organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN is_main_account BOOLEAN DEFAULT false,
ADD COLUMN organization_type TEXT DEFAULT 'sub_brand' CHECK (organization_type IN ('main', 'sub_brand'));

-- Create index for parent organization lookups
CREATE INDEX idx_organizations_parent_id ON organizations(parent_organization_id);

-- Update existing organizations to be main accounts if they don't have a parent
UPDATE organizations 
SET organization_type = 'main', is_main_account = true 
WHERE parent_organization_id IS NULL;

-- Create function to get organization hierarchy
CREATE OR REPLACE FUNCTION get_organization_hierarchy(org_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  organization_type TEXT,
  is_main_account BOOLEAN,
  level INTEGER
) AS $$
WITH RECURSIVE hierarchy AS (
  -- Base case: start with the given organization
  SELECT 
    o.id,
    o.name,
    o.description,
    o.organization_type,
    o.is_main_account,
    0 as level
  FROM organizations o
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
  FROM organizations o
  JOIN hierarchy h ON o.parent_organization_id = h.id
)
SELECT * FROM hierarchy ORDER BY level, name;
$$ LANGUAGE sql;

-- Create RLS policy for hierarchical access
CREATE POLICY "Users can view organization hierarchy" 
ON organizations 
FOR SELECT 
USING (
  -- Users can see their own organizations
  created_by = auth.uid() 
  OR 
  -- Users can see sub-organizations of their main organizations
  parent_organization_id IN (
    SELECT id FROM organizations WHERE created_by = auth.uid()
  )
);

-- Update existing policies to handle hierarchy
DROP POLICY IF EXISTS "Users can view own organizations" ON organizations;

-- Allow creating sub-organizations
CREATE POLICY "Users can create sub-organizations" 
ON organizations 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by 
  AND (
    parent_organization_id IS NULL 
    OR 
    parent_organization_id IN (
      SELECT id FROM organizations WHERE created_by = auth.uid()
    )
  )
);