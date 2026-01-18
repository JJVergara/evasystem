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
    </div>
  );
};
