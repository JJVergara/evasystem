import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { EnhancedInstagramSettings } from '@/components/Settings/EnhancedInstagramSettings';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { EMOJIS } from '@/constants';

import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';

export default function SettingsContent() {
  const { organization, refreshOrganization, updateOrganization } = useCurrentOrganization();
  const {
    settings,
    loading: settingsLoading,
    saving,
    updateGeneralSettings,
    updateNotificationSettings,
    updatePermissionSettings,
    updateAppearanceSettings,
  } = useOrganizationSettings();

  const [orgName, setOrgName] = useState<string>(organization?.name || '');
  const [orgDescription, setOrgDescription] = useState<string>(organization?.description || '');
  const [orgLogoUrl, setOrgLogoUrl] = useState<string>(organization?.logo_url || '');

  useEffect(() => {
    setOrgName(organization?.name || '');
    setOrgDescription(organization?.description || '');
    setOrgLogoUrl(organization?.logo_url || '');
  }, [organization?.name, organization?.description, organization?.logo_url]);

  const handleSaveOrganization = async () => {
    const success = await updateOrganization({
      name: orgName,
      description: orgDescription,
      logo_url: orgLogoUrl,
    });
    if (success) {
      refreshOrganization?.();
    }
  };
  useEffect(() => {
    let isMounted = true;
    let hasRefreshed = false;

    const refresh = () => {
      if (isMounted && refreshOrganization && !hasRefreshed) {
        hasRefreshed = true;
        refreshOrganization();
      }
    };

    const params = new URLSearchParams(window.location.search);
    const hasOAuthParams = params.has('status') || params.has('ig') || params.has('instagram');

    if (hasOAuthParams) {
      const url = new URL(window.location.href);
      url.searchParams.delete('status');
      url.searchParams.delete('ig');
      url.searchParams.delete('instagram');
      window.history.replaceState({}, '', url.toString());

      refresh();
    }

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-lg">Cargando configuraciones...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-gradient">Configuraciones</h1>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex min-w-full sm:grid sm:grid-cols-5 sm:w-full">
            <TabsTrigger value="general" className="flex items-center gap-2 shrink-0">
              <span>{EMOJIS.entities.organization}</span>
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="instagram" className="flex items-center gap-2 shrink-0">
              <img src="/instagram-icon.webp" alt="Instagram" className="w-4 h-4" />
              <span className="hidden sm:inline">Instagram</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 shrink-0">
              <span>{EMOJIS.navigation.notifications}</span>
              <span className="hidden sm:inline">Notificaciones</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2 shrink-0">
              <span>{EMOJIS.ui.security}</span>
              <span className="hidden sm:inline">Permisos</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2 shrink-0">
              <span>🎨</span>
              <span className="hidden sm:inline">Apariencia</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>{EMOJIS.entities.organization}</span>
                Configuración General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orgName">Nombre de la Organización</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Mi Organización"
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Zona Horaria</Label>
                  <Select
                    value={settings.general_settings.timezone}
                    onValueChange={(value) => updateGeneralSettings({ timezone: value })}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Santiago">Santiago (GMT-3)</SelectItem>
                      <SelectItem value="America/Buenos_Aires">Buenos Aires (GMT-3)</SelectItem>
                      <SelectItem value="America/Lima">Lima (GMT-5)</SelectItem>
                      <SelectItem value="America/Bogota">Bogotá (GMT-5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  placeholder="Describe tu organización..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="logoUrl">URL del Logo</Label>
                <div className="flex gap-2">
                  <Input
                    id="logoUrl"
                    value={orgLogoUrl}
                    onChange={(e) => setOrgLogoUrl(e.target.value)}
                    placeholder="https://ejemplo.com/logo.png"
                  />
                  <Button variant="outline">
                    <span>{EMOJIS.actions.upload}</span>
                  </Button>
                </div>
              </div>

              <Button onClick={handleSaveOrganization}>Guardar Cambios</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instagram" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <img src="/instagram-icon.webp" alt="Instagram" className="w-5 h-5" />
                Conexión de Instagram
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedInstagramSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>{EMOJIS.navigation.notifications}</span>
                Preferencias de Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificaciones por Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Recibir notificaciones importantes por email
                    </p>
                  </div>
                  <Switch
                    checked={settings.notification_settings.email_notifications}
                    onCheckedChange={(checked) =>
                      updateNotificationSettings({ email_notifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificaciones Push</Label>
                    <p className="text-sm text-muted-foreground">
                      Recibir notificaciones en tiempo real
                    </p>
                  </div>
                  <Switch
                    checked={settings.notification_settings.push_notifications}
                    onCheckedChange={(checked) =>
                      updateNotificationSettings({ push_notifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Alertas de Expiración de Token</Label>
                    <p className="text-sm text-muted-foreground">
                      Avisar cuando el token de Instagram esté por expirar
                    </p>
                  </div>
                  <Switch
                    checked={settings.notification_settings.token_expiry_alerts}
                    onCheckedChange={(checked) =>
                      updateNotificationSettings({ token_expiry_alerts: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Reportes Semanales</Label>
                    <p className="text-sm text-muted-foreground">
                      Recibir resumen semanal de actividad
                    </p>
                  </div>
                  <Switch
                    checked={settings.notification_settings.weekly_reports}
                    onCheckedChange={(checked) =>
                      updateNotificationSettings({ weekly_reports: checked })
                    }
                  />
                </div>
              </div>

              <Button onClick={() => updateNotificationSettings({})} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Preferencias'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>{EMOJIS.ui.security}</span>
                Configuración de Permisos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-registro de Embajadores</Label>
                    <p className="text-sm text-muted-foreground">
                      Permitir que los embajadores se registren automáticamente
                    </p>
                  </div>
                  <Switch
                    checked={settings.permission_settings.allow_ambassador_self_registration}
                    onCheckedChange={(checked) =>
                      updatePermissionSettings({ allow_ambassador_self_registration: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Aprobación Manual de Tareas</Label>
                    <p className="text-sm text-muted-foreground">
                      Requerir aprobación manual para completar tareas
                    </p>
                  </div>
                  <Switch
                    checked={settings.permission_settings.require_approval_for_tasks}
                    onCheckedChange={(checked) =>
                      updatePermissionSettings({ require_approval_for_tasks: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Validación Automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Validar tareas automáticamente después de 24 horas
                    </p>
                  </div>
                  <Switch
                    checked={settings.permission_settings.auto_validate_tasks}
                    onCheckedChange={(checked) =>
                      updatePermissionSettings({ auto_validate_tasks: checked })
                    }
                  />
                </div>
              </div>

              <Button onClick={() => updatePermissionSettings({})} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Permisos'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🎨</span>
                Configuración de Apariencia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="theme">Tema</Label>
                  <Select
                    value={settings.appearance_settings.theme}
                    onValueChange={(value) => updateAppearanceSettings({ theme: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Oscuro</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="language">Idioma</Label>
                  <Select
                    value={settings.general_settings.language}
                    onValueChange={(value) => updateGeneralSettings({ language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="pt">Português</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Modo Compacto</Label>
                  <p className="text-sm text-muted-foreground">
                    Usar un diseño más compacto para la interfaz
                  </p>
                </div>
                <Switch
                  checked={settings.appearance_settings.compact_mode}
                  onCheckedChange={(checked) => updateAppearanceSettings({ compact_mode: checked })}
                />
              </div>

              <Button onClick={() => updateAppearanceSettings({})} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Apariencia'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
