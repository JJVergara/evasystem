import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { useAuth } from './useAuth';
import { QUERY_KEYS } from '@/constants';

interface DashboardStats {
  totalOrganizations: number;
  totalEvents: number;
  totalAmbassadors: number;
}

const DEFAULT_STATS: DashboardStats = {
  totalOrganizations: 0,
  totalEvents: 0,
  totalAmbassadors: 0,
};

async function fetchDashboardStats(userId: string): Promise<DashboardStats> {
  const { data: organizations, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('created_by', userId);

  if (orgError) throw orgError;

  const organizationIds = organizations?.map((org) => org.id) || [];

  if (organizationIds.length === 0) {
    return { ...DEFAULT_STATS, totalOrganizations: 0 };
  }

  const [fiestasResult, ambassadorsResult] = await Promise.all([
    supabase.from('fiestas').select('id').in('organization_id', organizationIds),
    supabase.from('embassadors').select('id').in('organization_id', organizationIds),
  ]);

  if (fiestasResult.error) throw fiestasResult.error;
  if (ambassadorsResult.error) throw ambassadorsResult.error;

  return {
    totalOrganizations: organizations?.length || 0,
    totalEvents: fiestasResult.data?.length || 0,
    totalAmbassadors: ambassadorsResult.data?.length || 0,
  };
}

export function useDashboardStats() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const userId = user?.id;
  const queryKey = QUERY_KEYS.dashboardStats(userId || '');

  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => fetchDashboardStats(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const refreshStats = useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    [queryClient, queryKey]
  );

  return {
    stats: stats || DEFAULT_STATS,
    loading: isLoading,
    error: error ? 'Error al cargar estadísticas del dashboard' : null,
    refreshStats,
  };
}
