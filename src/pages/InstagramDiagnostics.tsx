import { MainLayout } from "@/components/Layout/MainLayout";
import { PageHeader } from "@/components/Layout/PageHeader";
import { InstagramDiagnosticsPanel } from "@/components/Settings/InstagramDiagnosticsPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Instagram, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Activity,
  Settings,
  Database,
  Zap,
  Globe
} from "lucide-react";
import { useState, useEffect } from "react";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { useInstagramConnection } from "@/hooks/useInstagramConnection";
import { useInstagramSync } from "@/hooks/useInstagramSync";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SystemCheck {
  name: string;
  status: 'success' | 'warning' | 'error';
  description: string;
  action?: string;
}

export default function InstagramDiagnostics() {
  const { organization } = useCurrentOrganization();
  const { isConnected, isTokenExpired, refreshTokenStatus } = useInstagramConnection();
  const { isSyncing, syncInstagramData, refreshToken } = useInstagramSync();
  const [systemChecks, setSystemChecks] = useState<SystemCheck[]>([]);
  const [isRunningSystemCheck, setIsRunningSystemCheck] = useState(false);

  useEffect(() => {
    runSystemChecks();
  }, [organization, isConnected, isTokenExpired]);

  const runSystemChecks = async () => {
    if (!organization) return;

    setIsRunningSystemCheck(true);
    const checks: SystemCheck[] = [];

    try {
      // Check 1: Organization setup
      checks.push({
        name: "Organización configurada",
        status: organization ? 'success' : 'error',
        description: organization 
          ? `Organización: ${organization.name}` 
          : "No se encontró organización activa"
      });

      // Check 2: Instagram connection
      checks.push({
        name: "Conexión de Instagram",
        status: isConnected ? 'success' : 'error',
        description: isConnected 
          ? `Conectado como @${organization.instagram_username}` 
          : "Instagram no está conectado",
        action: !isConnected ? "Conectar Instagram" : undefined
      });

      // Check 3: Token status
      if (isConnected) {
        checks.push({
          name: "Estado del token",
          status: isTokenExpired ? 'error' : 'success',
          description: isTokenExpired 
            ? "Token expirado - requiere renovación" 
            : "Token válido y activo",
          action: isTokenExpired ? "Renovar token" : undefined
        });
      }

      // Check 4: Database tables
      const { data: socialMentions, error: mentionsError } = await supabase
        .from('social_mentions')
        .select('id, created_at')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(1);

      checks.push({
        name: "Base de datos",
        status: mentionsError ? 'error' : 'success',
        description: mentionsError 
          ? `Error de base de datos: ${mentionsError.message}`
          : socialMentions && socialMentions.length > 0
            ? `Última actividad: ${new Date(socialMentions[0].created_at).toLocaleString('es-ES')}`
            : "Base de datos operativa - sin actividad reciente"
      });

      // Check 5: Credentials
      const { data: credsStatus } = await supabase
        .rpc('get_org_meta_credentials_status', { 
          p_organization_id: organization.id 
        });

      const hasCredentials = credsStatus && credsStatus.length > 0 && credsStatus[0].has_credentials;

      checks.push({
        name: "Credenciales de Meta App",
        status: hasCredentials ? 'success' : 'warning',
        description: hasCredentials 
          ? "Credenciales configuradas correctamente" 
          : "Credenciales no configuradas o faltantes",
        action: !hasCredentials ? "Configurar credenciales" : undefined
      });

      // Check 6: Recent sync
      const lastSync = organization.last_instagram_sync;
      const syncStatus = lastSync 
        ? new Date(Date.now() - new Date(lastSync).getTime()).getTime() < 24 * 60 * 60 * 1000
        : false;

      checks.push({
        name: "Sincronización reciente",
        status: syncStatus ? 'success' : 'warning',
        description: lastSync 
          ? `Última sincronización: ${new Date(lastSync).toLocaleString('es-ES')}` 
          : "No se ha sincronizado nunca",
        action: "Sincronizar ahora"
      });

    } catch (error) {
      console.error('Error running system checks:', error);
      checks.push({
        name: "Error del sistema",
        status: 'error',
        description: `Error al ejecutar diagnósticos: ${error instanceof Error ? error.message : 'Error desconocido'}`
      });
    }

    setSystemChecks(checks);
    setIsRunningSystemCheck(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'success':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const handleAction = async (check: SystemCheck) => {
    switch (check.action) {
      case "Sincronizar ahora":
        await syncInstagramData();
        await runSystemChecks();
        break;
      case "Renovar token":
        await refreshToken();
        await refreshTokenStatus();
        await runSystemChecks();
        break;
      default:
        toast.info(`Acción: ${check.action}`);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Diagnósticos de Instagram" 
          description="Herramientas avanzadas para diagnosticar y solucionar problemas de integración con Instagram"
        />

        {/* System Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Estado del Sistema
            </CardTitle>
            <CardDescription>
              Verificación automática de todos los componentes del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {systemChecks.length > 0 ? `${systemChecks.filter(c => c.status === 'success').length}/${systemChecks.length} componentes funcionando` : 'Ejecutando diagnósticos...'}
                </span>
              </div>
              <Button 
                onClick={runSystemChecks}
                disabled={isRunningSystemCheck}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRunningSystemCheck ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>

            {systemChecks.length > 0 && (
              <div className="space-y-3">
                {systemChecks.map((check, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg bg-background/50"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(check.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{check.name}</p>
                          <Badge variant={getStatusVariant(check.status)} className="text-xs">
                            {check.status === 'success' ? 'OK' : 
                             check.status === 'warning' ? 'Advertencia' : 'Error'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{check.description}</p>
                      </div>
                    </div>
                    {check.action && (
                      <Button
                        onClick={() => handleAction(check)}
                        size="sm"
                        variant="outline"
                        disabled={isSyncing || isRunningSystemCheck}
                      >
                        {check.action}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Advanced Diagnostics */}
        {isConnected && <InstagramDiagnosticsPanel />}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Acciones Rápidas
            </CardTitle>
            <CardDescription>
              Herramientas comunes para solucionar problemas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button
                onClick={() => refreshTokenStatus()}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Actualizar Estado</div>
                  <div className="text-sm text-muted-foreground">Refresca el estado de conexión</div>
                </div>
              </Button>

              <Button
                onClick={() => syncInstagramData()}
                disabled={isSyncing || !isConnected}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2"
              >
                <Instagram className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Forzar Sincronización</div>
                  <div className="text-sm text-muted-foreground">Sincroniza datos manualmente</div>
                </div>
              </Button>

              <Button
                onClick={() => window.open('/settings', '_blank')}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2"
              >
                <Settings className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Configuración</div>
                  <div className="text-sm text-muted-foreground">Ir a configuración de Instagram</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Información del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Webhook URL:</strong>
                <code className="block mt-1 p-2 bg-muted rounded text-xs break-all">
                  https://awpfslcepylnipaolmvv.supabase.co/functions/v1/instagram-webhook
                </code>
              </div>
              <div>
                <strong>Función de Sincronización:</strong>
                <code className="block mt-1 p-2 bg-muted rounded text-xs">
                  instagram-sync
                </code>
              </div>
              <div>
                <strong>Función de Diagnósticos:</strong>
                <code className="block mt-1 p-2 bg-muted rounded text-xs">
                  instagram-diagnostics
                </code>
              </div>
              <div>
                <strong>Organización ID:</strong>
                <code className="block mt-1 p-2 bg-muted rounded text-xs break-all">
                  {organization?.id || 'No disponible'}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}