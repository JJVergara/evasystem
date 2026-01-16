import { useCallback, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrganization } from './useCurrentOrganization';
import { toast } from 'sonner';

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
    timezone: 'America/Santiago',
    language: 'es',
    logo_url: undefined,
    description: undefined,
  },
  instagram_settings: {
    auto_sync: true,
    sync_interval: 'hourly',
    auto_validate_tasks: false,
    story_validation_24h: true,
  },
  notification_settings: {
    email_notifications: true,
    push_notifications: true,
    token_expiry_alerts: true,
    weekly_reports: false,
  },
  permission_settings: {
    allow_ambassador_self_registration: false,
    require_approval_for_tasks: true,
    auto_validate_tasks: false,
  },
  appearance_settings: {
    theme: 'system',
    compact_mode: false,
  },
  integration_settings: {
    google_drive_enabled: false,
    zapier_enabled: false,
    n8n_webhook_url: undefined,
  },
};

interface SettingsRow {
  general_settings: Record<string, unknown> | null;
  instagram_settings: Record<string, unknown> | null;
  notification_settings: Record<string, unknown> | null;
  permission_settings: Record<string, unknown> | null;
  appearance_settings: Record<string, unknown> | null;
  integration_settings: Record<string, unknown> | null;
}

async function fetchOrganizationSettingsData(
  organizationId: string
): Promise<OrganizationSettings> {
  const { data, error } = await supabase
    .from('organization_settings')
    .select(
      'id, organization_id, general_settings, appearance_settings, notification_settings, instagram_settings, integration_settings, permission_settings, created_at, updated_at'
    )
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    const generalSettings = (data.general_settings as Record<string, unknown>) || {};
    const instagramSettings = (data.instagram_settings as Record<string, unknown>) || {};
    const notificationSettings = (data.notification_settings as Record<string, unknown>) || {};
    const permissionSettings = (data.permission_settings as Record<string, unknown>) || {};
    const appearanceSettings = (data.appearance_settings as Record<string, unknown>) || {};
    const integrationSettings = (data.integration_settings as Record<string, unknown>) || {};

    return {
      general_settings: {
        ...defaultSettings.general_settings,
        ...generalSettings,
      } as OrganizationSettings['general_settings'],
      instagram_settings: {
        ...defaultSettings.instagram_settings,
        ...instagramSettings,
      } as OrganizationSettings['instagram_settings'],
      notification_settings: {
        ...defaultSettings.notification_settings,
        ...notificationSettings,
      } as OrganizationSettings['notification_settings'],
      permission_settings: {
        ...defaultSettings.permission_settings,
        ...permissionSettings,
      } as OrganizationSettings['permission_settings'],
      appearance_settings: {
        ...defaultSettings.appearance_settings,
        ...appearanceSettings,
      } as OrganizationSettings['appearance_settings'],
      integration_settings: {
        ...defaultSettings.integration_settings,
        ...integrationSettings,
      } as OrganizationSettings['integration_settings'],
    };
  }

  const { error: insertError } = await supabase.from('organization_settings').insert({
    organization_id: organizationId,
    general_settings: defaultSettings.general_settings,
    instagram_settings: defaultSettings.instagram_settings,
    notification_settings: defaultSettings.notification_settings,
    permission_settings: defaultSettings.permission_settings,
    appearance_settings: defaultSettings.appearance_settings,
    integration_settings: defaultSettings.integration_settings,
  });

  if (insertError) {
    console.error('Error creating default settings:', insertError);
  }

  return defaultSettings;
}

export function useOrganizationSettings() {
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const queryKey = ['organizationSettings', organization?.id];

  const {
    data: settings,
    isLoading: settingsLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => fetchOrganizationSettingsData(organization!.id),
    enabled: !!organization?.id,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async ({
      section,
      newSettings,
    }: {
      section: keyof OrganizationSettings;
      newSettings: Record<string, unknown>;
    }) => {
      const currentSettings = settings || defaultSettings;
      const updatedSectionSettings = { ...currentSettings[section], ...newSettings };

      const { error } = await supabase
        .from('organization_settings')
        .update({ [section]: updatedSectionSettings })
        .eq('organization_id', organization!.id);

      if (error) throw error;
      return { section, updatedSectionSettings };
    },
    onMutate: () => {
      setSaving(true);
    },
    onSuccess: ({ section, updatedSectionSettings }) => {
      queryClient.setQueryData<OrganizationSettings>(queryKey, (old) => {
        if (!old) return defaultSettings;
        return {
          ...old,
          [section]: updatedSectionSettings,
        };
      });
      toast.success('Configuracion guardada exitosamente');
    },
    onError: () => {
      toast.error('Error al guardar configuracion');
    },
    onSettled: () => {
      setSaving(false);
    },
  });

  const updateSettings = useCallback(
    async (section: keyof OrganizationSettings, newSettings: Record<string, unknown>) => {
      return updateSettingsMutation.mutateAsync({ section, newSettings });
    },
    [updateSettingsMutation]
  );

  const updateGeneralSettings = useCallback(
    (newSettings: Partial<OrganizationSettings['general_settings']>) => {
      return updateSettings('general_settings', newSettings as Record<string, unknown>);
    },
    [updateSettings]
  );

  const updateInstagramSettings = useCallback(
    (newSettings: Partial<OrganizationSettings['instagram_settings']>) => {
      return updateSettings('instagram_settings', newSettings as Record<string, unknown>);
    },
    [updateSettings]
  );

  const updateNotificationSettings = useCallback(
    (newSettings: Partial<OrganizationSettings['notification_settings']>) => {
      return updateSettings('notification_settings', newSettings as Record<string, unknown>);
    },
    [updateSettings]
  );

  const updatePermissionSettings = useCallback(
    (newSettings: Partial<OrganizationSettings['permission_settings']>) => {
      return updateSettings('permission_settings', newSettings as Record<string, unknown>);
    },
    [updateSettings]
  );

  const updateAppearanceSettings = useCallback(
    (newSettings: Partial<OrganizationSettings['appearance_settings']>) => {
      return updateSettings('appearance_settings', newSettings as Record<string, unknown>);
    },
    [updateSettings]
  );

  const updateIntegrationSettings = useCallback(
    (newSettings: Partial<OrganizationSettings['integration_settings']>) => {
      return updateSettings('integration_settings', newSettings as Record<string, unknown>);
    },
    [updateSettings]
  );

  const refreshSettings = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const loading = orgLoading || (!!organization?.id && settingsLoading);

  return {
    settings: settings || defaultSettings,
    loading,
    saving,
    updateGeneralSettings,
    updateInstagramSettings,
    updateNotificationSettings,
    updatePermissionSettings,
    updateAppearanceSettings,
    updateIntegrationSettings,
    refreshSettings,
  };
}
