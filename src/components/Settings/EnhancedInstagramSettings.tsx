import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Instagram, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  Activity,
  Zap,
  Eye,
  Link2,
  Clock,
  AlertTriangle,
  Info
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInstagramConnection } from "@/hooks/useInstagramConnection";
import { useInstagramSync } from "@/hooks/useInstagramSync";
import { useInstagramDiagnostics } from "@/hooks/useInstagramDiagnostics";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { InstagramConfigChecklist } from "./InstagramConfigChecklist";
import { MetaAppCredentialsForm } from "./MetaAppCredentialsForm";
import { InstagramDiagnosticsPanel } from "./InstagramDiagnosticsPanel";

export function EnhancedInstagramSettings() {
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const { isConnected, isTokenExpired, isConnecting, connectInstagram, disconnectInstagram, refreshTokenStatus } = useInstagramConnection();
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const { isSyncing, syncInstagramData, refreshToken } = useInstagramSync();
  const { 
    isRunning: isDiagnosticRunning, 
    connectionTests, 
    webhookStatus, 
    runConnectionTests, 
    testWebhookDelivery 
  } = useInstagramDiagnostics();

  // Safe data access with null checks
  const instagramUsername = organization?.instagram_username || null;
  const lastSync = organization?.last_instagram_sync || null;
  const businessAccountId = organization?.instagram_business_account_id || null;
  const facebookPageId = organization?.facebook_page_id || null;

  const getStatusInfo = () => {
    if (!isConnected) {
      return {
        status: 'Desconectado',
        variant: 'destructive' as const,
        icon: <AlertCircle className="h-4 w-4" />,
        description: 'Instagram no estáก conectado a tu organización'
      };
    }
    
    if (isTokenExpired) {
      return {
        status: 'Token Expirado',
        variant: 'destructive' as const,
        icon: <AlertCircle className="h-4 w-4" />,
        description: 'El token de acceso ha expirado y necesita ser renovado'
      };
    }
    
    return {
      status: 'Conectado',
      variant: 'default' as const,
      icon: <CheckCircle className="h-4 w-4" />,
      description: 'Instagram estáก conectado y funcionando correctamente'
    };
  };

  const statusInfo = getStatusInfo();

  const getTestIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getWebhookStatusBadge = () => {
    if (!webhookStatus) return null;
    
    if (webhookStatus.configured && webhookStatus.reachable) {
      return <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Activo
      </Badge>;
    } else if (webhookStatus.configured) {
      return <Badge variant="secondary" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Configurado
      </Badge>;
    } else {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        No configurado
      </Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Checklist */}
      <InstagramConfigChecklist 
        onOpenCredentials={() => setShowCredentialsModal(true)}
      />
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5" />
            Estado de Conexión
          </CardTitle>
          <CardDescription>
            Conecta tu cuenta de Instagram para sincronizar historias y gestionar embajadores automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                  {statusInfo.icon}
                  {statusInfo.status}
                </Badge>
                {instagramUsername && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Instagram className="h-3 w-3" />
                    @{instagramUsername}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground break-words">
                {statusInfo.description}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {isConnected ? (
            <>
              {isTokenExpired ? (
                <Button
                  onClick={refreshToken}
                  disabled={isSyncing}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  Renovar Token
                </Button>
              ) : (
                <Button
                  onClick={syncInstagramData}
                  disabled={isSyncing}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sincronizar
                </Button>
              )}
              
              <Button
                onClick={refreshTokenStatus}
                disabled={isConnecting}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isConnecting ? 'animate-spin' : ''}`} />
                Actualizar Estado
              </Button>
              
              <Button
                onClick={disconnectInstagram}
                disabled={isConnecting}
                variant="destructive"
                size="sm"
                className="w-full sm:w-auto"
              >
                Desconectar
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => connectInstagram(() => setShowCredentialsModal(true))}
                disabled={isConnecting || orgLoading || !organization}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <Instagram className="h-4 w-4" />
                <span className="truncate">
                  {orgLoading ? 'Cargando organización...' : 
                   !organization ? 'Preparando...' :
                   isConnecting ? 'Conectando...' : 'Conectar Instagram'}
                </span>
              </Button>
              <Button
                onClick={refreshTokenStatus}
                disabled={isConnecting}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isConnecting ? 'animate-spin' : ''}`} />
                Actualizar Estado
              </Button>
            </>
          )}
            </div>
          </div>

          {/* OAuth completion hint */}
          {!isConnected && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
              <Info className="h-4 w-4" />
              <span>Si acabas de conectar Instagram, pulsa "Actualizar Estado" para ver el cambio</span>
            </div>
          )}

          {isConnected && lastSync && (
            <div className="text-sm text-muted-foreground">
              última sincronización: {new Date(lastSync).toLocaleString('es-ES')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Information Card */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Información de la Cuenta
            </CardTitle>
            <CardDescription>
              Detalles de la cuenta de Instagram conectada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Estado del Token</span>
                  <Badge variant={isTokenExpired ? "destructive" : "success"}>
                    {isTokenExpired ? "Expirado" : "Válido"}
                  </Badge>
                </div>
                {instagramUsername && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Usuario:</span>
                    <span className="text-sm break-all">@{instagramUsername}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {businessAccountId && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Cuenta Business:</span>
                    <span className="text-sm text-green-600">Conectada</span>
                  </div>
                )}
                {facebookPageId && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Página Facebook:</span>
                    <span className="text-sm text-green-600">Vinculada</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Diagnostics Panel */}
      {isConnected && (
        <InstagramDiagnosticsPanel />
      )}

      {/* Webhook Configuration Card - Moved inline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Configuración de Webhooks
          </CardTitle>
          <CardDescription>
            URLs y tokens necesarios para Meta Developer Console
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Callback URL:</label>
            <code className="block p-2 bg-muted rounded text-xs">
              https://awpfslcepylnipaolmvv.supabase.co/functions/v1/instagram-webhook
            </code>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Verify Token:</label>
            <code className="block p-2 bg-muted rounded text-xs">
              EVA_WEBHOOK_VERIFY_2024
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Status Card */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Estado del Webhook en Tiempo Real
            </CardTitle>
            <CardDescription>
              Monitorea la actividad de los webhooks de Instagram
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Estado:</span>
                  {getWebhookStatusBadge()}
                </div>
                {webhookStatus?.lastEvent && (
                  <div className="text-sm text-muted-foreground">
                    último evento: {webhookStatus.lastEvent}
                  </div>
                )}
              </div>
            </div>

            {webhookStatus?.errors && webhookStatus.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  Errores Detectados
                </div>
                <div className="space-y-1">
                  {webhookStatus.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Meta App Credentials Modal */}
      <MetaAppCredentialsForm 
        isOpen={showCredentialsModal}
        onClose={() => setShowCredentialsModal(false)}
        onCredentialsSaved={() => {
          setShowCredentialsModal(false);
          toast.success('Credenciales guardadas. Ahora puedes conectar Instagram.');
        }}
      />
    </div>
  );
}