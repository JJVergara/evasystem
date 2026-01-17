import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Copy } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useInstagramDiagnostics } from '@/hooks/useInstagramDiagnostics';

export const InstagramDiagnosticsPanel: React.FC = () => {
  const { isRunning, connectionTests, webhookStatus, runConnectionTests, testWebhookDelivery } =
    useInstagramDiagnostics();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <span className="text-success">✅</span>;
      case 'error':
        return <span className="text-destructive">❌</span>;
      case 'pending':
        return <span className="text-warning animate-pulse">🕐</span>;
      default:
        return <span className="text-muted-foreground">ℹ️</span>;
    }
  };

  const getStatusVariant = (
    status: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📊</span>
            Diagnósticos de Instagram
          </CardTitle>
          <CardDescription>
            Ejecuta pruebas completas para verificar la conectividad y funcionalidad de Instagram
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={runConnectionTests}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <span className="animate-spin">🕐</span>
                  Ejecutando...
                </>
              ) : (
                <>
                  <span>▶️</span>
                  Ejecutar Diagnósticos
                </>
              )}
            </Button>

            <Button
              onClick={testWebhookDelivery}
              variant="outline"
              className="flex items-center gap-2"
            >
              <span>⚡</span>
              Probar Webhook
            </Button>
          </div>

          {connectionTests.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Resultados de las Pruebas:</h4>
              <div className="space-y-2">
                {connectionTests.map((test, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg bg-background/50"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(test.status)}
                      <div>
                        <p className="font-medium">{test.name}</p>
                        <p className="text-sm text-muted-foreground">{test.message}</p>
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(test.status)}>
                      {test.status === 'success'
                        ? 'Exitoso'
                        : test.status === 'error'
                          ? 'Error'
                          : 'Pendiente'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {webhookStatus && (
            <Alert>
              <span>🌐</span>
              <AlertDescription>
                <strong>Estado del Webhook:</strong>{' '}
                {webhookStatus.configured && webhookStatus.reachable
                  ? 'Configurado y funcionando correctamente'
                  : webhookStatus.configured
                    ? 'Configurado pero puede tener problemas de conectividad'
                    : 'No configurado correctamente'}
                {webhookStatus.lastEvent && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Último evento: {webhookStatus.lastEvent}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <span>⚙️</span>
            Estado del Webhook
          </CardTitle>
          <CardDescription>Estado de configuración y conectividad del webhook</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {webhookStatus && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Credenciales Configuradas</span>
                <Badge variant={webhookStatus.credentials_configured ? 'default' : 'destructive'}>
                  {webhookStatus.credentials_configured ? 'Sí' : 'No'}
                </Badge>
              </div>

              {webhookStatus.app_id && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">App ID</span>
                  <code className="text-sm font-mono">{webhookStatus.app_id}</code>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Webhook Alcanzable</span>
                <Badge variant={webhookStatus.reachable ? 'default' : 'secondary'}>
                  {webhookStatus.reachable ? 'Activo' : 'Sin actividad reciente'}
                </Badge>
              </div>

              {webhookStatus.recent_activity && webhookStatus.recent_activity.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Actividad Reciente</Label>
                  <div className="space-y-1">
                    {webhookStatus.recent_activity.slice(0, 3).map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded"
                      >
                        <span>{activity.type}</span>
                        <span className="text-muted-foreground">
                          {new Date(activity.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">URL del Webhook</Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <code className="flex-1 text-sm font-mono">
                https://awpfslcepylnipaolmvv.supabase.co/functions/v1/instagram-webhook
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    'https://awpfslcepylnipaolmvv.supabase.co/functions/v1/instagram-webhook'
                  )
                }
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Suscripciones Requeridas</Label>
            <div className="grid grid-cols-2 gap-2">
              {['messages', 'messaging_referrals'].map((field) => (
                <div key={field} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <Badge variant="secondary" className="text-xs">
                    {field}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <Alert>
            <span>⚠️</span>
            <AlertTitle>Configuración Importante</AlertTitle>
            <AlertDescription className="text-sm">
              1. Verifica que en Meta Developer Console el URL del webhook sea exactamente el
              mostrado arriba
              <br />
              2. Asegúrate de que el App Secret en Meta coincida con el guardado en EVA
              <br />
              3. Las suscripciones 'messages' y 'messaging_referrals' deben estar activas
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};
