import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Instagram,
  Clock,
  User,
  Calendar,
  Filter,
  Check,
  Trash2,
  ExternalLink,
  Search,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type:
    | 'story_deleted'
    | 'task_expired'
    | 'token_expiring'
    | 'performance_change'
    | 'ambassador_pending'
    | 'general';
  message: string;
  priority: 'low' | 'normal' | 'high';
  read_status: boolean;
  created_at: string;
  target_type: 'user' | 'ambassador' | 'event' | 'organization';
  target_id?: string;
  metadata?: {
    ambassador_name?: string;
    event_name?: string;
    days_remaining?: number;
    old_performance?: string;
    new_performance?: string;
  };
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, selectedTab, priorityFilter, searchQuery]);

  const loadNotifications = async () => {
    try {
      setLoading(true);

      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'token_expiring',
          message: 'Tu token de Instagram expira en 3 días',
          priority: 'high',
          read_status: false,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          target_type: 'organization',
          metadata: { days_remaining: 3 },
        },
        {
          id: '2',
          type: 'story_deleted',
          message: 'Historia eliminada antes de 24h por María González',
          priority: 'normal',
          read_status: false,
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          target_type: 'ambassador',
          target_id: 'amb1',
          metadata: { ambassador_name: 'María González', event_name: 'Campaña Verano' },
        },
        {
          id: '3',
          type: 'ambassador_pending',
          message: 'Nuevo embajador detectado: Carlos Ruiz requiere aprobación',
          priority: 'normal',
          read_status: true,
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          target_type: 'ambassador',
          target_id: 'amb2',
          metadata: { ambassador_name: 'Carlos Ruiz' },
        },
        {
          id: '4',
          type: 'task_expired',
          message: "Tareas vencidas en evento 'Black Friday'",
          priority: 'high',
          read_status: false,
          created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          target_type: 'event',
          target_id: 'event1',
          metadata: { event_name: 'Black Friday' },
        },
        {
          id: '5',
          type: 'performance_change',
          message: "Ana Silva cambió de 'cumple' a 'advertencia'",
          priority: 'normal',
          read_status: true,
          created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          target_type: 'ambassador',
          target_id: 'amb3',
          metadata: {
            ambassador_name: 'Ana Silva',
            old_performance: 'cumple',
            new_performance: 'advertencia',
          },
        },
      ];

      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las notificaciones',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;

    if (selectedTab !== 'all') {
      if (selectedTab === 'unread') {
        filtered = filtered.filter((n) => !n.read_status);
      } else {
        filtered = filtered.filter((n) => n.type === selectedTab);
      }
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter((n) => n.priority === priorityFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (n) =>
          n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (n.metadata?.ambassador_name &&
            n.metadata.ambassador_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (n.metadata?.event_name &&
            n.metadata.event_name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredNotifications(filtered);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read_status: true } : n))
      );

      toast({
        title: 'Notificación marcada como leída',
        description: 'La notificación ha sido marcada como leída',
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read_status: true })));

      toast({
        title: 'Todas las notificaciones marcadas como leídas',
        description: 'Se han marcado todas las notificaciones como leídas',
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

      toast({
        title: 'Notificación eliminada',
        description: 'La notificación ha sido eliminada',
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass =
      priority === 'high'
        ? 'text-destructive'
        : priority === 'normal'
          ? 'text-warning'
          : 'text-muted-foreground';

    switch (type) {
      case 'story_deleted':
        return <Instagram className={`w-4 h-4 ${iconClass}`} />;
      case 'task_expired':
        return <Clock className={`w-4 h-4 ${iconClass}`} />;
      case 'token_expiring':
        return <AlertTriangle className={`w-4 h-4 ${iconClass}`} />;
      case 'performance_change':
        return <User className={`w-4 h-4 ${iconClass}`} />;
      case 'ambassador_pending':
        return <User className={`w-4 h-4 ${iconClass}`} />;
      default:
        return <Bell className={`w-4 h-4 ${iconClass}`} />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return (
          <Badge variant="destructive" className="text-xs">
            Alta
          </Badge>
        );
      case 'normal':
        return (
          <Badge variant="secondary" className="text-xs">
            Normal
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="outline" className="text-xs">
            Baja
          </Badge>
        );
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Hace menos de 1 hora';
    if (diffInHours < 24) return `Hace ${diffInHours} horas`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `Hace ${diffInDays} días`;
  };

  const unreadCount = notifications.filter((n) => !n.read_status).length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Centro de Notificaciones
          </h1>
          <p className="text-muted-foreground">
            Gestiona todas tus alertas y notificaciones
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} sin leer
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Marcar todas como leídas
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar notificaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="unread">Sin Leer</TabsTrigger>
          <TabsTrigger value="token_expiring">Tokens</TabsTrigger>
          <TabsTrigger value="story_deleted">Historias</TabsTrigger>
          <TabsTrigger value="ambassador_pending">Embajadores</TabsTrigger>
          <TabsTrigger value="task_expired">Tareas</TabsTrigger>
        </TabsList>

        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay notificaciones</h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? 'No se encontraron notificaciones que coincidan con tu búsqueda'
                    : selectedTab === 'unread'
                      ? '¡Genial! No tienes notificaciones sin leer'
                      : 'No hay notificaciones disponibles en esta categoría'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`shadow-card transition-all hover:shadow-elegant ${
                  !notification.read_status ? 'border-primary/50 bg-gradient-card' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type, notification.priority)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          {getPriorityBadge(notification.priority)}
                          {!notification.read_status && (
                            <Badge variant="default" className="text-xs">
                              Nuevo
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>{getTimeAgo(notification.created_at)}</span>
                          {notification.metadata?.event_name && (
                            <span>Evento: {notification.metadata.event_name}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {notification.target_id && (
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      {!notification.read_status && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </Tabs>
    </div>
  );
}
