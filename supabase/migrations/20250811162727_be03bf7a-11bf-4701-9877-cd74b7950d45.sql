-- Ensure proper search_path and security for trigger function
CREATE OR REPLACE FUNCTION public.update_organization_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Restrict direct access to plans table to authenticated users only
DROP POLICY IF EXISTS "Users can view all plans" ON public.plans;
CREATE POLICY "Authenticated users can view plans"
ON public.plans
FOR SELECT
TO authenticated
USING (true);

-- Create a limited public view (still requires authentication due to table RLS)
CREATE OR REPLACE VIEW public.plans_public AS
SELECT name, price, max_ambassadors, max_events, is_active
FROM public.plans
WHERE is_active = true;