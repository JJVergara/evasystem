import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface DashboardStats {
  totalOrganizations: number;
  totalEvents: number;
  totalAmbassadors: number;
}

async function fetchDashboardStatsData(userId: string): Promise<DashboardStats> {
  // Obtener organizaciones del usuario
  const { data: organizations, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('created_by', userId);

  if (orgError) throw orgError;

  const organizationIds = organizations?.map(org => org.id) || [];

  // Obtener eventos de las organizaciones del usuario
  let totalEvents = 0;
  let totalAmbassadors = 0;

  if (organizationIds.length > 0) {
    const { data: fiestas, error: fiestasError } = await supabase
      .from('fiestas')
      .select('id')
      .in('organization_id', organizationIds);

    if (fiestasError) throw fiestasError;
    totalEvents = fiestas?.length || 0;

    const { data: ambassadors, error: ambassadorsError } = await supabase
      .from('embassadors')
      .select('id')
      .in('organization_id', organizationIds);

    if (ambassadorsError) throw ambassadorsError;
    totalAmbassadors = ambassadors?.length || 0;
  }

  return {
    totalOrganizations: organizations?.length || 0,
    totalEvents,
    totalAmbassadors
  };
}

export function useDashboardStats() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => ['dashboardStats', user?.id], [user?.id]);

  const { data: stats, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchDashboardStatsData(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes cache
  });

  const refreshStats = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    stats: stats || {
      totalOrganizations: 0,
      totalEvents: 0,
      totalAmbassadors: 0
    },
    loading: isLoading,
    error: error ? 'Error al cargar estadísticas del dashboard' : null,
    refreshStats
  };
}
