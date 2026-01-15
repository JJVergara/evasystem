
import { useMemo } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

interface SimpleActivity {
  id: string;
  type: string;
  message: string;
  created_at: string;
}

async function fetchActivities(userId: string): Promise<SimpleActivity[]> {
  const activities: SimpleActivity[] = [];

  // Check user organizations
  const { data: organizations, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, description, timezone, logo_url, plan_type, instagram_username, facebook_page_id, instagram_business_account_id, instagram_user_id, last_instagram_sync, created_by, created_at')
    .eq('created_by', userId);

  if (!orgError && organizations && organizations.length > 0) {
    activities.push({
      id: `org-summary`,
      type: 'success',
      message: `Dashboard cargado: ${organizations.length} organización(es) activa(s)`,
      created_at: new Date().toISOString()
    });
  }

  return activities;
}

export const useRealtimeCards = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ['realtimeCards', user?.id],
    [user?.id]
  );

  const { data: cards = [], isLoading: loading, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchActivities(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    placeholderData: keepPreviousData,
  });

  const markAsRead = async (cardId: string) => {
    queryClient.setQueryData<SimpleActivity[]>(queryKey, (old = []) => {
      return old.filter(card => card.id !== cardId);
    });
    toast.success('Actividad marcada como leída');
  };

  const refreshCards = async () => {
    await refetch();
    toast.success('Actividades actualizadas');
  };

  return {
    cards,
    loading: loading && cards.length === 0,
    markAsRead,
    refreshCards
  };
};
