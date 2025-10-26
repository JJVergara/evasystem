import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Webhook, CheckCircle, AlertTriangle, Settings } from 'lucide-react';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { toast } from 'sonner';

export function N8nConfigurationSection() {
  const { settings, updateIntegrationSettings, saving } = useOrganizationSettings();
  const [n8nUrl, setN8nUrl] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');

  useEffect(() => {
    if (settings.integration_settings.n8n_webhook_url) {
      setN8nUrl(settings.integration_settings.n8n_webhook_url);
    }
  }, [settings.integration_settings.n8n_webhook_url]);

  const validateN8nUrl = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'https:' && 
             (parsedUrl.hostname.includes('n8n.cloud') || 
              parsedUrl.hostname.includes('rquevedos.app.n8n.cloud'));
    } catch {
      return false;
    }
  };

  const testConnection = async () => {
    if (!n8nUrl) {
      toast.error('Por favor ingresa una URL válida');
      return;
    }

    if (!validateN8nUrl(n8nUrl)) {
      toast.error('URL inválida. Debe ser HTTPS y de un dominio n8n válido');
      return;
    }

    setIsTestingConnection(true);
    try {
      // Test with a simple ping
      const testPayload = {
        test: true,
        message: 'Health check from EVA System',
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${n8nUrl}/webhook/health-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        setConnectionStatus('success');
        toast.success('Conexión exitosa con n8n');
      } else {
        setConnectionStatus('error');
        toast.error('Error de conexión: ' + response.statusText);
      }
    } catch (error) {
      setConnectionStatus('error');
      toast.error('Error de red: No se pudo conectar con n8n');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const saveConfiguration = async () => {
    if (!n8nUrl) {
      toast.error('Por favor ingresa una URL válida');
      return;
    }

    if (!validateN8nUrl(n8nUrl)) {
      toast.error('URL inválida. Debe ser HTTPS y de un dominio n8n válido');
      return;
    }

    try {
      await updateIntegrationSettings({
        n8n_webhook_url: n8nUrl
      });
      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      toast.error('Error al guardar la configuración');
    }
  };

  const getStatusBadge = () => {
    if (!settings.integration_settings.n8n_webhook_url) {
      return <Badge variant="secondary">No Configurado</Badge>;
    }
    
    switch (connectionStatus) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Conectado</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const getStatusIcon = () => {
    if (!settings.integration_settings.n8n_webhook_url) {
      return <Settings className="w-5 h-5 text-muted-foreground" />;
    }
    
    switch (connectionStatus) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Webhook className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Configuración de n8n
        </CardTitle>
        <CardDescription>
          Configura la URL base de tu instancia de n8n para automatización de workflows
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Estado de Conexión:</span>
          {getStatusBadge()}
        </div>

        <div className="space-y-2">
          <Label htmlFor="n8n-url">URL Base de n8n</Label>
          <Input
            id="n8n-url"
            type="url"
            placeholder="https://rquevedos.app.n8n.cloud"
            value={n8nUrl}
            onChange={(e) => setN8nUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            URL base de tu instancia de n8n (ej: https://tu-instancia.n8n.cloud)
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={testConnection}
            disabled={isTestingConnection || !n8nUrl}
          >
            {isTestingConnection ? 'Probando...' : 'Probar Conexión'}
          </Button>
          <Button 
            onClick={saveConfiguration}
            disabled={saving || !n8nUrl || n8nUrl === settings.integration_settings.n8n_webhook_url}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>

        {settings.integration_settings.n8n_webhook_url && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">Webhooks Configurados</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>• {settings.integration_settings.n8n_webhook_url}/webhook/auth-user-registration</div>
              <div>• {settings.integration_settings.n8n_webhook_url}/webhook/event-management</div>
              <div>• {settings.integration_settings.n8n_webhook_url}/webhook/crear-embajador</div>
              <div>• {settings.integration_settings.n8n_webhook_url}/webhook/ambassador-management</div>
            </div>
          </div>
        )}

        <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
          <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-200">Información Importante</h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Todas las llamadas a n8n pasan por el proxy seguro</li>
            <li>• Se incluye contexto de organización y usuario automáticamente</li>
            <li>• Los webhooks deben estar configurados en tu instancia de n8n</li>
            <li>• Se recomienda usar HTTPS para todas las conexiones</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}