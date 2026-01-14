import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Instagram,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Eye,
  AlertTriangle,
  Info,
  ExternalLink,
  Shield,
  Search,
  ChevronDown,
  ChevronUp,
  Calendar
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInstagramConnection } from "@/hooks/useInstagramConnection";
import { useInstagramSync } from "@/hooks/useInstagramSync";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { supabase } from "@/integrations/supabase/client";
import { TokenExpiryWarning } from "@/components/Instagram/TokenExpiryWarning";

interface DiagnosticResult {
  instagram_account: {
    id: string;
    username: string;
    account_type: string;
  };
  token_updated_at: string;
  message: string;
}

export function EnhancedInstagramSettings() {
  const { organization, loading: orgLoading, refreshOrganization } = useCurrentOrganization();
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
    // Token refresh functionality
    refreshToken: refreshInstagramToken,
    isRefreshingToken
  } = useInstagramConnection();
  const { isSyncing, syncInstagramData, refreshToken } = useInstagramSync();
  
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const runAccountDiagnostic = async () => {
    setIsDiagnosing(true);
    setDiagnosticResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('meta-oauth?action=diagnose');
      
      if (error) {
        toast.error('Error al ejecutar diagnóstico', { description: error.message });
        return;
      }
      
      if (data?.success && data?.data) {
        setDiagnosticResult(data.data);
        toast.success(`Cuenta conectada: @${data.data.instagram_account?.username || 'desconocido'}`);
      } else {
        toast.error(data?.error_description || 'Error desconocido');
      }
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleRefreshAll = async () => {
    await refreshTokenStatus();
    await refreshOrganization();
    toast.success('Estado actualizado');
  };

  // Safe data access with null checks
  const instagramUsername = organization?.instagram_username || null;
  const lastSync = organization?.last_instagram_sync || null;
  const businessAccountId = organization?.instagram_business_account_id || null;

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

  return (
    <div className="space-y-6">
      {/* Main Connection Card */}
      <Card className="border-pink-200 bg-gradient-to-br from-pink-50/30 to-purple-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-600" />
            Conexión de Instagram
          </CardTitle>
          <CardDescription>
            Conecta tu cuenta de Instagram Business para sincronizar historias y gestionar embajadores automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                  {statusInfo.icon}
                  {statusInfo.status}
                </Badge>
                {instagramUsername && (
                  <Badge variant="outline" className="flex items-center gap-1 bg-white">
                    <Instagram className="h-3 w-3" />
                    @{instagramUsername}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {statusInfo.description}
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {isConnected ? (
                <>
                  {isTokenExpired ? (
                    <Button
                      onClick={refreshToken}
                      disabled={isSyncing}
                      variant="default"
                      className="w-full sm:w-auto"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      Renovar Conexión
                    </Button>
                  ) : (
                    <Button
                      onClick={syncInstagramData}
                      disabled={isSyncing}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      Sincronizar
                    </Button>
                  )}
                  <Button
                    onClick={disconnectInstagram}
                    disabled={isConnecting}
                    variant="destructive"
                    className="w-full sm:w-auto"
                  >
                    Desconectar
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => connectInstagram()}
                  disabled={isConnecting || orgLoading || !organization}
                  className="flex items-center gap-2 w-full sm:w-auto bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                  size="lg"
                >
                  <Instagram className="h-5 w-5" />
                  {orgLoading ? 'Cargando...' : 
                   !organization ? 'Preparando...' :
                   isConnecting ? 'Conectando...' : 'Conectar con Instagram'}
                </Button>
              )}
            </div>
          </div>

          {/* Help text for not connected */}
          {!isConnected && (
            <div className="flex items-start gap-3 text-sm bg-blue-50 text-blue-700 p-4 rounded-lg">
              <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="font-medium">¿Qué necesitas para conectar?</p>
                <ul className="space-y-1 text-blue-600">
                  <li>• Una cuenta de Instagram Business o Creator</li>
                  <li>• Acceso a tu cuenta de Instagram profesional</li>
                </ul>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-blue-700 hover:text-blue-800"
                  onClick={() => window.open('https://help.instagram.com/502981923235522', '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  ¿Cómo convertir mi cuenta a Business?
                </Button>
              </div>
            </div>
          )}

          {/* Post-OAuth hint */}
          {!isConnected && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <RefreshCw className="h-4 w-4" />
              <span>Si acabas de conectar Instagram, pulsa aquí para actualizar:</span>
              <Button
                onClick={refreshTokenStatus}
                disabled={isConnecting}
                variant="ghost"
                size="sm"
              >
                Actualizar Estado
              </Button>
            </div>
          )}

          {/* Last sync info */}
          {isConnected && lastSync && (
            <div className="text-sm text-muted-foreground">
              Última sincronización: {new Date(lastSync).toLocaleString('es-ES')}
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

      {/* Account Details Card - Only when connected */}
      {isConnected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Detalles de la Cuenta
              </CardTitle>
              <Button
                onClick={handleRefreshAll}
                variant="ghost"
                size="sm"
                disabled={isConnecting}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isConnecting ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Usuario</p>
                <p className="font-medium">
                  {instagramUsername ? `@${instagramUsername}` :
                    <span className="text-yellow-600">No detectado</span>}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Estado del Token</p>
                <Badge variant={isTokenExpired ? "destructive" : "default"} className={!isTokenExpired ? "bg-green-600" : ""}>
                  {isTokenExpired ? "Expirado" : "Activo"}
                </Badge>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Expira en
                </p>
                <p className={`font-medium ${
                  daysUntilExpiry !== null && daysUntilExpiry !== undefined
                    ? daysUntilExpiry <= 7
                      ? 'text-red-600'
                      : daysUntilExpiry <= 14
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    : ''
                }`}>
                  {daysUntilExpiry !== null && daysUntilExpiry !== undefined
                    ? `${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'día' : 'días'}`
                    : isTokenExpired
                      ? 'Expirado'
                      : 'Calculando...'}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Cuenta Business</p>
                <p className={`font-medium ${businessAccountId ? 'text-green-600' : 'text-yellow-600'}`}>
                  {businessAccountId ? '✓ Conectada' : 'No vinculada'}
                </p>
              </div>
            </div>

            {/* Token Expiry Details */}
            {tokenExpiryDate && !isTokenExpired && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="text-sm">
                  <span className="text-muted-foreground">Fecha de expiración: </span>
                  <span className="font-medium">
                    {new Date(tokenExpiryDate).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <Button
                  onClick={() => refreshInstagramToken()}
                  disabled={isRefreshingToken}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingToken ? 'animate-spin' : ''}`} />
                  {isRefreshingToken ? 'Renovando...' : 'Renovar (+60 días)'}
                </Button>
              </div>
            )}

            {/* Warning and diagnostic option if data seems incomplete */}
            {!businessAccountId && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm text-yellow-700 bg-yellow-50 p-4 rounded-lg">
                  <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium mb-1">Información incompleta</p>
                    <p className="text-yellow-600 mb-3">
                      Puede que los datos no se hayan cargado completamente. Intenta actualizar o ejecutar un diagnóstico.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={handleRefreshAll}
                        variant="outline"
                        size="sm"
                        disabled={isConnecting}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isConnecting ? 'animate-spin' : ''}`} />
                        Actualizar datos
                      </Button>
                      <Button
                        onClick={() => setShowDiagnostics(!showDiagnostics)}
                        variant="outline"
                        size="sm"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        {showDiagnostics ? 'Ocultar diagnóstico' : 'Ver diagnóstico'}
                        {showDiagnostics ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Diagnostic Panel */}
                {showDiagnostics && (
                  <div className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Diagnóstico de Instagram</h4>
                      <Button
                        onClick={runAccountDiagnostic}
                        disabled={isDiagnosing}
                        size="sm"
                      >
                        <Search className={`h-4 w-4 mr-2 ${isDiagnosing ? 'animate-pulse' : ''}`} />
                        {isDiagnosing ? 'Analizando...' : 'Ejecutar diagnóstico'}
                      </Button>
                    </div>

                    {diagnosticResult && (
                      <div className="space-y-3">
                        <div className="p-4 bg-green-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-100 rounded-full">
                                <Instagram className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <p className="font-medium text-green-800">
                                  @{diagnosticResult.instagram_account?.username || 'Usuario no disponible'}
                                </p>
                                <p className="text-sm text-green-600">
                                  {diagnosticResult.instagram_account?.account_type || 'Cuenta de Instagram'}
                                </p>
                              </div>
                            </div>
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Conectada
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-muted-foreground mb-1">ID de cuenta</p>
                            <p className="font-mono text-xs">{diagnosticResult.instagram_account?.id || 'N/A'}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-muted-foreground mb-1">Token actualizado</p>
                            <p className="text-xs">
                              {diagnosticResult.token_updated_at 
                                ? new Date(diagnosticResult.token_updated_at).toLocaleString('es-ES')
                                : 'N/A'}
                            </p>
                          </div>
                        </div>

                        {diagnosticResult.message && (
                          <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
                            {diagnosticResult.message}
                          </p>
                        )}
                      </div>
                    )}

                    {!diagnosticResult && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Haz clic en "Ejecutar diagnóstico" para verificar el estado de tu conexión de Instagram
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Privacy & Security Info */}
      <Card className="border-green-200 bg-green-50/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-green-800">Tu privacidad está protegida</p>
              <p className="text-sm text-green-700">
                EVA System solo accede a la información necesaria para gestionar tus embajadores. 
                Puedes desconectar tu cuenta en cualquier momento y tus datos serán eliminados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}