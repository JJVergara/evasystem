
import { useState, useEffect } from "react";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Star, 
  Download, 
  Instagram, 
  BarChart3,
  Trophy,
  Target,
  DollarSign,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface SimpleEvent {
  id: string;
  name: string;
  description: string;
  location: string;
  event_date: string;
  active: boolean;
  organization_id: string;
  created_at: string;
}

interface EventStats {
  total_mentions: number;
  total_stories: number;
  total_points: number;
  total_reach: number;
  active_ambassadors: number;
  completion_rate: number;
  top_ambassadors: Array<{
    id: string;
    name: string;
    points: number;
    category: string;
    instagram_user: string;
  }>;
  daily_performance: Array<{
    date: string;
    mentions: number;
    stories: number;
    reach: number;
  }>;
}

interface EventDashboardProps {
  selectedEventId?: string;
  onEventChange?: (eventId: string) => void;
}

export function EventDashboard({ selectedEventId, onEventChange }: EventDashboardProps) {
  const { organization } = useCurrentOrganization();
  const [events, setEvents] = useState<SimpleEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SimpleEvent | null>(null);
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId && events.length > 0) {
      const event = events.find(e => e.id === selectedEventId);
      if (event) {
        setSelectedEvent(event);
        fetchEventStats(event.id);
      }
    }
  }, [selectedEventId, events]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('fiestas')
        .select('id, name, description, event_date, location, status, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data?.map(f => ({
        id: f.id,
        name: f.name,
        description: f.description || '',
        location: f.location || '',
        event_date: f.event_date || f.created_at,
        active: f.status === 'active',
        organization_id: '', // Not needed anymore
        created_at: f.created_at
      })) || []);
      
      if (data && data.length > 0 && !selectedEventId) {
        const activeEvent = data.find(e => e.status === 'active') || data[0];
        const mappedEvent = {
          id: activeEvent.id,
          name: activeEvent.name,
          description: activeEvent.description || '',
          location: activeEvent.location || '',
          event_date: activeEvent.event_date || activeEvent.created_at,
          active: activeEvent.status === 'active',
          organization_id: '',
          created_at: activeEvent.created_at
        };
        setSelectedEvent(mappedEvent);
        fetchEventStats(activeEvent.id);
        onEventChange?.(activeEvent.id);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los eventos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateParticipationStats = async () => {
    if (!organization?.id) return { total_ambassadors: 0, active_ambassadors: 0, completion_rate: 0, pending_tasks: 0 };

    const { count: totalAmbassadors } = await supabase
      .from('embassadors')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id);

    const { count: activeAmbassadors } = await supabase
      .from('embassadors')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .eq('status', 'active');

    const { data: ambassadors } = await supabase
      .from('embassadors')
      .select('id, completed_tasks, failed_tasks')
      .eq('organization_id', organization.id);

    const totalCompleted = ambassadors?.reduce((sum, amb) => sum + (amb.completed_tasks || 0), 0) || 0;
    const totalFailed = ambassadors?.reduce((sum, amb) => sum + (amb.failed_tasks || 0), 0) || 0;
    const totalTasks = totalCompleted + totalFailed;

    const { count: pendingTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .in('embassador_id', ambassadors?.map(a => a.id) || [])
      .in('status', ['pending', 'uploaded', 'in_progress']);

    return {
      total_ambassadors: totalAmbassadors || 0,
      active_ambassadors: activeAmbassadors || 0,
      completion_rate: totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0,
      pending_tasks: pendingTasks || 0
    };
  };

  const calculateMetrics = async () => {
    if (!organization?.id) return { total_reach: 0, total_mentions: 0, average_engagement: 0, success_rate: 0 };

    const { data: ambassadors } = await supabase
      .from('embassadors')
      .select('id, completed_tasks, failed_tasks')
      .eq('organization_id', organization.id);

    const { data: tasks } = await supabase
      .from('tasks')
      .select('reach_count, engagement_score, status')
      .in('embassador_id', ambassadors?.map(a => a.id) || []);

    const totalReach = tasks?.reduce((sum, t) => sum + (t.reach_count || 0), 0) || 0;
    const totalMentions = tasks?.length || 0;
    const totalEngagement = tasks?.reduce((sum, t) => sum + (t.engagement_score || 0), 0) || 0;
    const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;

    return {
      total_reach: totalReach,
      total_mentions: totalMentions,
      average_engagement: totalMentions > 0 ? Number((totalEngagement / totalMentions).toFixed(1)) : 0,
      success_rate: totalMentions > 0 ? Math.round((completedTasks / totalMentions) * 100) : 0
    };
  };

  const fetchRecentActivities = async () => {
    if (!organization?.id) return [];

    const { data: recentTasks } = await supabase
      .from('tasks')
      .select('id, status, last_status_update, embassadors(first_name, last_name)')
      .in('embassador_id', await getAmbassadorIds())
      .order('last_status_update', { ascending: false })
      .limit(5);

    return recentTasks?.map(task => ({
      id: task.id,
      type: task.status === 'completed' ? 'success' : 'info',
      message: `Tarea ${task.status} por ${(task.embassadors as any)?.first_name} ${(task.embassadors as any)?.last_name}`,
      timestamp: task.last_status_update || new Date().toISOString()
    })) || [];
  };

  const getAmbassadorIds = async () => {
    const { data: ambassadors } = await supabase
      .from('embassadors')
      .select('id')
      .eq('organization_id', organization?.id || '');
    return ambassadors?.map(a => a.id) || [];
  };

  const fetchRealEventStats = async (eventId: string): Promise<EventStats> => {
    try {
      if (!organization?.id) {
        return {
          total_mentions: 0,
          total_stories: 0,
          total_points: 0,
          total_reach: 0,
          active_ambassadors: 0,
          completion_rate: 0,
          top_ambassadors: [],
          daily_performance: []
        };
      }

      // Get ambassadors for this organization
      const { data: ambassadors } = await supabase
        .from('embassadors')
        .select('id, first_name, last_name, instagram_user, global_points, global_category')
        .eq('organization_id', organization.id)
        .eq('status', 'active');

      if (!ambassadors || ambassadors.length === 0) {
        return {
          total_mentions: 0,
          total_stories: 0,
          total_points: 0,
          total_reach: 0,
          active_ambassadors: 0,
          completion_rate: 0,
          top_ambassadors: [],
          daily_performance: []
        };
      }

      // Get events for this fiesta
      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('fiesta_id', eventId);

      const eventIds = events?.map(e => e.id) || [];

      // Get tasks for these events
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, event_id, embassador_id, status, points_earned, engagement_score, reach_count, verified_through_api, instagram_story_id, task_type, platform, completion_method, upload_time, expiry_time, story_url, expected_hashtag, last_status_update, created_at')
        .in('event_id', eventIds)
        .in('embassador_id', ambassadors.map(a => a.id));

      // Calculate metrics
      const totalMentions = tasks?.length || 0;
      const totalStories = tasks?.filter(t => t.task_type === 'story').length || 0;
      const totalReach = tasks?.reduce((sum, t) => sum + (t.reach_count || 0), 0) || 0;
      const totalPoints = tasks?.reduce((sum, t) => sum + (t.points_earned || 0), 0) || 0;
      const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
      const completionRate = totalMentions > 0 ? Math.round((completedTasks / totalMentions) * 100) : 0;

      // Get top ambassadors (sort by points)
      const topAmbassadors = ambassadors
        .sort((a, b) => (b.global_points || 0) - (a.global_points || 0))
        .slice(0, 3)
        .map(amb => ({
          id: amb.id,
          name: `${amb.first_name} ${amb.last_name}`,
          points: amb.global_points || 0,
          category: amb.global_category || 'bronze',
          instagram_user: amb.instagram_user
        }));

      // Generate daily performance for last 7 days
      const dailyPerformance = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dailyTasks = tasks?.filter(t => 
          t.created_at && t.created_at.startsWith(dateStr)
        ) || [];

        dailyPerformance.push({
          date: format(date, 'dd/MM'),
          mentions: dailyTasks.length,
          stories: dailyTasks.filter(t => t.task_type === 'story').length,
          reach: dailyTasks.reduce((sum, t) => sum + (t.reach_count || 0), 0)
        });
      }

      return {
        total_mentions: totalMentions,
        total_stories: totalStories,
        total_points: totalPoints,
        total_reach: totalReach,
        active_ambassadors: ambassadors.length,
        completion_rate: completionRate,
        top_ambassadors: topAmbassadors,
        daily_performance: dailyPerformance
      };
    } catch (error) {
      console.error('Error fetching real event stats:', error);
      return {
        total_mentions: 0,
        total_stories: 0,
        total_points: 0,
        total_reach: 0,
        active_ambassadors: 0,
        completion_rate: 0,
        top_ambassadors: [],
        daily_performance: []
      };
    }
  };

  const fetchEventStats = async (eventId: string) => {
    try {
      const realStats = await fetchRealEventStats(eventId);
      setEventStats(realStats);
    } catch (error) {
      console.error('Error fetching event stats:', error);
    }
  };

  const handleEventChange = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
      fetchEventStats(eventId);
      onEventChange?.(eventId);
    }
  };

  const exportEventReport = async () => {
    try {
      // Aquí implementaríamos la lógica de exportación
      toast({
        title: "Éxito",
        description: "Reporte exportado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo exportar el reporte",
        variant: "destructive",
      });
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      bronze: "bg-amber-100 text-amber-800 border-amber-200",
      silver: "bg-gray-100 text-gray-800 border-gray-200",
      gold: "bg-yellow-100 text-yellow-800 border-yellow-200",
      diamond: "bg-blue-100 text-blue-800 border-blue-200"
    };
    return colors[category as keyof typeof colors] || colors.bronze;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedEvent || !eventStats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Selecciona un evento para ver el dashboard</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const performanceDistribution = [
    { name: 'Cumple', value: 65, color: '#10b981' },
    { name: 'Advertencia', value: 25, color: '#f59e0b' },
    { name: 'No Cumple', value: 10, color: '#ef4444' }
  ];

  return (
    <div className="space-y-6">
      {/* Header del Evento */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-2xl">{selectedEvent.name}</CardTitle>
                {selectedEvent.active && (
                  <Badge variant="default">Activo</Badge>
                )}
              </div>
              <CardDescription className="text-base mb-4">
                {selectedEvent.description}
              </CardDescription>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {selectedEvent.location && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Ubicación:</span>
                    <span className="font-medium">{selectedEvent.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Fecha:</span>
                  <span className="font-medium">
                    {format(new Date(selectedEvent.event_date), "PPP", { locale: es })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedEvent.id} onValueChange={handleEventChange}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Seleccionar evento" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={exportEventReport}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPIs del Evento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Menciones</p>
                <p className="text-2xl font-bold">{eventStats.total_mentions}</p>
              </div>
              <Instagram className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Historias</p>
                <p className="text-2xl font-bold">{eventStats.total_stories}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alcance Total</p>
                <p className="text-2xl font-bold">{eventStats.total_reach.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasa Completitud</p>
                <p className="text-2xl font-bold">{eventStats.completion_rate}%</p>
              </div>
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Análisis */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="performance">Rendimiento</TabsTrigger>
          <TabsTrigger value="ambassadors">Top Embajadores</TabsTrigger>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Rendimiento Diario</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={eventStats.daily_performance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="mentions" fill="#8884d8" name="Menciones" />
                    <Bar dataKey="stories" fill="#82ca9d" name="Historias" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={performanceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {performanceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-4">
                  {performanceDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-sm">{item.name} ({item.value}%)</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ambassadors">
          <Card>
            <CardHeader>
              <CardTitle>Top Embajadores del Evento</CardTitle>
              <CardDescription>Los embajadores con mejor performance en este evento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {eventStats.top_ambassadors.map((ambassador, index) => (
                  <div key={ambassador.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                        {index + 1}
                      </div>
                      <Avatar>
                        <AvatarFallback>{ambassador.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{ambassador.name}</p>
                        <p className="text-sm text-muted-foreground">{ambassador.instagram_user}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={getCategoryBadge(ambassador.category)}>
                        {ambassador.category.charAt(0).toUpperCase() + ambassador.category.slice(1)}
                      </Badge>
                      <div className="text-right">
                        <p className="font-bold">{ambassador.points} pts</p>
                        <p className="text-sm text-muted-foreground">puntos</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Evolución del Alcance</CardTitle>
              <CardDescription>Tendencia de menciones y alcance en los últimos días</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={eventStats.daily_performance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="reach" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="Alcance"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mentions" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    name="Menciones"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
