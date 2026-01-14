
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrganization } from "./useCurrentOrganization";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export function useInstagramConnection() {
  const { user } = useAuth();
  const { organization, loading, updateOrganization, refreshOrganization } = useCurrentOrganization();
  const [isConnecting, setIsConnecting] = useState(false);

  // Refs to prevent infinite loops
  const isRefreshingRef = useRef(false);
  const previousOrgIdRef = useRef<string | undefined>(undefined);
  const isMountedRef = useRef(true);

  // State for token refresh operation
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);

  // Token status now comes from secure edge function
  const [tokenStatus, setTokenStatus] = useState<{
    isConnected: boolean;
    isTokenExpired: boolean;
    lastSync?: string;
    username?: string;
    tokenExpiryDate?: string;
    daysUntilExpiry?: number | null;
    needsRefresh?: boolean;
    showWarning?: boolean;
  }>({
    isConnected: false,
    isTokenExpired: false
  });

  const refreshTokenStatus = async () => {
    // Prevent concurrent calls
    if (isRefreshingRef.current) {
      console.log('Token status refresh already in progress, skipping...');
      return;
    }

    try {
      isRefreshingRef.current = true;
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
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setTokenStatus(data.data);
          console.log('Token status updated:', data.data);
        }
      } else {
        // This is a server-reported error (but still HTTP 200)
        console.log('Token status check reported error:', data);
        // Don't show toast for server errors - they're usually permission-related
        // Just set disconnected state
        if (isMountedRef.current) {
          setTokenStatus({
            isConnected: false,
            isTokenExpired: false
          });
        }
      }
    } catch (error) {
      console.error('Unexpected error refreshing token status:', error);
      toast.error('Error de conexión', {
        description: 'No se pudo conectar con el servidor'
      });
    } finally {
      isRefreshingRef.current = false;
    }
  };

  // Fetch token status securely
  useEffect(() => {
    // Guard: Only refresh if user and organization exist
    if (!user || !organization) {
      return;
    }

    // Guard: Don't refresh if already in progress
    if (isRefreshingRef.current) {
      return;
    }

    // Check for OAuth callback params FIRST (before org change check)
    const urlParams = new URLSearchParams(window.location.search);
    const hasOAuthParams = urlParams.has('status') || urlParams.has('state') || urlParams.has('code');
    
    if (hasOAuthParams) {
      console.log('OAuth callback detected, refreshing token status...');
      
      // Clean up URL parameters
      try {
        const cleanUrl = window.location.pathname + '?tab=instagram';
        setTimeout(() => {
          try {
            window.history.replaceState({}, document.title, cleanUrl);
          } catch (error) {
            console.warn('Could not clean URL parameters (fallback):', error);
          }
        }, 100);
      } catch (error) {
        console.warn('Could not clean URL parameters:', error);
      }
      
      // Refresh token status immediately and again after a delay
      refreshTokenStatus();
      setTimeout(() => {
        console.log('Refreshing token status again after OAuth callback...');
        refreshTokenStatus();
      }, 2000);
      
      return;
    }

    // Guard: Only refresh if organization ID actually changed (for non-OAuth cases)
    if (previousOrgIdRef.current === organization.id) {
      return;
    }

    console.log('Organization changed, refreshing token status...', organization.id);
    previousOrgIdRef.current = organization.id;
    refreshTokenStatus();
  }, [user?.id, organization?.id]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

  /**
   * Manually refresh the Instagram access token
   * This extends the token validity for another 60 days
   */
  const refreshToken = async () => {
    if (!organization) {
      toast.error('No se encontró organización');
      return false;
    }

    if (!tokenStatus.isConnected) {
      toast.error('Instagram no está conectado');
      return false;
    }

    try {
      setIsRefreshingToken(true);
      console.log('Refreshing Instagram token for organization:', organization.id);

      const { data, error } = await supabase.functions.invoke('meta-oauth?action=refresh', {
        body: {
          organization_id: organization.id
        }
      });

      if (error) {
        console.error('Token refresh error:', error);
        toast.error('Error al renovar token', {
          description: error.message || 'No se pudo renovar el token de Instagram'
        });
        return false;
      }

      if (!data?.success) {
        console.error('Token refresh failed:', data);
        toast.error('Error al renovar token', {
          description: data?.error || 'No se pudo renovar el token de Instagram'
        });
        return false;
      }

      // Refresh token status to get new expiry date
      await refreshTokenStatus();
      toast.success('Token renovado exitosamente', {
        description: 'Tu conexión con Instagram se ha extendido por 60 días más'
      });
      return true;
    } catch (error) {
      console.error('Unexpected error refreshing token:', error);
      toast.error('Error inesperado', {
        description: 'No se pudo renovar el token de Instagram'
      });
      return false;
    } finally {
      setIsRefreshingToken(false);
    }
  };

  return {
    isConnected,
    isTokenExpired,
    isConnecting: isConnecting || loading,
    connectInstagram,
    disconnectInstagram,
    lastSync: tokenStatus.lastSync,
    refreshTokenStatus,
    // New token expiry fields
    tokenExpiryDate: tokenStatus.tokenExpiryDate,
    daysUntilExpiry: tokenStatus.daysUntilExpiry,
    needsRefresh: tokenStatus.needsRefresh,
    showWarning: tokenStatus.showWarning,
    username: tokenStatus.username,
    // Token refresh functionality
    refreshToken,
    isRefreshingToken
  };
}
