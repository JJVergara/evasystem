import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Activity, Database, Zap } from 'lucide-react';
import { useInstagramConnection } from '@/hooks/useInstagramConnection';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HealthCheck {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  lastChecked: Date;
  details?: string;
}

interface SystemError {
  timestamp: Date;
  component: string;
  error: string;
  level: 'info' | 'warn' | 'error';
}

export function SystemHealthDashboard() {
  const { isConnected, isTokenExpired, lastSync } = useInstagramConnection();
  const { organization } = useCurrentOrganization();
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [systemErrors, setSystemErrors] = useState<SystemError[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    runHealthChecks();
    loadSystemErrors();
    // Refresh every 30 seconds
    const interval = setInterval(runHealthChecks, 30000);
    return () => clearInterval(interval);
  }, [organization?.id]);

  const runHealthChecks = async () => {
    const checks: HealthCheck[] = [];
    
    // Instagram Connection Check
    const instagramCheck: HealthCheck = {
      id: 'instagram',
      name: 'Instagram Connection',
      status: !isConnected ? 'error' : isTokenExpired ? 'warning' : 'healthy',
      message: !isConnected ? 'Desconectado' : isTokenExpired ? 'Token expirado' : 'Conectado correctamente',
      lastChecked: new Date(),
      details: isConnected ? 'Cuenta conectada' : undefined
    };
    checks.push(instagramCheck);

    // Database Connection Check
    try {
      const { error } = await supabase.from('organizations').select('id').limit(1);
      checks.push({
        id: 'database',
        name: 'Database Connection', 
        status: error ? 'error' : 'healthy',
        message: error ? 'Error de conexión' : 'Conexión establecida',
        lastChecked: new Date(),
        details: error?.message
      });
    } catch (err) {
      checks.push({
        id: 'database',
        name: 'Database Connection',
        status: 'error',
        message: 'Error de conexión',
        lastChecked: new Date(),
        details: 'No se pudo conectar a la base de datos'
      });
    }

    // N8N Configuration Check
    try {
      const { data: settings } = await supabase
        .from('organization_settings')
        .select('integration_settings')
        .eq('organization_id', organization?.id)
        .single();
      
      // Type-safe access to n8n_webhook_url
      const integrationSettings = settings?.integration_settings as any;
      const n8nUrl = integrationSettings?.n8n_webhook_url;
      checks.push({
        id: 'n8n',
        name: 'N8N Configuration',
        status: n8nUrl ? 'healthy' : 'warning',
        message: n8nUrl ? 'URL configurada' : 'URL no configurada',
        lastChecked: new Date(),
        details: n8nUrl ? 'Configuración activa' : 'Configure la URL en Configuraciones'
      });
    } catch (err) {
      checks.push({
        id: 'n8n',
        name: 'N8N Configuration',
        status: 'error',
        message: 'Error al verificar configuración',
        lastChecked: new Date()
      });
    }

    // Token Expiry Check - simplified without tokenStatus
    if (isConnected) {
      // For now, we'll show a general check - can be enhanced later
      checks.push({
        id: 'token_expiry',
        name: 'Token Expiry',
        status: isTokenExpired ? 'warning' : 'healthy',
        message: isTokenExpired ? 'Token expirado - renovar requerido' : 'Token válido',
        lastChecked: new Date(),
        details: isTokenExpired ? 'Renueva el token en la configuración de Instagram' : 'Token funcionando correctamente'
      });
    }

    setHealthChecks(checks);
    setIsLoading(false);
  };

  const loadSystemErrors = async () => {
    try {
      // Load recent notifications as proxy for system errors
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', organization?.id)
        .in('type', ['error', 'warning', 'token_expiry_warning'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        const errors: SystemError[] = data.map(notification => ({
          timestamp: new Date(notification.created_at),
          component: notification.type,
          error: notification.message,
          level: notification.priority === 'high' ? 'error' : notification.priority === 'medium' ? 'warn' : 'info'
        }));
        setSystemErrors(errors);
      }
    } catch (err) {
      console.error('Error loading system errors:', err);
    }
  };

  const getStatusIcon = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy': return 'default';
      case 'warning': return 'warning';
      case 'error': return 'destructive';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" />
            System Health
          </h2>
          <p className="text-muted-foreground">
            Estado en tiempo real de los componentes del sistema
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={runHealthChecks}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Estado General</p>
                <p className="text-2xl font-bold">
                  {healthChecks.filter(c => c.status === 'healthy').length}/{healthChecks.length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Advertencias</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {healthChecks.filter(c => c.status === 'warning').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Errores</p>
                <p className="text-2xl font-bold text-red-500">
                  {healthChecks.filter(c => c.status === 'error').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Última Verificación</p>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleTimeString()}
                </p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Verificaciones de Salud
          </CardTitle>
          <CardDescription>
            Estado detallado de todos los componentes del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {healthChecks.map((check) => (
              <div key={check.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <h4 className="font-medium">{check.name}</h4>
                    <p className="text-sm text-muted-foreground">{check.message}</p>
                    {check.details && (
                      <p className="text-xs text-muted-foreground mt-1">{check.details}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusColor(check.status)}>
                    {check.status === 'healthy' ? 'Saludable' : 
                     check.status === 'warning' ? 'Advertencia' : 'Error'}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {check.lastChecked.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Errores Recientes
          </CardTitle>
          <CardDescription>
            Últimos errores y advertencias del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {systemErrors.length > 0 ? (
            <div className="space-y-2">
              {systemErrors.map((error, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      error.level === 'error' ? 'bg-red-500' :
                      error.level === 'warn' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{error.component}</p>
                      <p className="text-xs text-muted-foreground">{error.error}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {error.timestamp.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay errores recientes</p>
              <p className="text-sm">El sistema está funcionando correctamente</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}