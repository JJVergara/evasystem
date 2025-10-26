-- Add missing columns for Meta/Instagram integration on organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS instagram_user_id text,
ADD COLUMN IF NOT EXISTS instagram_username text,
ADD COLUMN IF NOT EXISTS facebook_page_id text,
ADD COLUMN IF NOT EXISTS instagram_business_account_id text;

-- Helpful indexes for lookups from webhooks and syncs
CREATE INDEX IF NOT EXISTS idx_organizations_instagram_user_id
  ON public.organizations (instagram_user_id);

CREATE INDEX IF NOT EXISTS idx_organizations_instagram_business_account_id
  ON public.organizations (instagram_business_account_id);
