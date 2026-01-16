import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrganization } from './useCurrentOrganization';
import { useInstagramConnection } from './useInstagramConnection';
import { toast } from 'sonner';

interface ConnectionTest {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  details?: Record<string, unknown>;
}

interface WebhookStatus {
  configured: boolean;
  reachable: boolean;
  lastEvent?: string;
  errors?: string[];
  credentials_configured?: boolean;
  app_id?: string;
  recent_activity?: Array<{
    type: string;
    created_at: string;
  }>;
}

export function useInstagramDiagnostics() {
  const { organization } = useCurrentOrganization();
  const { isConnected } = useInstagramConnection();
  const [isRunning, setIsRunning] = useState(false);
  const [connectionTests, setConnectionTests] = useState<ConnectionTest[]>([]);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);

  const runConnectionTests = async () => {
    if (!organization?.id || !isConnected) {
      toast.error('Instagram no está conectado');
      return;
    }

    setIsRunning(true);
    setConnectionTests([]);

    const tests: ConnectionTest[] = [
      { name: 'Token válido', status: 'pending' },
      { name: 'Acceso a perfil de Instagram', status: 'pending' },
      { name: 'Permisos de lectura de menciones', status: 'pending' },
      { name: 'Permisos de historias', status: 'pending' },
      { name: 'Webhook configurado', status: 'pending' },
    ];

    setConnectionTests([...tests]);

    try {
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke(
        'instagram-diagnostics',
        {
          body: {
            organization_id: organization.id,
            test: 'token_validity',
          },
        }
      );

      tests[0] = {
        ...tests[0],
        status: tokenError ? 'error' : 'success',
        message: tokenError ? 'Token inválido o expirado' : 'Token válido y activo',
        details: tokenData,
      };
      setConnectionTests([...tests]);

      if (!tokenError) {
        const { data: profileData, error: profileError } = await supabase.functions.invoke(
          'instagram-diagnostics',
          {
            body: {
              organization_id: organization.id,
              test: 'profile_access',
            },
          }
        );

        tests[1] = {
          ...tests[1],
          status: profileError ? 'error' : 'success',
          message: profileError
            ? 'No se puede acceder al perfil'
            : `Perfil: ${profileData?.username || 'Disponible'}`,
          details: profileData,
        };
        setConnectionTests([...tests]);

        const { data: mentionsData, error: mentionsError } = await supabase.functions.invoke(
          'instagram-diagnostics',
          {
            body: {
              organization_id: organization.id,
              test: 'mentions_permissions',
            },
          }
        );

        tests[2] = {
          ...tests[2],
          status: mentionsError ? 'error' : 'success',
          message: mentionsError ? 'Sin acceso a menciones' : 'Permisos de menciones activos',
          details: mentionsData,
        };
        setConnectionTests([...tests]);

        const { data: storiesData, error: storiesError } = await supabase.functions.invoke(
          'instagram-diagnostics',
          {
            body: {
              organization_id: organization.id,
              test: 'stories_permissions',
            },
          }
        );

        tests[3] = {
          ...tests[3],
          status: storiesError ? 'error' : 'success',
          message: storiesError ? 'Sin acceso a historias' : 'Permisos de historias activos',
          details: storiesData,
        };
        setConnectionTests([...tests]);
      } else {
        for (let i = 1; i < 4; i++) {
          tests[i] = { ...tests[i], status: 'error', message: 'Saltado por token inválido' };
        }
      }

      const { data: webhookData, error: webhookError } = await supabase.functions.invoke(
        'instagram-diagnostics',
        {
          body: {
            organization_id: organization.id,
            test: 'webhook_status',
          },
        }
      );

      tests[4] = {
        ...tests[4],
        status: webhookError ? 'error' : 'success',
        message: webhookError ? 'Webhook no configurado' : 'Webhook activo',
        details: webhookData,
      };

      setWebhookStatus(webhookData || { configured: false, reachable: false });
      setConnectionTests([...tests]);
    } catch (error) {
      void ('Error running diagnostics:', error);
      toast.error('Error al ejecutar diagnósticos');
    } finally {
      setIsRunning(false);
    }
  };

  const testWebhookDelivery = async () => {
    if (!organization?.id) {
      toast.error('No se encontró organización');
      return;
    }

    try {
      toast.info('Enviando test de webhook...');

      const { data, error } = await supabase.functions.invoke('instagram-diagnostics', {
        body: {
          organization_id: organization.id,
          test: 'webhook_test',
        },
      });

      if (error) {
        void ('Webhook test error:', error);
        toast.error('Error al probar webhook: ' + error.message);
      } else if (data.test_sent) {
        toast.success('Test de webhook enviado correctamente');
        toast.info('Revisa la sección de menciones para ver el test', {
          description: 'El webhook debería crear una mención de prueba',
        });
      } else {
        toast.error('Test de webhook falló: ' + (data.error || 'Error desconocido'));
      }
    } catch (error) {
      void ('Error testing webhook:', error);
      toast.error('Error al probar webhook');
    }
  };

  return {
    isRunning,
    connectionTests,
    webhookStatus,
    runConnectionTests,
    testWebhookDelivery,
  };
}
