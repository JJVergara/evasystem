import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationSettings } from './useOrganizationSettings';
import { useCurrentOrganization } from './useCurrentOrganization';

interface N8nWebhookResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export function useN8nWebhooks() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { settings } = useOrganizationSettings();
  const { organization } = useCurrentOrganization();

  const callWebhook = async (
    webhookUrl: string,
    data: any,
    successMessage?: string
  ): Promise<N8nWebhookResponse> => {
    setIsLoading(true);
    
    try {
      // Use secure webhook proxy instead of direct calls
      const { data: result, error } = await supabase.functions.invoke('secure-webhook-proxy', {
        body: {
          webhookUrl,
          data
        }
      });

      if (error) {
        throw new Error(error.message || 'Error en la conexión con el webhook');
      }

      if (result.success) {
        toast({
          title: "Éxito",
          description: successMessage || result.data?.message || 'Operación completada',
        });
      } else {
        toast({
          title: "Error",
          description: result.error || 'Error en el procesamiento',
          variant: "destructive",
        });
      }

      return {
        success: result.success,
        message: result.data?.message || result.error || '',
        data: result.data
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      toast({
        title: "Error de conexión",
        description: `No se pudo conectar con el servicio: ${errorMessage}`,
        variant: "destructive",
      });

      return {
        success: false,
        message: errorMessage,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Get configured n8n webhook URL from organization settings
  const getN8nUrl = () => {
    const n8nUrl = settings.integration_settings.n8n_webhook_url;
    if (!n8nUrl) {
      throw new Error('N8N webhook URL no configurada. Por favor configúrala en Configuraciones.');
    }
    return n8nUrl;
  };

  // Webhook específicos del sistema EVA - ahora centralizados
  const registerUser = async (userData: {
    email: string;
    password: string;
    name: string;
    organizationName: string;
  }) => {
    const n8nUrl = getN8nUrl();
    return callWebhook(
      `${n8nUrl}/webhook/auth-user-registration`,
      { action: 'register_user', ...userData },
      'Usuario registrado exitosamente'
    );
  };

  const createEvent = async (eventData: any) => {
    const n8nUrl = getN8nUrl();
    return callWebhook(
      `${n8nUrl}/webhook/event-management`,
      { action: 'create', ...eventData },
      'Evento creado exitosamente'
    );
  };

  const updateEvent = async (eventData: any) => {
    const n8nUrl = getN8nUrl();
    return callWebhook(
      `${n8nUrl}/webhook/event-management`,
      { action: 'update', ...eventData },
      'Evento actualizado exitosamente'
    );
  };

  const createAmbassador = async (ambassadorData: any) => {
    const n8nUrl = getN8nUrl();
    // Now unified through secure-webhook-proxy
    return callWebhook(
      `${n8nUrl}/webhook/crear-embajador`,
      { action: 'create_ambassador', ...ambassadorData },
      'Embajador creado exitosamente'
    );
  };

  const importAmbassadors = async (ambassadors: any[], organizationId: string) => {
    const n8nUrl = getN8nUrl();
    return callWebhook(
      `${n8nUrl}/webhook/ambassador-management`,
      { action: 'import', ambassadors, organizationId },
      'Embajadores importados exitosamente'
    );
  };

  const approveAmbassador = async (ambassadorId: string, status: string) => {
    const n8nUrl = getN8nUrl();
    return callWebhook(
      `${n8nUrl}/webhook/ambassador-management`,
      { action: 'approve', ambassadorId, status },
      'Estado del embajador actualizado'
    );
  };

  return {
    isLoading,
    callWebhook,
    registerUser,
    createEvent,
    updateEvent,
    createAmbassador,
    importAmbassadors,
    approveAmbassador,
  };
}