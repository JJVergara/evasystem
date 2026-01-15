import { useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrganization } from "./useCurrentOrganization";
import { useRealtimeSocialMentions } from "./useRealtimeSocialMentions";
import { toast } from "sonner";

export interface AmbassadorRequest {
  id: string;
  instagram_username: string;
  instagram_user_id?: string;
  follower_count: number;
  profile_picture_url?: string;
  bio?: string;
  status: 'pending' | 'approved' | 'rejected';
  total_mentions: number;
  last_mention_at: string;
  created_at: string;
  notes?: string;
  source_mention_ids: string[];
}

async function fetchRequestsData(organizationId: string): Promise<AmbassadorRequest[]> {
  const { data, error: fetchError } = await supabase
    .from('ambassador_requests')
    .select('id, organization_id, instagram_user_id, instagram_username, bio, follower_count, profile_picture_url, source_mention_ids, total_mentions, last_mention_at, status, processed_by_user_id, processed_at, rejection_reason, notes, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('Error fetching ambassador requests:', fetchError);
    throw new Error('Error al cargar solicitudes de embajadores');
  }

  return (data || []).map(req => ({
    ...req,
    status: req.status as 'pending' | 'approved' | 'rejected'
  }));
}

export function useAmbassadorRequests() {
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const queryClient = useQueryClient();

  const queryKey = ['ambassadorRequests', organization?.id];

  const { data: requests = [], isLoading: requestsLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchRequestsData(organization!.id),
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes cache
  });

  // Setup realtime subscriptions for live updates
  useRealtimeSocialMentions({
    onNewAmbassadorRequest: () => {
      // Refresh requests when new one arrives
      queryClient.invalidateQueries({ queryKey });
    }
  });

  const approveMutation = useMutation({
    mutationFn: async ({ requestId, ambassadorData }: {
      requestId: string;
      ambassadorData: {
        first_name: string;
        last_name: string;
        email: string;
        date_of_birth?: string;
        rut?: string;
      };
    }) => {
      const request = requests.find(r => r.id === requestId);
      if (!request) throw new Error('Solicitud no encontrada');

      // Create ambassador
      const { data: ambassador, error: ambassadorError } = await supabase
        .from('embassadors')
        .insert({
          ...ambassadorData,
          instagram_user: request.instagram_username,
          instagram_user_id: request.instagram_user_id,
          follower_count: request.follower_count,
          profile_picture_url: request.profile_picture_url,
          organization_id: organization?.id,
          status: 'active',
          global_points: 0,
          global_category: 'bronze'
        })
        .select()
        .single();

      if (ambassadorError) throw ambassadorError;

      // Update all related social mentions to link to this ambassador
      const { error: updateMentionsError } = await supabase
        .from('social_mentions')
        .update({
          matched_ambassador_id: ambassador.id,
          processed: true,
          processed_at: new Date().toISOString()
        })
        .in('id', request.source_mention_ids);

      if (updateMentionsError) {
        console.error('Error updating social mentions:', updateMentionsError);
      }

      // Update request status
      const { error: updateError } = await supabase
        .from('ambassador_requests')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString()
        })
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
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
      const { error } = await supabase
        .from('ambassador_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          processed_at: new Date().toISOString()
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
    }
  });

  const approveRequest = useCallback(async (requestId: string, ambassadorData: {
    first_name: string;
    last_name: string;
    email: string;
    date_of_birth?: string;
    rut?: string;
  }) => {
    return approveMutation.mutateAsync({ requestId, ambassadorData });
  }, [approveMutation]);

  const rejectRequest = useCallback(async (requestId: string, reason?: string) => {
    return rejectMutation.mutateAsync({ requestId, reason });
  }, [rejectMutation]);

  const getPendingCount = useCallback(() => {
    return requests.filter(r => r.status === 'pending').length;
  }, [requests]);

  const refreshRequests = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const loading = orgLoading || (!!organization?.id && requestsLoading);

  return {
    requests,
    loading,
    error: error ? 'Error al cargar solicitudes de embajadores' : null,
    approveRequest,
    rejectRequest,
    getPendingCount,
    refreshRequests
  };
}
