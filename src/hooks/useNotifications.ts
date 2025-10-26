
import { useState, useEffect } from "react";
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

export function useNotifications() {
  const { profile } = useUserProfile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchNotifications();
      subscribeToNotifications();
    }
  }, [profile?.organization_id]);

  const fetchNotifications = async () => {
    if (!profile?.organization_id) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('id, organization_id, type, message, target_type, target_id, read_status, priority, created_at')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      // Type assertion to ensure proper typing
      const notificationsData = (data || []).map(notification => ({
        ...notification,
        priority: notification.priority as 'low' | 'normal' | 'high' | 'critical'
      }));
      
      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter(n => !n.read_status).length);

    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
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
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Mostrar toast para notificaciones importantes
          if (newNotification.priority === 'high' || newNotification.priority === 'critical') {
            toast.warning(newNotification.message);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_status: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read_status: true }
            : n
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));

    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!profile?.organization_id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_status: true })
        .eq('organization_id', profile.organization_id)
        .eq('read_status', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(n => ({ ...n, read_status: true }))
      );

      setUnreadCount(0);
      toast.success('Todas las notificaciones marcadas como leídas');

    } catch (err) {
      console.error('Error marking all notifications as read:', err);
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
