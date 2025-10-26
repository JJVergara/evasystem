import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrganization } from "./useCurrentOrganization";
import { toast } from "sonner";

interface OrganizationSettings {
  general_settings: {
    timezone: string;
    language: string;
    logo_url?: string;
    description?: string;
  };
  instagram_settings: {
    auto_sync: boolean;
    sync_interval: string;
    auto_validate_tasks: boolean;
    story_validation_24h: boolean;
  };
  notification_settings: {
    email_notifications: boolean;
    push_notifications: boolean;
    token_expiry_alerts: boolean;
    weekly_reports: boolean;
  };
  permission_settings: {
    allow_ambassador_self_registration: boolean;
    require_approval_for_tasks: boolean;
    auto_validate_tasks: boolean;
  };
  appearance_settings: {
    theme: string;
    compact_mode: boolean;
  };
  integration_settings: {
    google_drive_enabled: boolean;
    zapier_enabled: boolean;
    n8n_webhook_url?: string;
  };
}

const defaultSettings: OrganizationSettings = {
  general_settings: {
    timezone: "America/Santiago",
    language: "es",
    logo_url: undefined,
    description: undefined
  },
  instagram_settings: {
    auto_sync: true,
    sync_interval: "hourly",
    auto_validate_tasks: false,
    story_validation_24h: true
  },
  notification_settings: {
    email_notifications: true,
    push_notifications: true,
    token_expiry_alerts: true,
    weekly_reports: false
  },
  permission_settings: {
    allow_ambassador_self_registration: false,
    require_approval_for_tasks: true,
    auto_validate_tasks: false
  },
  appearance_settings: {
    theme: "system",
    compact_mode: false
  },
  integration_settings: {
    google_drive_enabled: false,
    zapier_enabled: false,
    n8n_webhook_url: undefined
  }
};

export function useOrganizationSettings() {
  const { organization } = useCurrentOrganization();
  const [settings, setSettings] = useState<OrganizationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (organization?.id) {
      loadSettings();
    }
  }, [organization?.id]);

  const loadSettings = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('organization_settings')
        .select('id, organization_id, general_settings, appearance_settings, notification_settings, instagram_settings, integration_settings, permission_settings, created_at, updated_at')
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const generalSettings = data.general_settings as any || {};
        const instagramSettings = data.instagram_settings as any || {};
        const notificationSettings = data.notification_settings as any || {};
        const permissionSettings = data.permission_settings as any || {};
        const appearanceSettings = data.appearance_settings as any || {};
        const integrationSettings = data.integration_settings as any || {};
        
        const mergedSettings: OrganizationSettings = {
          general_settings: { ...defaultSettings.general_settings, ...generalSettings },
          instagram_settings: { ...defaultSettings.instagram_settings, ...instagramSettings },
          notification_settings: { ...defaultSettings.notification_settings, ...notificationSettings },
          permission_settings: { ...defaultSettings.permission_settings, ...permissionSettings },
          appearance_settings: { ...defaultSettings.appearance_settings, ...appearanceSettings },
          integration_settings: { ...defaultSettings.integration_settings, ...integrationSettings }
        };
        setSettings(mergedSettings);
      } else {
        // Create default settings if none exist
        await createDefaultSettings();
      }
    } catch (error) {
      console.error('Error loading organization settings:', error);
      toast.error('Error al cargar configuraciones');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    if (!organization?.id) return;

    try {
      const { error } = await supabase
        .from('organization_settings')
        .insert({
          organization_id: organization.id,
          general_settings: defaultSettings.general_settings,
          instagram_settings: defaultSettings.instagram_settings,
          notification_settings: defaultSettings.notification_settings,
          permission_settings: defaultSettings.permission_settings,
          appearance_settings: defaultSettings.appearance_settings,
          integration_settings: defaultSettings.integration_settings
        });

      if (error) throw error;
      
      setSettings(defaultSettings);
    } catch (error) {
      console.error('Error creating default settings:', error);
    }
  };

  const updateSettings = async (section: keyof OrganizationSettings, newSettings: any) => {
    if (!organization?.id) return;

    try {
      setSaving(true);

      const updatedSettings = {
        ...settings,
        [section]: { ...settings[section], ...newSettings }
      };

      const { error } = await supabase
        .from('organization_settings')
        .update({ [section]: updatedSettings[section] })
        .eq('organization_id', organization.id);

      if (error) throw error;

      setSettings(updatedSettings);
      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const updateGeneralSettings = (newSettings: Partial<OrganizationSettings['general_settings']>) => {
    return updateSettings('general_settings', newSettings);
  };

  const updateInstagramSettings = (newSettings: Partial<OrganizationSettings['instagram_settings']>) => {
    return updateSettings('instagram_settings', newSettings);
  };

  const updateNotificationSettings = (newSettings: Partial<OrganizationSettings['notification_settings']>) => {
    return updateSettings('notification_settings', newSettings);
  };

  const updatePermissionSettings = (newSettings: Partial<OrganizationSettings['permission_settings']>) => {
    return updateSettings('permission_settings', newSettings);
  };

  const updateAppearanceSettings = (newSettings: Partial<OrganizationSettings['appearance_settings']>) => {
    return updateSettings('appearance_settings', newSettings);
  };

  const updateIntegrationSettings = (newSettings: Partial<OrganizationSettings['integration_settings']>) => {
    return updateSettings('integration_settings', newSettings);
  };

  return {
    settings,
    loading,
    saving,
    updateGeneralSettings,
    updateInstagramSettings,
    updateNotificationSettings,
    updatePermissionSettings,
    updateAppearanceSettings,
    updateIntegrationSettings,
    refreshSettings: loadSettings
  };
}