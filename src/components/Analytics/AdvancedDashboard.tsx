
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "../Dashboard/MetricCard";
import { PageHeader } from "@/components/Layout/PageHeader";
import { GlassPanel } from "@/components/Layout/GlassPanel";
import {
  TrendingUp,
  Users,
  Calendar,
  Instagram,
  Eye,
  Heart,
  MessageCircle,
  Trophy,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Filter,
  RefreshCw
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAdvancedAnalytics } from "@/hooks/useAdvancedAnalytics";
import { useFiestas } from "@/hooks/useFiestas";
import { FiestaSelector } from "@/components/Dashboard/FiestaSelector";
import { useInstagramSync } from "@/hooks/useInstagramSync";
import { toast } from "sonner";

export function AdvancedDashboard() {
  const { selectedFiesta, selectedFiestaId } = useFiestas();
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [events, setEvents] = useState<Array<{ id: string; name: string }>>([]);
  
  // Always call hooks at the top level, even when selectedFiestaId is null
  const { analyticsData, loading, error, refreshAnalytics } = useAdvancedAnalytics(selectedFiestaId, selectedEvent, selectedPeriod);
  const { isSyncing, syncInstagramData } = useInstagramSync();

  // This useEffect must be called before any early returns to maintain hook order
  useEffect(() => {
    if (selectedFiestaId) {
      fetchEvents();
    }
  }, [selectedFiestaId]);

  // Show message if no fiesta is selected (after all hooks are called)
  if (!selectedFiestaId) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Analíticas" 
          description="Análisis avanzado de rendimiento y métricas"
        />
        <GlassPanel>
          <div className="text-center text-muted-foreground py-12">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Selecciona una fiesta para ver las analíticas</p>
          </div>
        </GlassPanel>
      </div>
    );
  }

  const fetchEvents = async () => {
    if (!selectedFiestaId) return;
    
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id')
        .eq('fiesta_id', selectedFiestaId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setEvents(data?.map(e => ({ id: e.id, name: `Evento ${e.id.slice(0, 8)}` })) || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  const exportAnalytics = async () => {
    try {
      toast.success("Funcionalidad de exportación en desarrollo");
    } catch (error) {
      toast.error("Error al exportar datos");
    }
  };

  const handleManualSync = async () => {
    const success = await syncInstagramData();
    if (success) {
      refreshAnalytics();
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
        <PageHeader 
          title="Analíticas" 
          description="Análisis avanzado de rendimiento y métricas"
        />
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <GlassPanel key={i} className="h-32">
                <div className="animate-pulse bg-muted rounded"></div>
              </GlassPanel>
            ))}
          </div>
          <GlassPanel className="h-96">
            <div className="animate-pulse bg-muted rounded h-full"></div>
          </GlassPanel>
        </div>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Analíticas" 
          description="Análisis avanzado de rendimiento y métricas"
        />
        <GlassPanel>
          <div className="text-center text-muted-foreground py-12">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{error || "Error al cargar datos analíticos"}</p>
            <Button onClick={refreshAnalytics} className="mt-4">
              Reintentar
            </Button>
          </div>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dashboard Analítico" 
        description={`Análisis avanzado de ${selectedFiesta?.name}`}
      >
        <div className="w-full flex justify-center">
          <div className="flex items-center space-x-3 flex-wrap gap-2">
            <FiestaSelector 
              onFiestaChange={(fiestaId) => {/* Handle change if needed */}}
              selectedFiestaId={selectedFiestaId}
            />
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger className="w-48">
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
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 días</SelectItem>
                <SelectItem value="30d">30 días</SelectItem>
                <SelectItem value="90d">3 meses</SelectItem>
                <SelectItem value="1y">1 año</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualSync}
              disabled={isSyncing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>

            <Button variant="outline" size="sm" onClick={exportAnalytics}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </PageHeader>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Alcance Total"
            value={`${(analyticsData.summary.total_reach / 1000000).toFixed(1)}M`}
            description="Visualizaciones estimadas"
            icon={<Eye className="w-4 h-4" />}
          />
          <MetricCard
            title="Total Menciones"
            value={analyticsData.summary.total_mentions.toLocaleString()}
            description="Historias y menciones"
            icon={<MessageCircle className="w-4 h-4" />}
          />
          <MetricCard
            title="Tasa de Completitud"
            value={`${analyticsData.summary.completion_rate}%`}
            description="Tareas completadas"
            icon={<CheckCircle className="w-4 h-4" />}
          />
          <MetricCard
            title="Embajadores Activos"
            value={analyticsData.summary.active_ambassadors}
            description="Con actividad reciente"
            icon={<Users className="w-4 h-4" />}
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="performance">Rendimiento</TabsTrigger>
            <TabsTrigger value="events">Eventos</TabsTrigger>
            <TabsTrigger value="top25">Top 25</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Ambassadors */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Trophy className="w-5 h-5 mr-2 text-primary" />
                    Top 10 Embajadores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.top_ambassadors.slice(0, 10).map((ambassador, index) => (
                      <div key={ambassador.id} className="flex items-center justify-between p-3 rounded-lg bg-gradient-card border border-primary/10">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium">{ambassador.name}</h4>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                {ambassador.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {ambassador.instagram_user}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">{ambassador.total_points}</div>
                          <div className="text-xs text-muted-foreground">puntos</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Distribution */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Distribución de Rendimiento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.performance_distribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="count"
                          label={({ category, percentage }) => `${category} ${percentage}%`}
                        >
                          {analyticsData.performance_distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {analyticsData.performance_distribution.map((perf) => (
                <Card key={perf.category} className="shadow-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold" style={{ color: perf.color }}>
                          {perf.count}
                        </div>
                        <div className="text-sm text-muted-foreground">{perf.category}</div>
                        <div className="text-xs text-muted-foreground">{perf.percentage}%</div>
                      </div>
                      {perf.category === "Cumple" && <CheckCircle className="w-8 h-8" style={{ color: perf.color }} />}
                      {perf.category === "Advertencia" && <AlertTriangle className="w-8 h-8" style={{ color: perf.color }} />}
                      {perf.category === "No Cumple" && <XCircle className="w-8 h-8" style={{ color: perf.color }} />}
                      {perf.category === "Exclusivo" && <Trophy className="w-8 h-8" style={{ color: perf.color }} />}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Comparativa de Eventos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.event_comparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="completed" stackId="a" fill="#22c55e" name="Completadas" />
                      <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pendientes" />
                      <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Fallidas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="top25">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Top 25 Embajadores</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Ranking de los mejores embajadores por puntos totales
                    </p>
                  </div>
                  <Button onClick={exportAnalytics} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Ranking
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.top_ambassadors.map((ambassador, index) => (
                    <div key={ambassador.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium">{ambassador.name}</h4>
                          <p className="text-sm text-muted-foreground">{ambassador.instagram_user}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="text-center">
                          <div className="font-bold">{ambassador.total_points}</div>
                          <div className="text-muted-foreground">Puntos</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold">{ambassador.events_participated}</div>
                          <div className="text-muted-foreground">Eventos</div>
                        </div>
                        <div className="text-center">
                          <Badge className={getCategoryBadge(ambassador.category)}>
                            {ambassador.category.charAt(0).toUpperCase() + ambassador.category.slice(1)}
                          </Badge>
                        </div>
                        <div className="text-center">
                          <div className="font-bold">{ambassador.completion_rate}%</div>
                          <div className="text-muted-foreground">Completitud</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold">{ambassador.total_reach.toLocaleString()}</div>
                          <div className="text-muted-foreground">Alcance</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Trends Section */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Evolución de Métricas (Últimos 30 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).getDate().toString()} 
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="reach" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    name="Alcance"
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="mentions" 
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    name="Menciones"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
