
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Instagram, AlertCircle, CheckCircle, RefreshCw, Settings, BookOpen, Activity, Play, Copy, ExternalLink, Info, Calendar } from "lucide-react";
import { useInstagramConnection } from "@/hooks/useInstagramConnection";
import { useInstagramSync } from "@/hooks/useInstagramSync";
import { useInstagramDiagnostics } from "@/hooks/useInstagramDiagnostics";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { MetaAppCredentialsForm } from "./MetaAppCredentialsForm";
import { InstagramConfigGuide } from "./InstagramConfigGuide";
import { TokenExpiryWarning } from "@/components/Instagram/TokenExpiryWarning";
import { toast } from "sonner";

export function InstagramSettings() {
  const { organization } = useCurrentOrganization();
  const {
    isConnected,
    isTokenExpired,
    isConnecting,
    connectInstagram,
    disconnectInstagram,
    refreshTokenStatus,
    // Token expiry fields
    tokenExpiryDate,
    daysUntilExpiry,
    needsRefresh,
    showWarning,
    username,
    // Token refresh functionality
    refreshToken: refreshInstagramToken,
    isRefreshingToken
  } = useInstagramConnection();
  const { isSyncing, syncInstagramData, refreshToken } = useInstagramSync();
  const { isRunning, connectionTests, webhookStatus, runConnectionTests, testWebhookDelivery } = useInstagramDiagnostics();
  
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [showConfigGuide, setShowConfigGuide] = useState(false);

  const getStatusInfo = () => {
    if (!isConnected) {
      return {
        status: 'Desconectado',
        variant: 'destructive' as const,
        icon: <AlertCircle className="h-4 w-4" />,
        description: 'Instagram no está conectado a tu organización'
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
      description: 'Instagram está conectado y funcionando correctamente'
    };
  };

  const statusInfo = getStatusInfo();

  const handleModalClose = () => {
    setShowCredentialsForm(false);
    setShowConfigGuide(false);
    refreshTokenStatus(); // Refresh status after closing modals
  };

  // Handle connection with automatic credential check
  const handleConnectClick = () => {
    connectInstagram(() => {
      // This callback opens the credentials form if they're missing
      setShowCredentialsForm(true);
    });
  };

  return (
    <div className="space-y-6">
      {/* Guía y configuración de credenciales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de Meta App
          </CardTitle>
          <CardDescription>
            Cada organización necesita su propia aplicación en Meta Developers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfigGuide(true)}
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Ver Guía Completa
            </Button>
            <Button
              onClick={() => setShowCredentialsForm(true)}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurar Credenciales
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Configuración de Webhooks
          </CardTitle>
          <CardDescription>
            Información necesaria para configurar webhooks en Meta Developer Console
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Callback URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Callback URL:</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-xs font-mono">
                https://awpfslcepylnipaolmvv.supabase.co/functions/v1/instagram-webhook
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText("https://awpfslcepylnipaolmvv.supabase.co/functions/v1/instagram-webhook");
                  toast.success("Callback URL copiado");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Verify Token */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Verify Token:</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-xs font-mono">
                EVA_WEBHOOK_VERIFY_2024
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText("EVA_WEBHOOK_VERIFY_2024");
                  toast.success("Verify Token copiado");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Required Fields */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Campos Requeridos:</label>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline">mentions</Badge>
              <Badge variant="outline">comments</Badge>
              <Badge variant="outline">messages</Badge>
              <Badge variant="outline">story_insights</Badge>
            </div>
          </div>

          <Button
            onClick={() => window.open('https://developers.facebook.com/apps/', '_blank')}
            className="w-full gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir Meta Developer Console
          </Button>
        </CardContent>
      </Card>

      {/* Estado de conexión */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5" />
            Conexión de Instagram
          </CardTitle>
          <CardDescription>
            Estado actual de la integración con Instagram
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                  {statusInfo.icon}
                  {statusInfo.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {statusInfo.description}
              </p>
            </div>
            
            <div className="flex gap-2">
              {isConnected ? (
                <>
                  {isTokenExpired ? (
                    <Button
                      onClick={refreshToken}
                      disabled={isSyncing}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      Renovar Token
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        syncInstagramData();
                        refreshTokenStatus(); // Refresh status after sync
                      }}
                      disabled={isSyncing}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      Sincronizar
                    </Button>
                  )}
                  
                  <Button
                    onClick={disconnectInstagram}
                    disabled={isConnecting}
                    variant="destructive"
                    size="sm"
                  >
                    Desconectar
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleConnectClick}
                  disabled={isConnecting}
                  className="flex items-center gap-2"
                >
                  <Instagram className="h-4 w-4" />
                  {isConnecting ? 'Conectando...' : 'Conectar Instagram'}
                </Button>
              )}
            </div>
          </div>

          {isConnected && organization?.last_instagram_sync && (
            <div className="text-sm text-muted-foreground">
              Última sincronización: {new Date(organization.last_instagram_sync).toLocaleString('es-ES')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Token Expiry Warning */}
      {isConnected && !isTokenExpired && (
        <TokenExpiryWarning
          daysUntilExpiry={daysUntilExpiry}
          showWarning={showWarning}
          needsRefresh={needsRefresh}
          isRefreshingToken={isRefreshingToken}
          onRefresh={() => refreshInstagramToken()}
        />
      )}

      {/* Instagram Diagnostics Panel */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Diagnósticos de Instagram
            </CardTitle>
            <CardDescription>
              Verifica el estado de la conexión y webhooks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={runConnectionTests}
                disabled={isRunning}
                variant="outline"
                className="gap-2"
              >
                <Activity className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
                {isRunning ? 'Ejecutando Tests...' : 'Ejecutar Tests'}
              </Button>
              
              <Button
                onClick={testWebhookDelivery}
                disabled={isRunning || !isConnected}
                variant="outline"
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Test Webhook
              </Button>
            </div>

            {/* Test Results */}
            {connectionTests.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Resultados de Conexión:</h4>
                {connectionTests.map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">{test.name}</span>
                    <div className="flex items-center gap-2">
                      {test.status === 'pending' && (
                        <Badge variant="secondary">Ejecutando...</Badge>
                      )}
                      {test.status === 'success' && (
                        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          OK
                        </Badge>
                      )}
                      {test.status === 'error' && (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Error
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Webhook Status */}
            {webhookStatus && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Estado del Webhook:</h4>
                <div className="p-3 rounded border bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Configurado:</span>
                    <Badge variant={webhookStatus.configured ? "default" : "destructive"}>
                      {webhookStatus.configured ? "Sí" : "No"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Alcanzable:</span>
                    <Badge variant={webhookStatus.reachable ? "default" : "secondary"}>
                      {webhookStatus.reachable ? "Sí" : "Sin eventos recientes"}
                    </Badge>
                  </div>
                  {webhookStatus.lastEvent && (
                    <div className="text-xs text-muted-foreground">
                      Último evento: {new Date(webhookStatus.lastEvent).toLocaleString('es-ES')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Información de la cuenta conectada */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Información de la Cuenta
            </CardTitle>
            <CardDescription>
              Detalles de la cuenta de Instagram conectada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Usuario:</span>
                <span className="text-sm font-mono">
                  @{username || organization?.instagram_username || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Estado del Token:</span>
                <Badge variant={isTokenExpired ? "destructive" : "default"}>
                  {isTokenExpired ? 'Expirado' : 'Válido'}
                </Badge>
              </div>
              {tokenExpiryDate && !isTokenExpired && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Expira:</span>
                  <span className="text-sm">
                    {new Date(tokenExpiryDate).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    {daysUntilExpiry !== null && daysUntilExpiry !== undefined && (
                      <span className="text-muted-foreground ml-1">
                        ({daysUntilExpiry} {daysUntilExpiry === 1 ? 'día' : 'días'})
                      </span>
                    )}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t">
                <Button
                  onClick={() => refreshInstagramToken()}
                  disabled={isRefreshingToken || isTokenExpired}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingToken ? 'animate-spin' : ''}`} />
                  {isRefreshingToken ? 'Renovando...' : 'Renovar Token (+60 días)'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <MetaAppCredentialsForm
        isOpen={showCredentialsForm}
        onClose={handleModalClose}
        onCredentialsSaved={handleModalClose}
      />

      <InstagramConfigGuide
        isOpen={showConfigGuide}
        onClose={() => setShowConfigGuide(false)}
      />
    </div>
  );
}
