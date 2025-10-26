-- Create organization_settings table for persistent configuration
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  
  -- General Settings
  general_settings JSONB DEFAULT '{
    "timezone": "America/Santiago",
    "language": "es",
    "logo_url": null,
    "description": null
  }'::jsonb,
  
  -- Instagram Settings
  instagram_settings JSONB DEFAULT '{
    "auto_sync": true,
    "sync_interval": "hourly",
    "auto_validate_tasks": false,
    "story_validation_24h": true
  }'::jsonb,
  
  -- Notification Settings
  notification_settings JSONB DEFAULT '{
    "email_notifications": true,
    "push_notifications": true,
    "token_expiry_alerts": true,
    "weekly_reports": false
  }'::jsonb,
  
  -- Permission Settings
  permission_settings JSONB DEFAULT '{
    "allow_ambassador_self_registration": false,
    "require_approval_for_tasks": true,
    "auto_validate_tasks": false
  }'::jsonb,
  
  -- Appearance Settings
  appearance_settings JSONB DEFAULT '{
    "theme": "system",
    "compact_mode": false
  }'::jsonb,
  
  -- Integration Settings
  integration_settings JSONB DEFAULT '{
    "google_drive_enabled": false,
    "zapier_enabled": false,
    "n8n_webhook_url": null
  }'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT fk_organization_settings_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT unique_organization_settings 
    UNIQUE (organization_id)
);

-- Enable RLS
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own organization settings" 
ON public.organization_settings 
FOR SELECT 
USING (organization_id IN (
  SELECT id FROM organizations WHERE created_by = auth.uid()
));

CREATE POLICY "Users can create settings for own organization" 
ON public.organization_settings 
FOR INSERT 
WITH CHECK (organization_id IN (
  SELECT id FROM organizations WHERE created_by = auth.uid()
));

CREATE POLICY "Users can update own organization settings" 
ON public.organization_settings 
FOR UPDATE 
USING (organization_id IN (
  SELECT id FROM organizations WHERE created_by = auth.uid()
));

-- Function to update timestamp
CREATE OR REPLACE FUNCTION public.update_organization_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
CREATE TRIGGER update_organization_settings_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_organization_settings_updated_at();

-- Create default settings for existing organizations
INSERT INTO public.organization_settings (organization_id)
SELECT id FROM public.organizations
WHERE id NOT IN (SELECT organization_id FROM public.organization_settings);

-- Update embassadors table to exclude deleted ones from default queries
CREATE INDEX IF NOT EXISTS idx_embassadors_status ON public.embassadors(status);
CREATE INDEX IF NOT EXISTS idx_embassadors_organization_id ON public.embassadors(organization_id);