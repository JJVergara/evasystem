import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrganization } from "./useCurrentOrganization";

export interface AmbassadorRankingData {
  id: string;
  first_name: string;
  last_name: string;
  instagram_user: string | null;
  rank: number;
  global_points: number;
  global_category: string;
  events_participated: number;
  completed_tasks: number;
  failed_tasks: number;
  completion_rate: number;
  total_tasks: number;
}

async function fetchAmbassadorRankingData(organizationId: string): Promise<AmbassadorRankingData[]> {
  // Fetch ambassadors for the organization, ordered by global_points
  const { data: ambassadors, error: ambassadorsError } = await supabase
    .from('embassadors')
    .select('id, first_name, last_name, instagram_user, global_points, global_category, events_participated, completed_tasks, failed_tasks')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('global_points', { ascending: false });

  if (ambassadorsError) {
    throw ambassadorsError;
  }

  if (!ambassadors || ambassadors.length === 0) {
    return [];
  }

  // Process and rank ambassadors
  return ambassadors.map((ambassador, index) => {
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
      total_tasks: totalTasks
    };
  });
}

export function useAmbassadorRanking() {
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const queryClient = useQueryClient();

  const queryKey = ['ambassadorRanking', organization?.id];

  const { data: ranking, isLoading: rankingLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchAmbassadorRankingData(organization!.id),
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes cache
  });

  const refreshRanking = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const loading = orgLoading || (!!organization?.id && rankingLoading);

  return {
    ranking: ranking || [],
    loading,
    error: error ? 'Error al cargar el ranking de embajadores' : null,
    refreshRanking
  };
}
