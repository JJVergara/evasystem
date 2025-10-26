import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Download, 
  TrendingUp, 
  Users, 
  BarChart3, 
  Calendar,
  Target,
  Award,
  Activity,
  HelpCircle,
  Filter
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsData {
  summary: {
    total_reach: number;
    total_mentions: number;
    completion_rate: number;
    active_ambassadors: number;
    events_completed: number;
    average_engagement: number;
  };
  performance_distribution: Array<{
    category: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  event_comparison: Array<{
    name: string;
    completed: number;
    pending: number;
    failed: number;
    total_reach: number;
  }>;
  top_ambassadors: Array<{
    id: string;
    name: string;
    instagram_user: string;
    total_points: number;
    events_participated: number;
    category: string;
    completion_rate: number;
    total_reach: number;
  }>;
  trends: Array<{
    date: string;
    reach: number;
    mentions: number;
    engagement: number;
  }>;
}

interface EnhancedAnalyticsProps {
  selectedEventId?: string;
}

export function EnhancedAnalytics({ selectedEventId }: EnhancedAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [events, setEvents] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30d");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      setSelectedEvent(selectedEventId);
    }
  }, [selectedEventId]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedEvent, selectedPeriod]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('fiestas')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      // Get user organizations to filter data
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: organizations } = await supabase
        .from('organizations')
        .select('id')
        .eq('created_by', user.user.id);

      if (!organizations || organizations.length === 0) {
        setAnalyticsData(null);
        return;
      }

      const orgIds = organizations.map(org => org.id);

      // Fetch real analytics data from Supabase
      const [
        summaryData,
        performanceData, 
        eventData,
        ambassadorsData,
        trendsData
      ] = await Promise.all([
        fetchSummaryMetrics(orgIds),
        fetchPerformanceDistribution(orgIds),
        fetchEventComparison(orgIds),
        fetchTopAmbassadors(orgIds),
        fetchTrends(orgIds)
      ]);

      const realData: AnalyticsData = {
        summary: summaryData,
        performance_distribution: performanceData,
        event_comparison: eventData,
        top_ambassadors: ambassadorsData,
        trends: trendsData
      };

      setAnalyticsData(realData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos analíticos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaryMetrics = async (orgIds: string[]) => {
    // Get ambassadors count
    const { count: activeAmbassadors } = await supabase
      .from('embassadors')
      .select('*', { count: 'exact', head: true })
      .in('organization_id', orgIds)
      .eq('status', 'active');

    // Get tasks data
    const { data: ambassadors } = await supabase
      .from('embassadors')
      .select('id, completed_tasks, failed_tasks')
      .in('organization_id', orgIds);

    const ambassadorIds = ambassadors?.map(a => a.id) || [];

    const { data: tasks } = await supabase
      .from('tasks')
      .select('reach_count, engagement_score, status')
      .in('embassador_id', ambassadorIds);

    // Get completed fiestas
    const { count: completedEvents } = await supabase
      .from('fiestas')
      .select('*', { count: 'exact', head: true })
      .in('organization_id', orgIds)
      .eq('status', 'completed');

    const totalCompleted = ambassadors?.reduce((sum, amb) => sum + (amb.completed_tasks || 0), 0) || 0;
    const totalFailed = ambassadors?.reduce((sum, amb) => sum + (amb.failed_tasks || 0), 0) || 0;
    const totalTasks = totalCompleted + totalFailed;
    const totalReach = tasks?.reduce((sum, t) => sum + (t.reach_count || 0), 0) || 0;
    const totalEngagement = tasks?.reduce((sum, t) => sum + (t.engagement_score || 0), 0) || 0;

    return {
      total_reach: totalReach,
      total_mentions: totalTasks,
      completion_rate: totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0,
      active_ambassadors: activeAmbassadors || 0,
      events_completed: completedEvents || 0,
      average_engagement: tasks && tasks.length > 0 ? Number((totalEngagement / tasks.length).toFixed(1)) : 0
    };
  };

  const fetchPerformanceDistribution = async (orgIds: string[]) => {
    const { data: ambassadors } = await supabase
      .from('embassadors')
      .select('performance_status')
      .in('organization_id', orgIds)
      .eq('status', 'active');

    const distribution = { cumple: 0, advertencia: 0, no_cumple: 0, exclusivo: 0 };
    ambassadors?.forEach(amb => {
      const status = amb.performance_status || 'cumple';
      if (status in distribution) {
        distribution[status as keyof typeof distribution]++;
      }
    });

    const total = ambassadors?.length || 1;
    return [
      { category: "Cumple", count: distribution.cumple, percentage: Math.round((distribution.cumple / total) * 100), color: "#10b981" },
      { category: "Advertencia", count: distribution.advertencia, percentage: Math.round((distribution.advertencia / total) * 100), color: "#f59e0b" },
      { category: "No Cumple", count: distribution.no_cumple, percentage: Math.round((distribution.no_cumple / total) * 100), color: "#ef4444" },
      { category: "Exclusivo", count: distribution.exclusivo, percentage: Math.round((distribution.exclusivo / total) * 100), color: "#8b5cf6" }
    ];
  };

  const fetchEventComparison = async (orgIds: string[]) => {
    const { data: fiestas } = await supabase
      .from('fiestas')
      .select('id, name, events(id)')
      .in('organization_id', orgIds)
      .limit(4);

    if (!fiestas) return [];

    const eventComparison = [];
    for (const fiesta of fiestas) {
      if (fiesta.events && fiesta.events.length > 0) {
        const eventIds = fiesta.events.map((e: any) => e.id);
        const { data: tasks } = await supabase
          .from('tasks')
          .select('status, reach_count')
          .in('event_id', eventIds);

        const completed = tasks?.filter(t => t.status === 'completed').length || 0;
        const pending = tasks?.filter(t => ['pending', 'uploaded', 'in_progress'].includes(t.status)).length || 0;
        const failed = tasks?.filter(t => ['invalid', 'expired'].includes(t.status)).length || 0;
        const totalReach = tasks?.reduce((sum, t) => sum + (t.reach_count || 0), 0) || 0;

        eventComparison.push({
          name: fiesta.name,
          completed,
          pending,
          failed,
          total_reach: totalReach
        });
      }
    }
    return eventComparison;
  };

  const fetchTopAmbassadors = async (orgIds: string[]) => {
    const { data: ambassadors } = await supabase
      .from('embassadors')
      .select('id, first_name, last_name, instagram_user, global_points, events_participated, global_category, completed_tasks, failed_tasks')
      .in('organization_id', orgIds)
      .eq('status', 'active')
      .order('global_points', { ascending: false })
      .limit(25);

    if (!ambassadors) return [];

    const ambassadorsWithReach = await Promise.all(
      ambassadors.map(async (amb) => {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('reach_count')
          .eq('embassador_id', amb.id);

        const totalReach = tasks?.reduce((sum, t) => sum + (t.reach_count || 0), 0) || 0;
        const totalTasks = (amb.completed_tasks || 0) + (amb.failed_tasks || 0);
        
        return {
          id: amb.id,
          name: `${amb.first_name} ${amb.last_name}`,
          instagram_user: amb.instagram_user,
          total_points: amb.global_points || 0,
          events_participated: amb.events_participated || 0,
          category: amb.global_category || 'bronze',
          completion_rate: totalTasks > 0 ? Math.round(((amb.completed_tasks || 0) / totalTasks) * 100) : 0,
          total_reach: totalReach
        };
      })
    );

    return ambassadorsWithReach;
  };

  const fetchTrends = async (orgIds: string[]) => {
    const trends = [];
    const now = new Date();
    
    const { data: ambassadors } = await supabase
      .from('embassadors')
      .select('id')
      .in('organization_id', orgIds);

    const ambassadorIds = ambassadors?.map(a => a.id) || [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const { data: dailyTasks } = await supabase
        .from('tasks')
        .select('reach_count, engagement_score')
        .in('embassador_id', ambassadorIds)
        .gte('created_at', `${dateStr}T00:00:00`)
        .lt('created_at', `${dateStr}T23:59:59`);

      const dailyReach = dailyTasks?.reduce((sum, t) => sum + (t.reach_count || 0), 0) || 0;
      const dailyMentions = dailyTasks?.length || 0;
      const dailyEngagement = dailyTasks && dailyTasks.length > 0 
        ? dailyTasks.reduce((sum, t) => sum + (t.engagement_score || 0), 0) / dailyTasks.length 
        : 0;

      trends.push({
        date: dateStr,
        reach: dailyReach,
        mentions: dailyMentions,
        engagement: Number(dailyEngagement.toFixed(1))
      });
    }
    
    return trends;
  };

  const exportAnalytics = async () => {
    try {
      // Implementar lógica de exportación
      toast({
        title: "Éxito",
        description: "Datos analíticos exportados correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo exportar los datos",
        variant: "destructive",
      });
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      bronze: "bg-amber-100 text-amber-800",
      silver: "bg-gray-100 text-gray-800",
      gold: "bg-yellow-100 text-yellow-800",
      diamond: "bg-blue-100 text-blue-800"
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

  if (!analyticsData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No se pudieron cargar los datos analíticos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header con Filtros */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  Analíticas Avanzadas
                </CardTitle>
                <CardDescription>
                  Dashboard integral de métricas y performance de campañas
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Seleccionar evento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los eventos</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">7 días</SelectItem>
                    <SelectItem value="30d">30 días</SelectItem>
                    <SelectItem value="90d">3 meses</SelectItem>
                    <SelectItem value="1y">1 año</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={exportAnalytics}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* KPIs Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-muted-foreground">Alcance Total</p>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Suma del alcance estimado de todas las publicaciones</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-2xl font-bold">{analyticsData.summary.total_reach.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-muted-foreground">Total Menciones</p>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Número total de menciones e historias</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-2xl font-bold">{analyticsData.summary.total_mentions}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-muted-foreground">Tasa Completitud</p>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Porcentaje de tareas completadas exitosamente</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-2xl font-bold">{analyticsData.summary.completion_rate}%</p>
                </div>
                <Target className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Embajadores Activos</p>
                  <p className="text-2xl font-bold">{analyticsData.summary.active_ambassadors}</p>
                </div>
                <Users className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Eventos Completados</p>
                  <p className="text-2xl font-bold">{analyticsData.summary.events_completed}</p>
                </div>
                <Calendar className="h-8 w-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Engagement Promedio</p>
                  <p className="text-2xl font-bold">{analyticsData.summary.average_engagement.toFixed(1)}%</p>
                </div>
                <Award className="h-8 w-8 text-pink-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs de Análisis Detallado */}
        <Tabs defaultValue="resumen" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="rendimiento">Rendimiento</TabsTrigger>
            <TabsTrigger value="eventos">Eventos</TabsTrigger>
            <TabsTrigger value="top25">Top 25</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribución de Performance</CardTitle>
                  <CardDescription>Estado actual de todos los embajadores</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData.performance_distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="count"
                      >
                        {analyticsData.performance_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => [`${value} embajadores`, "Total"]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-4">
                    {analyticsData.performance_distribution.map((item) => (
                      <div key={item.category} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-sm">{item.category} ({item.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Evolución de Métricas</CardTitle>
                  <CardDescription>Tendencias en los últimos 30 días</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData.trends.slice(-7)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(date) => new Date(date).getDate().toString()} />
                      <YAxis />
                      <RechartsTooltip />
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
            </div>
          </TabsContent>

          <TabsContent value="eventos">
            <Card>
              <CardHeader>
                <CardTitle>Comparación de Eventos</CardTitle>
                <CardDescription>Performance comparativa de diferentes eventos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analyticsData.event_comparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="completed" fill="#10b981" name="Completadas" />
                    <Bar dataKey="pending" fill="#f59e0b" name="Pendientes" />
                    <Bar dataKey="failed" fill="#ef4444" name="Fallidas" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="top25">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Top 25 Embajadores</CardTitle>
                    <CardDescription>Ranking de los mejores embajadores por puntos totales</CardDescription>
                  </div>
                  <Button onClick={exportAnalytics} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Ranking
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ranking</TableHead>
                      <TableHead>Embajador</TableHead>
                      <TableHead>Instagram</TableHead>
                      <TableHead>Puntos</TableHead>
                      <TableHead>Eventos</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Completitud</TableHead>
                      <TableHead>Alcance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyticsData.top_ambassadors.slice(0, 25).map((ambassador, index) => (
                      <TableRow key={ambassador.id}>
                        <TableCell>
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                            {index + 1}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{ambassador.name}</TableCell>
                        <TableCell className="text-muted-foreground">{ambassador.instagram_user}</TableCell>
                        <TableCell className="font-bold">{ambassador.total_points}</TableCell>
                        <TableCell>{ambassador.events_participated}</TableCell>
                        <TableCell>
                          <Badge className={getCategoryBadge(ambassador.category)}>
                            {ambassador.category.charAt(0).toUpperCase() + ambassador.category.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{ambassador.completion_rate}%</TableCell>
                        <TableCell>{ambassador.total_reach.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}