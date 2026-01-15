import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useMemo, useRef, useEffect } from 'react';
import { useCurrentOrganization } from './useCurrentOrganization';
import { useInstagramConnection } from './useInstagramConnection';
import { supabase } from '@/integrations/supabase/client';
import { QUERY_KEYS } from '@/constants';

export interface SystemCheck {
  name: string;
  status: 'success' | 'warning' | 'error';
  description: string;
  action?: string;
}

async function fetchSystemChecks(
  organization: {
    id: string;
    name: string;
    instagram_username: string | null;
    last_instagram_sync: string | null;
  } | null,
  isConnected: boolean,
  isTokenExpired: boolean
): Promise<SystemCheck[]> {
  if (!organization) return [];

  const checks: SystemCheck[] = [];

  try {
    // Check 1: Organization setup
    checks.push({
      name: 'Organización configurada',
      status: organization ? 'success' : 'error',
      description: organization
        ? `Organización: ${organization.name}`
        : 'No se encontró organización activa',
    });

    // Check 2: Instagram connection
    checks.push({
      name: 'Conexión de Instagram',
      status: isConnected ? 'success' : 'error',
      description: isConnected
        ? `Conectado como @${organization.instagram_username}`
        : 'Instagram no está conectado',
      action: !isConnected ? 'Conectar Instagram' : undefined,
    });

    // Check 3: Token status
    if (isConnected) {
      checks.push({
        name: 'Estado del token',
        status: isTokenExpired ? 'error' : 'success',
        description: isTokenExpired
          ? 'Token expirado - requiere renovación'
          : 'Token válido y activo',
        action: isTokenExpired ? 'Renovar token' : undefined,
      });
    }

    // Check 4: Database tables
    const { data: socialMentions, error: mentionsError } = await supabase
      .from('social_mentions')
      .select('id, created_at')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
      .limit(1);

    checks.push({
      name: 'Base de datos',
      status: mentionsError ? 'error' : 'success',
      description: mentionsError
        ? `Error de base de datos: ${mentionsError.message}`
        : socialMentions && socialMentions.length > 0
          ? `Última actividad: ${new Date(socialMentions[0].created_at).toLocaleString('es-ES')}`
          : 'Base de datos operativa - sin actividad reciente',
    });

    // Check 5: Credentials
    const { data: credsStatus } = await supabase.rpc('get_org_meta_credentials_status', {
      p_organization_id: organization.id,
    });

    const hasCredentials = credsStatus && credsStatus.length > 0 && credsStatus[0].has_credentials;

    checks.push({
      name: 'Credenciales de Meta App',
      status: hasCredentials ? 'success' : 'warning',
      description: hasCredentials
        ? 'Credenciales configuradas correctamente'
        : 'Credenciales no configuradas o faltantes',
      action: !hasCredentials ? 'Configurar credenciales' : undefined,
    });

    // Check 6: Recent sync
    const lastSync = organization.last_instagram_sync;
    const syncStatus = lastSync
      ? new Date(Date.now() - new Date(lastSync).getTime()).getTime() < 24 * 60 * 60 * 1000
      : false;

    checks.push({
      name: 'Sincronización reciente',
      status: syncStatus ? 'success' : 'warning',
      description: lastSync
        ? `Última sincronización: ${new Date(lastSync).toLocaleString('es-ES')}`
        : 'No se ha sincronizado nunca',
      action: 'Sincronizar ahora',
    });
  } catch (error) {
    console.error('Error running system checks:', error);
    checks.push({
      name: 'Error del sistema',
      status: 'error',
      description: `Error al ejecutar diagnósticos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
    });
  }

  return checks;
}

export function useSystemChecks() {
  const { organization } = useCurrentOrganization();
  const { isConnected, isTokenExpired } = useInstagramConnection();
  const queryClient = useQueryClient();

  // Use refs to store the latest connection values without causing queryKey changes
  const connectionRef = useRef({ isConnected, isTokenExpired });
  useEffect(() => {
    connectionRef.current = { isConnected, isTokenExpired };
  }, [isConnected, isTokenExpired]);

  // Stable queryKey using centralized QUERY_KEYS - only changes when organization changes
  const queryKey = useMemo(
    () => QUERY_KEYS.systemChecks(organization?.id || ''),
    [organization?.id]
  );

  const {
    data: systemChecks = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () =>
      fetchSystemChecks(
        organization
          ? {
              id: organization.id,
              name: organization.name,
              instagram_username: organization.instagram_username,
              last_instagram_sync: organization.last_instagram_sync,
            }
          : null,
        connectionRef.current.isConnected,
        connectionRef.current.isTokenExpired
      ),
    enabled: !!organization,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    placeholderData: keepPreviousData, // Keep showing old data while fetching new
  });

  const refreshSystemChecks = async () => {
    await refetch();
  };

  const invalidateSystemChecks = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  return {
    systemChecks,
    isLoading: isLoading && systemChecks.length === 0, // Only show loading on first fetch
    isFetching,
    error,
    refreshSystemChecks,
    invalidateSystemChecks,
  };
}
