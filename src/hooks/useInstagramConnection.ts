
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrganization } from "./useCurrentOrganization";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export function useInstagramConnection() {
  const { user } = useAuth();
  const { organization, loading, updateOrganization, refreshOrganization } = useCurrentOrganization();
  const [isConnecting, setIsConnecting] = useState(false);

  // Token status now comes from secure edge function
  const [tokenStatus, setTokenStatus] = useState<{
    isConnected: boolean;
    isTokenExpired: boolean;
    lastSync?: string;
    username?: string;
    tokenExpiryDate?: string;
  }>({
    isConnected: false,
    isTokenExpired: false
  });

  const refreshTokenStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('instagram-token-status');
      
      // Handle network/invocation errors (not HTTP errors, since we return 200 always)
      if (error) {
        console.error('Network error invoking token status:', error);
        toast.error('Error de conexión', {
          description: 'No se pudo conectar con el servidor'
        });
        return;
      }
      
      // Handle response data - should always have success field now
      if (data?.success) {
        setTokenStatus(data.data);
        console.log('Token status updated:', data.data);
      } else {
        // This is a server-reported error (but still HTTP 200)
        console.log('Token status check reported error:', data);
        // Don't show toast for server errors - they're usually permission-related
        // Just set disconnected state
        setTokenStatus({
          isConnected: false,
          isTokenExpired: false
        });
      }
    } catch (error) {
      console.error('Unexpected error refreshing token status:', error);
      toast.error('Error de conexión', {
        description: 'No se pudo conectar con el servidor'
      });
    }
  };

  // Fetch token status securely
  useEffect(() => {
    if (user && organization) {
      refreshTokenStatus();
      
      // Clean up URL parameters after OAuth callback to prevent re-processing
      const urlParams = new URLSearchParams(window.location.search);
      const hasOAuthParams = urlParams.has('status') || urlParams.has('state') || urlParams.has('code');
      
      if (hasOAuthParams) {
        try {
          const cleanUrl = window.location.pathname;
          // Use a timeout to ensure the page has rendered
          setTimeout(() => {
            try {
              window.history.replaceState({}, document.title, cleanUrl);
            } catch (error) {
              console.warn('Could not clean URL parameters (fallback):', error);
            }
          }, 100);
          
          // After OAuth, refresh token status again with a delay to catch any token writes
          setTimeout(() => {
            console.log('Refreshing token status after OAuth callback...');
            refreshTokenStatus();
          }, 2000);
        } catch (error) {
          console.warn('Could not clean URL parameters:', error);
        }
      }
    }
  }, [user, organization?.id]);

  const isConnected = tokenStatus.isConnected;
  const isTokenExpired = tokenStatus.isTokenExpired;

  const connectInstagram = async (onCredentialsNeeded?: () => void) => {
    if (loading) {
      toast.error('Cargando organización...');
      return;
    }

    if (!organization) {
      toast.info('Preparando organización...');
      try {
        await refreshOrganization();
        // Give some time for state to update
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        toast.error('No se pudo preparar tu organización. Reintenta.');
        return;
      }
    }

    // Re-check organization after potential refresh
    if (!organization) {
      toast.error('No se encontró organización');
      return;
    }

    try {
      setIsConnecting(true);

      // Try to connect - the meta-oauth function will handle credential validation
      console.log('Attempting Instagram connection for organization:', organization.id);
      
      // Call the meta-oauth edge function with action as query parameter
      const { data, error } = await supabase.functions.invoke('meta-oauth?action=authorize', {
        body: {
          user_id: user?.id,
          organization_id: organization.id,
          type: 'organization'
          // redirect_base removed - always using production URL for Meta OAuth
        }
      });

      if (error) {
        console.error('Error initiating Instagram connection:', error);
        
        // Mensajes de error más específicos
        let errorMessage = 'Error al conectar con Instagram';
        let errorDescription = undefined;
        
        if (error.message?.includes('configuration_error')) {
          errorMessage = 'Configuración de Meta App incorrecta';
          errorDescription = 'Verifica App ID, App Secret y configuración de OAuth';
        } else if (error.message?.includes('unauthorized') || error.message?.includes('forbidden')) {
          errorMessage = 'Sin permisos para conectar Instagram';
          errorDescription = 'Verifica que seas miembro de esta organización';
        } else if (error.message?.includes('credentials') || error.message?.includes('configuration_error')) {
          errorMessage = 'Credenciales de Meta no encontradas';
          errorDescription = 'Configura las credenciales de Meta App primero. Asegúrate de que el redirect URI en Meta Developers sea: https://app.evasystem.cl/api/meta-oauth?action=callback';
          if (onCredentialsNeeded) {
            onCredentialsNeeded();
          }
        }
        
        toast.error(errorMessage, {
          description: errorDescription
        });
        return;
      }

      if (data?.authUrl) {
        // Redirect to Meta OAuth
        window.location.href = data.authUrl;
      } else {
        toast.error('No se pudo obtener URL de autorización', {
          description: 'Verifica la configuración de Meta App'
        });
      }
    } catch (error) {
      console.error('Error connecting Instagram:', error);
      toast.error('Error inesperado al conectar Instagram');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectInstagram = async () => {
    if (!organization) return;

    try {
      setIsConnecting(true);
      console.log('Disconnecting Instagram...');
      
      const { data, error } = await supabase.functions.invoke('disconnect-instagram');

      if (error) {
        console.error('Disconnect error:', error);
        toast.error('Error al desconectar', {
          description: error.message || 'No se pudo desconectar Instagram'
        });
        return;
      }
      
      if (!data?.success) {
        toast.error('Error al desconectar', {
          description: data?.error || 'No se pudo completar la desconexión'
        });
        return;
      }

      // Refresh token status and organization data
      await refreshTokenStatus();
      await refreshOrganization();
      toast.success('Instagram desconectado exitosamente');
    } catch (error) {
      console.error('Error disconnecting Instagram:', error);
      toast.error('Error inesperado', {
        description: 'No se pudo completar la desconexión'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return {
    isConnected,
    isTokenExpired,
    isConnecting: isConnecting || loading,
    connectInstagram,
    disconnectInstagram,
    lastSync: tokenStatus.lastSync,
    refreshTokenStatus: refreshTokenStatus
  };
}
