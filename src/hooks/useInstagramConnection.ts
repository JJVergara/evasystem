
import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrganization } from "./useCurrentOrganization";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

interface TokenStatus {
  isConnected: boolean;
  isTokenExpired: boolean;
  lastSync?: string;
  username?: string;
  tokenExpiryDate?: string;
  daysUntilExpiry?: number | null;
  needsRefresh?: boolean;
  showWarning?: boolean;
}

async function fetchTokenStatus(): Promise<TokenStatus> {
  const { data, error } = await supabase.functions.invoke('instagram-token-status');

  if (error) {
    console.error('Network error invoking token status:', error);
    throw error;
  }

  if (data?.success) {
    return data.data;
  } else {
    console.log('Token status check reported error:', data);
    return {
      isConnected: false,
      isTokenExpired: false
    };
  }
}

export function useInstagramConnection() {
  const { user } = useAuth();
  const { organization, loading, updateOrganization, refreshOrganization } = useCurrentOrganization();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const queryClient = useQueryClient();

  // Stable query key
  const queryKey = useMemo(
    () => ['instagramTokenStatus', organization?.id],
    [organization?.id]
  );

  // Use React Query for token status
  const {
    data: tokenStatus = { isConnected: false, isTokenExpired: false },
    isLoading: isLoadingTokenStatus,
    isFetching,
    refetch
  } = useQuery({
    queryKey,
    queryFn: fetchTokenStatus,
    enabled: !!user && !!organization,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    placeholderData: keepPreviousData,
    retry: 1,
  });

  // Handle OAuth callback params
  useEffect(() => {
    if (!user || !organization) return;

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

      // Invalidate the query to refetch
      queryClient.invalidateQueries({ queryKey: ['instagramTokenStatus'] });

      // Refresh again after a delay to ensure token is processed
      setTimeout(() => {
        console.log('Refreshing token status again after OAuth callback...');
        queryClient.invalidateQueries({ queryKey: ['instagramTokenStatus'] });
      }, 2000);
    }
  }, [user?.id, organization?.id, queryClient]);

  const refreshTokenStatus = async () => {
    await refetch();
  };

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
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        toast.error('No se pudo preparar tu organización. Reintenta.');
        return;
      }
    }

    if (!organization) {
      toast.error('No se encontró organización');
      return;
    }

    try {
      setIsConnecting(true);

      console.log('Attempting Instagram connection for organization:', organization.id);

      const { data, error } = await supabase.functions.invoke('meta-oauth?action=authorize', {
        body: {
          user_id: user?.id,
          organization_id: organization.id,
          type: 'organization'
        }
      });

      if (error) {
        console.error('Error initiating Instagram connection:', error);

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

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['instagramTokenStatus'] });
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

      // Invalidate query to get new expiry date
      queryClient.invalidateQueries({ queryKey: ['instagramTokenStatus'] });
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
    isLoadingTokenStatus: (isLoadingTokenStatus && !tokenStatus.isConnected) || loading,
    connectInstagram,
    disconnectInstagram,
    lastSync: tokenStatus.lastSync,
    refreshTokenStatus,
    tokenExpiryDate: tokenStatus.tokenExpiryDate,
    daysUntilExpiry: tokenStatus.daysUntilExpiry,
    needsRefresh: tokenStatus.needsRefresh,
    showWarning: tokenStatus.showWarning,
    username: tokenStatus.username,
    refreshToken,
    isRefreshingToken
  };
}
