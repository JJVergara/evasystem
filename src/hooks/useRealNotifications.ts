import { useState, useEffect } from 'react';
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

export function useRealNotifications() {
  const { organization } = useCurrentOrganization();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization?.id) {
      fetchNotifications();
      setupRealtimeSubscription();
    }
  }, [organization?.id]);

  const fetchNotifications = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, organization_id, type, message, target_type, target_id, read_status, priority, created_at')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const notificationData = data || [];
      setNotifications(notificationData);
      setUnreadCount(notificationData.filter(n => !n.read_status).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!organization?.id) return;

    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `organization_id=eq.${organization.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 20));
          if (!(payload.new as Notification).read_status) {
            setUnreadCount(prev => prev + 1);
          }
        } else if (payload.eventType === 'UPDATE') {
          setNotifications(prev => 
            prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
          );
          fetchNotifications(); // Refresh to update counts
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_status: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read_status: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!organization?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_status: true })
        .eq('organization_id', organization.id)
        .eq('read_status', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, read_status: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications
  };
}