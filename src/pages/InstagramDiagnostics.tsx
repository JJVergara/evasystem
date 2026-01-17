import { PageHeader } from '@/components/Layout/PageHeader';
import { InstagramDiagnosticsPanel } from '@/components/Settings/InstagramDiagnosticsPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw } from 'lucide-react';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { useInstagramConnection } from '@/hooks/useInstagramConnection';
import { useInstagramSync } from '@/hooks/useInstagramSync';
import type { SystemCheck } from '@/hooks/useSystemChecks';
import { useSystemChecks } from '@/hooks/useSystemChecks';
import { toast } from 'sonner';

export default function InstagramDiagnostics() {
  const { organization } = useCurrentOrganization();
  const { isConnected, refreshTokenStatus } = useInstagramConnection();
  const { isSyncing, syncInstagramData, refreshToken } = useInstagramSync();
  const { systemChecks, isLoading, isFetching, refreshSystemChecks, invalidateSystemChecks } =
    useSystemChecks();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <span className="text-xl text-success">✅</span>;
      case 'warning':
        return <span className="text-xl text-warning">⚠️</span>;
      case 'error':
        return <span className="text-xl text-destructive">❌</span>;
      default:
        return <span className="text-xl text-muted-foreground">📊</span>;
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' => {
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
      case 'Sincronizar ahora':
        await syncInstagramData();
        invalidateSystemChecks();
        break;
      case 'Renovar token':
        await refreshToken();
        await refreshTokenStatus();
        invalidateSystemChecks();
        break;
      default:
        toast.info(`Acción: ${check.action}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diagnósticos de Instagram"
        description="Herramientas avanzadas para diagnosticar y solucionar problemas de integración con Instagram"
        emoji="🔧"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🗄️</span>
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
                {isLoading
                  ? 'Cargando diagnósticos...'
                  : systemChecks.length > 0
                    ? `${systemChecks.filter((c) => c.status === 'success').length}/${systemChecks.length} componentes funcionando`
                    : 'Sin diagnósticos disponibles'}
              </span>
            </div>
            <Button onClick={refreshSystemChecks} disabled={isFetching} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>

          {systemChecks.length > 0 && (
            <div className="space-y-3">
              {systemChecks.map((check, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg bg-background/50"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="shrink-0">{getStatusIcon(check.status)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{check.name}</p>
                        <Badge variant={getStatusVariant(check.status)} className="text-xs">
                          {check.status === 'success'
                            ? 'OK'
                            : check.status === 'warning'
                              ? 'Advertencia'
                              : 'Error'}
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
                      disabled={isSyncing || isFetching}
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

      {isConnected && <InstagramDiagnosticsPanel />}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>⚡</span>
            Acciones Rápidas
          </CardTitle>
          <CardDescription>Herramientas comunes para solucionar problemas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Button
              onClick={() => refreshTokenStatus()}
              variant="outline"
              className="h-auto p-3 sm:p-4 flex flex-col items-start gap-2"
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
              <img src="/instagram-icon.webp" alt="Instagram" className="w-5 h-5" />
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
              <span className="text-xl">⚙️</span>
              <div className="text-left">
                <div className="font-medium">Configuración</div>
                <div className="text-sm text-muted-foreground">Ir a configuración de Instagram</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🌐</span>
            Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
            <div>
              <strong>Webhook URL:</strong>
              <code className="block mt-1 p-2 bg-muted rounded text-xs break-all">
                https://awpfslcepylnipaolmvv.supabase.co/functions/v1/instagram-webhook
              </code>
            </div>
            <div>
              <strong>Función de Sincronización:</strong>
              <code className="block mt-1 p-2 bg-muted rounded text-xs">instagram-sync</code>
            </div>
            <div>
              <strong>Función de Diagnósticos:</strong>
              <code className="block mt-1 p-2 bg-muted rounded text-xs">instagram-diagnostics</code>
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
  );
}
