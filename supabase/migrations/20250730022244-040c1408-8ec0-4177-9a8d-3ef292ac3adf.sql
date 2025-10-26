-- Create enum types for new functionality
CREATE TYPE public.event_type AS ENUM ('lanzamiento', 'feria', 'campaña_digital', 'activacion', 'otro');
CREATE TYPE public.checklist_status AS ENUM ('pending', 'in_progress', 'done');
CREATE TYPE public.user_role_extended AS ENUM ('admin', 'rrpp', 'cliente_viewer');

-- Create event_phases table
CREATE TABLE public.event_phases (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL,
    name TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_checklists table
CREATE TABLE public.event_checklists (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL,
    description TEXT NOT NULL,
    assigned_to UUID,
    status checklist_status NOT NULL DEFAULT 'pending',
    deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to events table
ALTER TABLE public.events 
ADD COLUMN budget_estimate NUMERIC,
ADD COLUMN objective TEXT,
ADD COLUMN client_name TEXT,
ADD COLUMN event_type event_type DEFAULT 'otro';

-- Add new columns to notifications table
ALTER TABLE public.notifications 
ADD COLUMN seen_at TIMESTAMP WITH TIME ZONE;

-- Add new columns to embassadors table
ALTER TABLE public.embassadors 
ADD COLUMN last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Enable RLS on new tables
ALTER TABLE public.event_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_checklists ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for event_phases
CREATE POLICY "Users can view org event phases" 
ON public.event_phases 
FOR SELECT 
USING (event_id IN (
    SELECT e.id 
    FROM events e 
    JOIN users u ON e.organization_id = u.organization_id 
    WHERE u.auth_user_id = auth.uid()
));

CREATE POLICY "Users can manage event phases" 
ON public.event_phases 
FOR ALL 
USING (event_id IN (
    SELECT e.id 
    FROM events e 
    JOIN users u ON e.organization_id = u.organization_id 
    WHERE u.auth_user_id = auth.uid()
));

-- Create RLS policies for event_checklists
CREATE POLICY "Users can view org event checklists" 
ON public.event_checklists 
FOR SELECT 
USING (event_id IN (
    SELECT e.id 
    FROM events e 
    JOIN users u ON e.organization_id = u.organization_id 
    WHERE u.auth_user_id = auth.uid()
));

CREATE POLICY "Users can manage event checklists" 
ON public.event_checklists 
FOR ALL 
USING (event_id IN (
    SELECT e.id 
    FROM events e 
    JOIN users u ON e.organization_id = u.organization_id 
    WHERE u.auth_user_id = auth.uid()
));

-- Create triggers for updated_at columns
CREATE TRIGGER update_event_phases_updated_at
    BEFORE UPDATE ON public.event_phases
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_checklists_updated_at
    BEFORE UPDATE ON public.event_checklists
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_event_phases_event_id ON public.event_phases(event_id);
CREATE INDEX idx_event_phases_dates ON public.event_phases(start_date, end_date);
CREATE INDEX idx_event_checklists_event_id ON public.event_checklists(event_id);
CREATE INDEX idx_event_checklists_assigned_to ON public.event_checklists(assigned_to);
CREATE INDEX idx_event_checklists_status ON public.event_checklists(status);
CREATE INDEX idx_notifications_seen_at ON public.notifications(seen_at);
CREATE INDEX idx_embassadors_last_activity ON public.embassadors(last_activity_at);