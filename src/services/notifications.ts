import { supabase } from '@/integrations/supabase/client';
import { BaseService, executeQuery } from './base';
import { handleError } from '@/lib/errors';
import type {
  Notification,
  NotificationInsert,
  NotificationUpdate,
  NotificationPriority,
  NotificationType,
} from '@/types/entities';

/**
 * Notification service
 */
class NotificationService extends BaseService<
  Notification,
  NotificationInsert,
  NotificationUpdate,
  'notifications'
> {
  constructor() {
    super('notifications', 'NotificationService');
  }

  /**
   * Get notifications with pagination
   */
  async getPaginated(
    organizationId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<Notification[]> {
    const { limit = 50, offset = 0, unreadOnly = false } = options;

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('read_status', false);
    }

    const result = await executeQuery(query, 'NotificationService.getPaginated');
    return (result as Notification[]) ?? [];
  }

  /**
   * Get unread count
   */
  async getUnreadCount(organizationId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('read_status', false);

    if (error) {
      handleError('NotificationService.getUnreadCount', error);
      return 0;
    }

    return count ?? 0;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    const result = await executeQuery(
      supabase
        .from('notifications')
        .update({ read_status: true })
        .eq('id', notificationId)
        .select()
        .single(),
      'NotificationService.markAsRead'
    );

    return result !== null;
  }

  /**
   * Mark all notifications as read for an organization
   */
  async markAllAsRead(organizationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ read_status: true })
      .eq('organization_id', organizationId)
      .eq('read_status', false);

    if (error) {
      handleError('NotificationService.markAllAsRead', error, { showToast: true });
      return false;
    }

    return true;
  }

  /**
   * Create a notification
   */
  async createNotification(
    organizationId: string,
    type: NotificationType,
    message: string,
    options: {
      priority?: NotificationPriority;
      targetType?: string;
      targetId?: string;
    } = {}
  ): Promise<Notification | null> {
    const { priority = 'normal', targetType, targetId } = options;

    return this.create({
      organization_id: organizationId,
      type,
      message,
      priority,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      read_status: false,
    });
  }

  /**
   * Delete old notifications
   */
  async deleteOldNotifications(
    organizationId: string,
    daysOld = 30
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('organization_id', organizationId)
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      handleError('NotificationService.deleteOldNotifications', error);
      return 0;
    }

    return data?.length ?? 0;
  }

  /**
   * Get notifications by type
   */
  async getByType(
    organizationId: string,
    type: NotificationType,
    limit = 20
  ): Promise<Notification[]> {
    const result = await executeQuery(
      supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(limit),
      'NotificationService.getByType'
    );

    return (result as Notification[]) ?? [];
  }

  /**
   * Get high priority notifications
   */
  async getHighPriority(organizationId: string): Promise<Notification[]> {
    const result = await executeQuery(
      supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', organizationId)
        .in('priority', ['high', 'critical'])
        .eq('read_status', false)
        .order('created_at', { ascending: false }),
      'NotificationService.getHighPriority'
    );

    return (result as Notification[]) ?? [];
  }

  /**
   * Subscribe to new notifications (returns unsubscribe function)
   */
  subscribeToNotifications(
    organizationId: string,
    callback: (notification: Notification) => void
  ): () => void {
    const channel = supabase
      .channel(`notifications:${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

/**
 * Singleton instance
 */
export const notificationService = new NotificationService();
