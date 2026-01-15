/**
 * useAmbassadorRanking hook
 * Manages ambassador ranking data fetching
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useCurrentOrganization } from './useCurrentOrganization';
import { QUERY_KEYS } from '@/constants';
import { getAmbassadors } from '@/services/api';

/**
 * Extended ranking data with computed fields
 */
export interface AmbassadorRankingData {
  id: string;
  first_name: string;
  last_name: string;
  instagram_user: string;
  rank: number;
  global_points: number;
  global_category: string;
  events_participated: number;
  completed_tasks: number;
  failed_tasks: number;
  completion_rate: number;
  total_tasks: number;
}

export function useAmbassadorRanking() {
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const queryClient = useQueryClient();

  const organizationId = organization?.id;
  const queryKey = QUERY_KEYS.ambassadorRanking(organizationId || '');

  const { data: ranking = [], isLoading: rankingLoading, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<AmbassadorRankingData[]> => {
      const ambassadors = await getAmbassadors(organizationId!);

      // Filter active ambassadors and sort by points
      const activeAmbassadors = ambassadors
        .filter(a => a.status === 'active')
        .sort((a, b) => (b.global_points || 0) - (a.global_points || 0));

      // Compute ranking data
      return activeAmbassadors.map((ambassador, index) => {
        const totalTasks = (ambassador.completed_tasks || 0) + (ambassador.failed_tasks || 0);
        const completionRate = totalTasks > 0
          ? Math.round(((ambassador.completed_tasks || 0) / totalTasks) * 100)
          : 0;

        return {
          id: ambassador.id,
          first_name: ambassador.first_name,
          last_name: ambassador.last_name,
          instagram_user: ambassador.instagram_user,
          rank: index + 1,
          global_points: ambassador.global_points || 0,
          global_category: ambassador.global_category || 'bronze',
          events_participated: ambassador.events_participated || 0,
          completed_tasks: ambassador.completed_tasks || 0,
          failed_tasks: ambassador.failed_tasks || 0,
          completion_rate: completionRate,
          total_tasks: totalTasks,
        };
      });
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const refreshRanking = useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    [queryClient, queryKey]
  );

  const loading = orgLoading || (!!organizationId && rankingLoading);

  return {
    ranking,
    loading,
    error: error ? 'Error al cargar el ranking de embajadores' : null,
    refreshRanking,
  };
}
