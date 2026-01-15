
import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "./useUserProfile";
import { toast } from "sonner";

interface Notification {
  id: string;
  organization_id: string;
  type: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  target_type: string | null;
  target_id: string | null;
  read_status: boolean;
  created_at: string;
}

async function fetchNotifications(organizationId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, organization_id, type, message, target_type, target_id, read_status, priority, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }

  return (data || []).map(notification => ({
    ...notification,
    priority: notification.priority as 'low' | 'normal' | 'high' | 'critical'
  }));
}

export function useNotifications() {
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ['notifications', profile?.organization_id],
    [profile?.organization_id]
  );

  const { data: notifications = [], isLoading: loading, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchNotifications(profile!.organization_id!),
    enabled: !!profile?.organization_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    placeholderData: keepPreviousData,
  });

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read_status).length,
    [notifications]
  );

  // Set up realtime subscription
  useEffect(() => {
    if (!profile?.organization_id) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `organization_id=eq.${profile.organization_id}`,
        },
        (payload) => {
          const newNotification = {
            ...payload.new,
            priority: payload.new.priority as 'low' | 'normal' | 'high' | 'critical'
          } as Notification;

          // Update cache with new notification
          queryClient.setQueryData<Notification[]>(queryKey, (old = []) => {
            return [newNotification, ...old];
          });

          // Show toast for important notifications
          if (newNotification.priority === 'high' || newNotification.priority === 'critical') {
            toast.warning(newNotification.message);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [profile?.organization_id, queryKey, queryClient]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_status: true })
        .eq('id', notificationId);

      if (error) throw error;
      return notificationId;
    },
    onSuccess: (notificationId) => {
      // Update cache optimistically
      queryClient.setQueryData<Notification[]>(queryKey, (old = []) => {
        return old.map(n =>
          n.id === notificationId ? { ...n, read_status: true } : n
        );
      });
    },
    onError: (error) => {
      console.error('Error marking notification as read:', error);
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.organization_id) throw new Error('No organization');

      const { error } = await supabase
        .from('notifications')
        .update({ read_status: true })
        .eq('organization_id', profile.organization_id)
        .eq('read_status', false);

      if (error) throw error;
    },
    onSuccess: () => {
      // Update cache optimistically
      queryClient.setQueryData<Notification[]>(queryKey, (old = []) => {
        return old.map(n => ({ ...n, read_status: true }));
      });
      toast.success('Todas las notificaciones marcadas como leídas');
    },
    onError: (error) => {
      console.error('Error marking all notifications as read:', error);
    }
  });

  const markAsRead = async (notificationId: string) => {
    await markAsReadMutation.mutateAsync(notificationId);
  };

  const markAllAsRead = async () => {
    await markAllAsReadMutation.mutateAsync();
  };

  return {
    notifications,
    unreadCount,
    loading: loading && notifications.length === 0,
    markAsRead,
    markAllAsRead,
    refreshNotifications: refetch
  };
}
