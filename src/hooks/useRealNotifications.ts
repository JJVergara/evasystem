import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrganization } from './useCurrentOrganization';

interface Notification {
  id: string;
  type: string;
  message: string;
  priority: string;
  read_status: boolean;
  created_at: string;
  target_type?: string;
  target_id?: string;
}

async function fetchNotificationsData(organizationId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id, organization_id, type, message, target_type, target_id, read_status, priority, created_at'
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
}

export function useRealNotifications() {
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const queryClient = useQueryClient();

  const queryKey = ['notifications', organization?.id];

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey,
    queryFn: () => fetchNotificationsData(organization!.id),
    enabled: !!organization?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const unreadCount = notifications.filter((n) => !n.read_status).length;

  useEffect(() => {
    if (!organization?.id) return;

    const subscription = supabase
      .channel(`notifications-${organization.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `organization_id=eq.${organization.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [organization?.id, queryClient, queryKey]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ read_status: true })
          .eq('id', notificationId);

        if (error) throw error;

        queryClient.setQueryData<Notification[]>(queryKey, (old) =>
          old?.map((n) => (n.id === notificationId ? { ...n, read_status: true } : n))
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    },
    [queryClient, queryKey]
  );

  const markAllAsRead = useCallback(async () => {
    if (!organization?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_status: true })
        .eq('organization_id', organization.id)
        .eq('read_status', false);

      if (error) throw error;

      queryClient.setQueryData<Notification[]>(queryKey, (old) =>
        old?.map((n) => ({ ...n, read_status: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [organization?.id, queryClient, queryKey]);

  const refreshNotifications = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const loading = orgLoading || (!!organization?.id && notificationsLoading);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  };
}
