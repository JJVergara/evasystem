-- Fix ambassador_tokens RLS policies for proper access control

-- Add RLS policies to ambassador_tokens table to protect Instagram access tokens
-- Current policy only allows service_role access, but we need organization member access too

-- Allow organization members to view ambassador tokens only for ambassadors in their organization
CREATE POLICY "Members can view organization ambassador tokens"
ON public.ambassador_tokens
FOR SELECT
USING (
  embassador_id IN (
    SELECT e.id
    FROM public.embassadors e
    WHERE is_organization_member(auth.uid(), e.organization_id)
  )
);

-- Allow organization members to update ambassador tokens only for ambassadors in their organization  
CREATE POLICY "Members can update organization ambassador tokens"
ON public.ambassador_tokens
FOR UPDATE
USING (
  embassador_id IN (
    SELECT e.id
    FROM public.embassadors e
    WHERE is_organization_member(auth.uid(), e.organization_id)
  )
);

-- Allow organization members to create ambassador tokens only for ambassadors in their organization
CREATE POLICY "Members can create organization ambassador tokens"
ON public.ambassador_tokens
FOR INSERT
WITH CHECK (
  embassador_id IN (
    SELECT e.id
    FROM public.embassadors e
    WHERE is_organization_member(auth.uid(), e.organization_id)
  )
);

-- Allow organization members to delete ambassador tokens only for ambassadors in their organization
CREATE POLICY "Members can delete organization ambassador tokens"
ON public.ambassador_tokens
FOR DELETE
USING (
  embassador_id IN (
    SELECT e.id
    FROM public.embassadors e
    WHERE is_organization_member(auth.uid(), e.organization_id)
  )
);