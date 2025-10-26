-- Create fiestas table (previously organizations concept)
CREATE TABLE public.fiestas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  organization_id UUID NOT NULL,
  event_date DATE,
  location TEXT,
  main_hashtag TEXT,
  secondary_hashtags TEXT[],
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Migrate existing events data to fiestas
INSERT INTO public.fiestas (id, name, description, organization_id, event_date, location, main_hashtag, secondary_hashtags, status, created_at)
SELECT 
  id,
  name,
  description,
  organization_id,
  event_date,
  location,
  main_hashtag,
  secondary_hashtags,
  status,
  created_at
FROM public.events;

-- Update events table to reference fiestas instead of organizations
ALTER TABLE public.events DROP COLUMN organization_id;
ALTER TABLE public.events ADD COLUMN fiesta_id UUID REFERENCES public.fiestas(id);

-- Update events with fiesta references
UPDATE public.events SET fiesta_id = id;

-- Update embassadors to reference organizations directly (not through events)
-- Keep organization_id in embassadors as is

-- Update tasks to work with new structure
-- Tasks will reference events, which reference fiestas, which reference organizations

-- Enable RLS for fiestas
ALTER TABLE public.fiestas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for fiestas
CREATE POLICY "Users can view own organization fiestas" 
ON public.fiestas 
FOR SELECT 
USING (organization_id IN (
  SELECT organizations.id
  FROM organizations
  WHERE organizations.created_by = auth.uid()
));

CREATE POLICY "Users can create fiestas for own organization" 
ON public.fiestas 
FOR INSERT 
WITH CHECK (organization_id IN (
  SELECT organizations.id
  FROM organizations
  WHERE organizations.created_by = auth.uid()
));

CREATE POLICY "Users can update own organization fiestas" 
ON public.fiestas 
FOR UPDATE 
USING (organization_id IN (
  SELECT organizations.id
  FROM organizations
  WHERE organizations.created_by = auth.uid()
));

-- Update events RLS policies to work with fiestas
DROP POLICY IF EXISTS "Users can view own organization events" ON public.events;
DROP POLICY IF EXISTS "Users can create events for own organization" ON public.events;
DROP POLICY IF EXISTS "Users can update own organization events" ON public.events;

CREATE POLICY "Users can view events from own organization fiestas"
ON public.events
FOR SELECT
USING (fiesta_id IN (
  SELECT f.id
  FROM fiestas f
  JOIN organizations o ON f.organization_id = o.id
  WHERE o.created_by = auth.uid()
));

CREATE POLICY "Users can create events for own organization fiestas"
ON public.events
FOR INSERT
WITH CHECK (fiesta_id IN (
  SELECT f.id
  FROM fiestas f
  JOIN organizations o ON f.organization_id = o.id
  WHERE o.created_by = auth.uid()
));

CREATE POLICY "Users can update events from own organization fiestas"
ON public.events
FOR UPDATE
USING (fiesta_id IN (
  SELECT f.id
  FROM fiestas f
  JOIN organizations o ON f.organization_id = o.id
  WHERE o.created_by = auth.uid()
));

-- Remove problematic columns from events that were duplicated in fiestas
ALTER TABLE public.events DROP COLUMN IF EXISTS name;
ALTER TABLE public.events DROP COLUMN IF EXISTS description;
ALTER TABLE public.events DROP COLUMN IF EXISTS main_hashtag;
ALTER TABLE public.events DROP COLUMN IF EXISTS secondary_hashtags;
ALTER TABLE public.events DROP COLUMN IF EXISTS location;
ALTER TABLE public.events DROP COLUMN IF EXISTS status;

-- Keep only event-specific fields in events table
-- events now represents individual activities within a fiesta

-- Simplify organizations table - remove fields that belonged to fiestas concept
ALTER TABLE public.organizations DROP COLUMN IF EXISTS parent_organization_id;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS organization_type;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS is_main_account;

-- Organizations is now just the production company
-- One organization per user, multiple fiestas per organization