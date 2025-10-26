-- Add DELETE policy for organizations
CREATE POLICY "Users can delete own organizations" 
ON public.organizations 
FOR DELETE 
USING (auth.uid() = created_by);