import { useState, useEffect } from "react";
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

export function useAmbassadorRequests() {
  const { organization } = useCurrentOrganization();
  const [requests, setRequests] = useState<AmbassadorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organization) {
      fetchRequests();
    }
  }, [organization]);

  // Setup realtime subscriptions for live updates
  useRealtimeSocialMentions({
    onNewAmbassadorRequest: () => {
      // Refresh requests when new one arrives
      fetchRequests();
    }
  });

  const fetchRequests = async () => {
    if (!organization) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('ambassador_requests')
        .select('id, organization_id, instagram_user_id, instagram_username, bio, follower_count, profile_picture_url, source_mention_ids, total_mentions, last_mention_at, status, processed_by_user_id, processed_at, rejection_reason, notes, created_at')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching ambassador requests:', fetchError);
        setError('Error al cargar solicitudes de embajadores');
        return;
      }

      setRequests((data || []).map(req => ({...req, status: req.status as 'pending' | 'approved' | 'rejected'})));

    } catch (err) {
      console.error('Error fetching ambassador requests:', err);
      setError('Error inesperado al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (requestId: string, ambassadorData: {
    first_name: string;
    last_name: string;
    email: string;
    date_of_birth?: string;
    rut?: string;
  }) => {
    try {
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

      toast.success('Embajador aprobado exitosamente');
      fetchRequests(); // Refresh data
      
      return ambassador;
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Error al aprobar solicitud');
      throw error;
    }
  };

  const rejectRequest = async (requestId: string, reason?: string) => {
    try {
      const { error } = await supabase
        .from('ambassador_requests')
        .update({ 
          status: 'rejected',
          rejection_reason: reason,
          processed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Solicitud rechazada');
      fetchRequests(); // Refresh data
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Error al rechazar solicitud');
    }
  };

  const getPendingCount = () => {
    return requests.filter(r => r.status === 'pending').length;
  };

  return {
    requests,
    loading,
    error,
    approveRequest,
    rejectRequest,
    getPendingCount,
    refreshRequests: fetchRequests
  };
}