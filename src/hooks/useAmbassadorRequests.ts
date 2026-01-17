import { useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { useCurrentOrganization } from './useCurrentOrganization';
import { useRealtimeSocialMentions } from './useRealtimeSocialMentions';
import { QUERY_KEYS } from '@/constants';
import type { AmbassadorRequest, ApproveRequestInput } from '@/types';

export type { AmbassadorRequest };

async function fetchRequests(organizationId: string): Promise<AmbassadorRequest[]> {
  const { data, error } = await supabase
    .from('ambassador_requests')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Error al cargar solicitudes de embajadores');
  }

  return data || [];
}

export function useAmbassadorRequests() {
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const queryClient = useQueryClient();

  const organizationId = organization?.id;
  const queryKey = QUERY_KEYS.ambassadorRequests(organizationId || '');

  const {
    data: requests = [],
    isLoading: requestsLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => fetchRequests(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  useRealtimeSocialMentions({
    onNewAmbassadorRequest: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({
      requestId,
      ambassadorData,
    }: {
      requestId: string;
      ambassadorData: ApproveRequestInput;
    }) => {
      const request = requests.find((r) => r.id === requestId);
      if (!request) throw new Error('Solicitud no encontrada');

      const { data: ambassador, error: ambassadorError } = await supabase
        .from('embassadors')
        .insert({
          ...ambassadorData,
          instagram_user: request.instagram_username,
          instagram_user_id: request.instagram_user_id,
          follower_count: request.follower_count,
          profile_picture_url: request.profile_picture_url,
          organization_id: organizationId,
          status: 'active',
          global_points: 0,
          global_category: 'bronze',
        })
        .select()
        .single();

      if (ambassadorError) throw ambassadorError;

      if (request.source_mention_ids?.length) {
        const { error: updateMentionsError } = await supabase
          .from('social_mentions')
          .update({
            matched_ambassador_id: ambassador.id,
            processed: true,
            processed_at: new Date().toISOString(),
          })
          .in('id', request.source_mention_ids);
      }

      const { error: updateError } = await supabase
        .from('ambassador_requests')
        .update({ status: 'approved', processed_at: new Date().toISOString() })
        .eq('id', requestId);

      if (updateError) throw updateError;

      return ambassador;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Embajador aprobado exitosamente');
    },
    onError: () => {
      toast.error('Error al aprobar solicitud');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
      const { error } = await supabase
        .from('ambassador_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          processed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Solicitud rechazada');
    },
    onError: () => {
      toast.error('Error al rechazar solicitud');
    },
  });

  const approveRequest = useCallback(
    (requestId: string, ambassadorData: ApproveRequestInput) =>
      approveMutation.mutateAsync({ requestId, ambassadorData }),
    [approveMutation]
  );

  const rejectRequest = useCallback(
    (requestId: string, reason?: string) => rejectMutation.mutateAsync({ requestId, reason }),
    [rejectMutation]
  );

  const getPendingCount = useCallback(
    () => requests.filter((r) => r.status === 'pending').length,
    [requests]
  );

  const refreshRequests = useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    [queryClient, queryKey]
  );

  const loading = orgLoading || (!!organizationId && requestsLoading);

  return {
    requests,
    loading,
    error: error ? 'Error al cargar solicitudes de embajadores' : null,
    approveRequest,
    rejectRequest,
    getPendingCount,
    refreshRequests,
  };
}
