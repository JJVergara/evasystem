import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { LucideIcon } from 'lucide-react';
import { Bell, Check, AlertCircle, Info, Calendar, Users } from 'lucide-react';
import { useRealNotifications } from '@/hooks/useRealNotifications';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const NOTIFICATION_ICONS: Record<string, LucideIcon> = {
  info: Info,
  warning: AlertCircle,
  event: Calendar,
  ambassador: Users,
  system: Bell,
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-destructive',
  normal: 'text-foreground',
  low: 'text-muted-foreground',
};

function getNotificationIcon(type: string) {
  const Icon = NOTIFICATION_ICONS[type] || Info;
  return <Icon className="w-4 h-4" />;
}

function getPriorityColor(priority: string) {
  return PRIORITY_COLORS[priority] || PRIORITY_COLORS.normal;
}

export function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useRealNotifications();

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
    toast.success('Notificación marcada como leída');
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    toast.success('Todas las notificaciones marcadas como leídas');
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {!loading && unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 z-50 bg-background border">
        <div className="px-3 py-2 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notificaciones</h3>
            {!loading && unreadCount > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{unreadCount} nuevas</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs h-auto p-1"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Marcar todas
                </Button>
              </div>
            )}
          </div>
        </div>

        <ScrollArea className="h-96">
          {loading ? (
            <div className="space-y-1 p-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg">
                  <Skeleton className="h-4 w-4 mt-0.5 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No hay notificaciones</div>
          ) : (
            <div className="space-y-1 p-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent',
                    !notification.read_status && 'bg-primary/5'
                  )}
                  onClick={() => {
                    if (!notification.read_status) {
                      handleMarkAsRead(notification.id);
                    }
                  }}
                >
                  <div className={cn('mt-0.5', getPriorityColor(notification.priority))}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 space-y-1">
                    <p className="text-sm leading-tight">{notification.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(notification.created_at)}
                      </span>
                      {!notification.read_status && (
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          Nueva
                        </Badge>
                      )}
                    </div>
                  </div>

                  {!notification.read_status && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
