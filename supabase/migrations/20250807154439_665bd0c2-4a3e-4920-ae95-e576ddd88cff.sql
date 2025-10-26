-- Step 1: Drop dependent policies first
DROP POLICY IF EXISTS "Users can view own organization events" ON public.events;
DROP POLICY IF EXISTS "Users can create events for own organization" ON public.events;
DROP POLICY IF EXISTS "Users can update own organization events" ON public.events;
DROP POLICY IF EXISTS "Users can view own organization leaderboards" ON public.leaderboards;

-- Step 2: Create fiestas table
CREATE TABLE IF NOT EXISTS public.fiestas (
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

-- Step 3: Migrate existing events data to fiestas (only if data exists)
INSERT INTO public.fiestas (id, name, description, organization_id, event_date, location, main_hashtag, secondary_hashtags, status, created_at)
SELECT 
  id,
  COALESCE(name, 'Fiesta ' || id::text),
  description,
  organization_id,
  event_date,
  location,
  main_hashtag,
  secondary_hashtags,
  COALESCE(status, 'active'),
  created_at
FROM public.events
WHERE NOT EXISTS (SELECT 1 FROM public.fiestas WHERE fiestas.id = events.id);

-- Step 4: Add fiesta_id to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS fiesta_id UUID;

-- Step 5: Update events with fiesta references
UPDATE public.events SET fiesta_id = id WHERE fiesta_id IS NULL;

-- Step 6: Make fiesta_id a foreign key
ALTER TABLE public.events ADD CONSTRAINT events_fiesta_id_fkey FOREIGN KEY (fiesta_id) REFERENCES public.fiestas(id);

-- Step 7: Drop the organization_id column from events
ALTER TABLE public.events DROP COLUMN IF EXISTS organization_id CASCADE;

-- Step 8: Remove duplicate columns from events
ALTER TABLE public.events DROP COLUMN IF EXISTS name CASCADE;
ALTER TABLE public.events DROP COLUMN IF EXISTS description CASCADE;
ALTER TABLE public.events DROP COLUMN IF EXISTS main_hashtag CASCADE;
ALTER TABLE public.events DROP COLUMN IF EXISTS secondary_hashtags CASCADE;
ALTER TABLE public.events DROP COLUMN IF EXISTS location CASCADE;
ALTER TABLE public.events DROP COLUMN IF EXISTS status CASCADE;

-- Step 9: Enable RLS for fiestas
ALTER TABLE public.fiestas ENABLE ROW LEVEL SECURITY;

-- Step 10: Create RLS policies for fiestas
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

-- Step 11: Create new events policies
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

-- Step 12: Update leaderboards policy
CREATE POLICY "Users can view own organization leaderboards"
ON public.leaderboards
FOR SELECT
USING (event_id IN (
  SELECT e.id
  FROM events e
  JOIN fiestas f ON e.fiesta_id = f.id
  JOIN organizations o ON f.organization_id = o.id
  WHERE o.created_by = auth.uid()
));

-- Step 13: Simplify organizations table
ALTER TABLE public.organizations DROP COLUMN IF EXISTS parent_organization_id CASCADE;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS organization_type CASCADE;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS is_main_account CASCADE;