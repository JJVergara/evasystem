
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Instagram, RefreshCw, Settings, AlertTriangle, CheckCircle, Clock, Zap } from "lucide-react";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { useInstagramSync } from "@/hooks/useInstagramSync";
import { useInstagramConnection } from "@/hooks/useInstagramConnection";
import { InstagramConnect } from "./InstagramConnect";
import { InstagramSyncStatus } from "./InstagramSyncStatus";
import { toast } from "sonner";

export function InstagramDashboard() {
  const { organization } = useCurrentOrganization();
  const { isSyncing, syncInstagramData, refreshToken } = useInstagramSync();
  const { isConnected, isTokenExpired, lastSync } = useInstagramConnection();
  const [webhookStatus, setWebhookStatus] = useState<'active' | 'inactive' | 'checking'>('checking');

  useEffect(() => {
    // Simulate webhook status check
    const checkWebhookStatus = () => {
      setWebhookStatus(isConnected ? 'active' : 'inactive');
    };
    
    checkWebhookStatus();
  }, [isConnected]);

  const handleSync = async () => {
    const success = await syncInstagramData();
    if (success) {
      toast.success('Datos sincronizados correctamente');
    }
  };

  const handleRefreshToken = async () => {
    const success = await refreshToken();
    if (success) {
      toast.success('Token renovado correctamente');
    }
  };

  const getConnectionStatus = () => {
    if (!isConnected) return { status: 'disconnected', color: 'destructive', icon: AlertTriangle };
    if (isTokenExpired) return { status: 'expired', color: 'warning', icon: Clock };
    return { status: 'connected', color: 'success', icon: CheckCircle };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Instagram Dashboard</h2>
          <p className="text-muted-foreground">
            Gestiona la conexión e integración con Instagram (Sync automático cada 5 minutos)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshToken}
                disabled={isSyncing}
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                Renovar Token
              </Button>
              <Button 
                onClick={handleSync}
                disabled={isSyncing}
                size="sm"
              >
                <Zap className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Sync Status Cards */}
      {isConnected && <InstagramSyncStatus />}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado de Conexión</CardTitle>
            <connectionStatus.icon className={`h-4 w-4 ${
              connectionStatus.color === 'success' ? 'text-green-600' :
              connectionStatus.color === 'warning' ? 'text-yellow-600' :
              'text-red-600'
            }`} />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={connectionStatus.color === 'success' ? 'default' : 'destructive'}>
                {connectionStatus.status === 'connected' ? 'Conectado' :
                 connectionStatus.status === 'expired' ? 'Token Expirado' :
                 'Desconectado'}
              </Badge>
            </div>
            {lastSync && (
              <p className="text-xs text-muted-foreground mt-1">
                Última sync: {new Date(lastSync).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Webhooks</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={webhookStatus === 'active' ? 'default' : 'secondary'}>
                {webhookStatus === 'active' ? 'Activos' : 
                 webhookStatus === 'inactive' ? 'Inactivos' : 'Verificando...'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Estado de notificaciones en tiempo real
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Status</CardTitle>
            <Instagram className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="default">
                Operacional
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Instagram Graph API v18.0 + Cron (5 min)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="connection" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connection">Conexión</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Instagram</CardTitle>
              <CardDescription>
                Conecta tu cuenta business de Instagram para habilitar la sincronización automática cada 5 minutos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InstagramConnect
                type="organization"
                entityId={organization?.id || ''}
                organizationId={organization?.id}
                currentStatus={{
                  isConnected,
                  lastSync
                }}
                onConnectionChange={() => window.location.reload()}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Webhooks</CardTitle>
              <CardDescription>
                Los webhooks están configurados para recibir notificaciones en tiempo real de Instagram. 
                Además, el sistema sincroniza automáticamente cada 5 minutos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">URL del Webhook</h4>
                  <code className="text-sm bg-background p-2 rounded block">
                    https://awpfslcepylnipaolmvv.supabase.co/functions/v1/instagram-webhook
                  </code>
                </div>
                
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Sincronización Automática</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default">Activa - Cada 5 minutos</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    El sistema ejecuta automáticamente la sincronización de menciones y etiquetas cada 5 minutos
                  </p>
                </div>

                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Eventos Suscritos</h4>
                  <div className="flex flex-wrap gap-2">
                    {['comments', 'messages', 'messaging_postbacks', 'messaging_referral'].map((event) => (
                      <Badge key={event} variant="secondary">{event}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Actividad</CardTitle>
              <CardDescription>
                Monitorea la actividad de webhooks e integraciones automáticas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isTokenExpired ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                  <p className="font-medium text-yellow-700">Token de Instagram Expirado</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Renueva tu token para continuar recibiendo datos de Instagram
                  </p>
                  <Button 
                    className="mt-4" 
                    variant="outline"
                    onClick={handleRefreshToken}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    Renovar Token Ahora
                  </Button>
                </div>
              ) : !isConnected ? (
                <div className="text-center py-8">
                  <Instagram className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="font-medium">Instagram No Conectado</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Conecta tu cuenta de Instagram para ver los logs de actividad
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Instagram className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Los logs aparecerán aquí cuando haya actividad de webhooks o sincronización automática</p>
                  <p className="text-sm mt-2">Próxima sincronización automática en menos de 5 minutos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
