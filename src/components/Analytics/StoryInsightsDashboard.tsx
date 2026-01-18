import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PageHeader } from '@/components/Layout/PageHeader';
import { GlassPanel } from '@/components/Layout/GlassPanel';
import { HelpCircle, RefreshCw } from 'lucide-react';
import { EMOJIS } from '@/constants';
import {
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
  Rectangle,
} from 'recharts';
import { useStoryInsightsAnalytics } from '@/hooks/useStoryInsightsAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function StoryInsightsDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const { data, loading, error, refresh } = useStoryInsightsAnalytics(selectedPeriod);
  const [isCollecting, setIsCollecting] = useState(false);

  const handleCollectInsights = async () => {
    setIsCollecting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('collect-story-insights');

      if (error) throw error;

      toast.success(
        `Insights recolectados: ${result.totalSnapshotsCreated || 0} snapshots creados`
      );
      refresh();
    } catch {
      toast.error('Error al recolectar insights de Stories');
    } finally {
      setIsCollecting(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Story Insights"
          description="Análisis de rendimiento de Instagram Stories"
          emoji={EMOJIS.navigation.analytics}
        />
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <GlassPanel key={i} className="h-28">
                <div className="animate-pulse bg-muted rounded h-full"></div>
              </GlassPanel>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Story Insights"
          description="Análisis de rendimiento de Instagram Stories"
          emoji={EMOJIS.navigation.analytics}
        />
        <GlassPanel>
          <div className="text-center text-muted-foreground py-12">
            <img
              src="/instagram-icon.webp"
              alt="Instagram"
              className="h-12 w-12 mx-auto mb-4 opacity-50"
            />
            <p className="text-lg font-medium mb-2">No hay datos de Stories disponibles</p>
            <p className="text-sm mb-4">
              Recolecta insights de tus Stories activas para ver métricas
            </p>
            <Button onClick={handleCollectInsights} disabled={isCollecting}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isCollecting ? 'animate-spin' : ''}`} />
              {isCollecting ? 'Recolectando...' : 'Recolectar Insights'}
            </Button>
          </div>
        </GlassPanel>
      </div>
    );
  }

  const { summary, daily_metrics, metrics_by_hour, recent_snapshots, max_stories_per_hour } = data;

  const storyColors = [
    'hsl(210, 58%, 14%)',
    'hsl(210, 45%, 45%)',
    'hsl(180, 35%, 40%)',
    'hsl(32, 55%, 50%)',
    'hsl(210, 58%, 28%)',
    'hsl(180, 35%, 52%)',
    'hsl(32, 55%, 62%)',
    'hsl(210, 45%, 58%)',
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Story Insights"
        description="Análisis de rendimiento de Instagram Stories"
        emoji={EMOJIS.navigation.analytics}
      >
        <div className="w-full flex justify-center">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 horas</SelectItem>
                <SelectItem value="7d">7 días</SelectItem>
                <SelectItem value="30d">30 días</SelectItem>
                <SelectItem value="90d">3 meses</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCollectInsights}
              disabled={isCollecting}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isCollecting ? 'animate-spin' : ''}`} />
              {isCollecting ? 'Recolectando...' : 'Actualizar'}
            </Button>
          </div>
        </div>
      </PageHeader>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              <img src="/instagram-icon.webp" alt="Instagram" className="w-3 h-3 mr-1" />
              Instagram Stories API v24.0
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">
                      Stories
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-primary">
                      {summary.total_stories}
                    </p>
                  </div>
                  <span className="text-xl sm:text-2xl lg:text-3xl opacity-50 shrink-0">
                    {EMOJIS.entities.story}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-info/5 border-info/20">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">
                              Alcance
                            </p>
                            <HelpCircle className="w-3 h-3 text-muted-foreground/50 hidden sm:block" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="font-medium">Alcance (Reach)</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Número de <strong>cuentas únicas</strong> que vieron tu Story. Cada
                            persona se cuenta una sola vez, sin importar cuántas veces la vio.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <p className="text-xl sm:text-2xl font-bold text-info">
                      {formatNumber(summary.total_reach)}
                    </p>
                  </div>
                  <span className="text-xl sm:text-2xl lg:text-3xl opacity-50 shrink-0">
                    {EMOJIS.social.reach}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-success/5 border-success/20">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">
                              Vistas
                            </p>
                            <HelpCircle className="w-3 h-3 text-muted-foreground/50 hidden sm:block" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="font-medium">Vistas (Views)</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            <strong>Total de reproducciones</strong> de tu Story. Incluye vistas
                            repetidas de la misma persona. Si alguien ve tu Story 3 veces, cuenta
                            como 3 vistas.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <p className="text-xl sm:text-2xl font-bold text-success">
                      {formatNumber(summary.total_views)}
                    </p>
                  </div>
                  <span className="text-xl sm:text-2xl lg:text-3xl opacity-50 shrink-0">
                    {EMOJIS.actions.view}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-warning/5 border-warning/20">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">
                      Visitas Perfil
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-warning">
                      {formatNumber(summary.total_profile_visits)}
                    </p>
                  </div>
                  <span className="text-xl sm:text-2xl lg:text-3xl opacity-50 shrink-0">
                    {EMOJIS.social.followers}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">
                      Interacciones
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-primary">
                      {formatNumber(summary.total_interactions)}
                    </p>
                  </div>
                  <span className="text-xl sm:text-2xl lg:text-3xl opacity-50 shrink-0">
                    {EMOJIS.feedback.sparkles}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-info/5 border-info/20">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">
                      Compartidos
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-info">
                      {formatNumber(summary.total_shares)}
                    </p>
                  </div>
                  <span className="text-xl sm:text-2xl lg:text-3xl opacity-50 shrink-0">
                    {EMOJIS.actions.share}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/50 border-border">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">
                      Respuestas
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">
                      {formatNumber(summary.total_replies)}
                    </p>
                  </div>
                  <span className="text-xl sm:text-2xl lg:text-3xl opacity-50 shrink-0">
                    {EMOJIS.entities.message}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-full bg-primary/10 shrink-0">
                  <span className="text-xl sm:text-2xl">{EMOJIS.feedback.target}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Alcance promedio por Story
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {formatNumber(summary.avg_reach_per_story)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-full bg-success/10 shrink-0">
                  <span className="text-xl sm:text-2xl">{EMOJIS.social.reach}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Vistas promedio por Story
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {formatNumber(summary.avg_views_per_story)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="trends" className="space-y-6">
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="inline-flex min-w-full sm:grid sm:w-full sm:grid-cols-3">
              <TabsTrigger value="trends" className="flex-1 sm:flex-none text-xs sm:text-sm">
                Tendencias
              </TabsTrigger>
              <TabsTrigger value="timing" className="flex-1 sm:flex-none text-xs sm:text-sm">
                Mejor Horario
              </TabsTrigger>
              <TabsTrigger value="stories" className="flex-1 sm:flex-none text-xs sm:text-sm">
                Stories Recientes
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>{EMOJIS.social.reach}</span>
                  Evolución de Métricas
                </CardTitle>
                <CardDescription>Alcance, vistas y visitas al perfil por día</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={daily_metrics}>
                      <defs>
                        <linearGradient id="reachGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(210, 58%, 14%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(210, 58%, 14%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(180, 35%, 40%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(180, 35%, 40%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(date) => {
                          const d = new Date(date);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                        className="text-xs"
                      />
                      <YAxis className="text-xs" />
                      <RechartsTooltip
                        labelFormatter={(date) =>
                          new Date(date).toLocaleDateString('es-ES', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })
                        }
                        formatter={(value: number, name: string) => [
                          formatNumber(value),
                          name === 'total_reach'
                            ? 'Alcance'
                            : name === 'total_views'
                              ? 'Vistas'
                              : name === 'total_profile_visits'
                                ? 'Visitas Perfil'
                                : name,
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="total_reach"
                        stroke="hsl(210, 58%, 14%)"
                        strokeWidth={2}
                        fill="url(#reachGradient)"
                        name="Alcance"
                      />
                      <Area
                        type="monotone"
                        dataKey="total_views"
                        stroke="hsl(180, 35%, 40%)"
                        strokeWidth={2}
                        fill="url(#viewsGradient)"
                        name="Vistas"
                      />
                      <Line
                        type="monotone"
                        dataKey="total_profile_visits"
                        stroke="hsl(32, 55%, 50%)"
                        strokeWidth={2}
                        dot={false}
                        name="Visitas Perfil"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>{EMOJIS.entities.story}</span>
                  Stories por Día
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={daily_metrics}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(date) => {
                          const d = new Date(date);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                        className="text-xs"
                      />
                      <YAxis className="text-xs" />
                      <RechartsTooltip
                        labelFormatter={(date) => new Date(date).toLocaleDateString('es-ES')}
                        formatter={(value: number) => [value, 'Stories']}
                      />
                      <Bar
                        dataKey="stories_count"
                        fill="hsl(210, 58%, 14%)"
                        radius={[4, 4, 0, 0]}
                        name="Stories"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>{EMOJIS.entities.timer}</span>
                  Rendimiento por Hora
                </CardTitle>
                <CardDescription>
                  Cada segmento de color representa una story individual, ordenadas cronológicamente
                  (más antigua a más reciente). La línea punteada muestra el alcance promedio por
                  hora.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics_by_hour}>
                      <defs>
                        <pattern id="avgPattern" patternUnits="userSpaceOnUse" width="4" height="4">
                          <path
                            d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2"
                            stroke="hsl(215, 20%, 46%)"
                            strokeWidth="0.5"
                          />
                        </pattern>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="hour"
                        tickFormatter={(hour) => `${hour}:00`}
                        className="text-xs"
                      />
                      <YAxis className="text-xs" />
                      <RechartsTooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const hourData = metrics_by_hour.find((h) => h.hour === label);
                          if (!hourData) return null;

                          return (
                            <div className="bg-popover border rounded-lg p-3 shadow-lg min-w-[200px]">
                              <p className="font-medium mb-2">
                                {label}:00 - {label}:59
                              </p>
                              <div className="space-y-1 text-sm border-b pb-2 mb-2">
                                <p className="flex justify-between">
                                  <span className="text-muted-foreground">Promedio:</span>
                                  <span className="font-medium">
                                    {formatNumber(hourData.avg_reach)} alcance
                                  </span>
                                </p>
                                <p className="flex justify-between">
                                  <span className="text-muted-foreground">Stories:</span>
                                  <span className="font-medium">{hourData.stories_count}</span>
                                </p>
                              </div>
                              {hourData.stories.length > 0 && (
                                <div className="space-y-2">
                                  {hourData.stories.map((story, idx) => (
                                    <div
                                      key={story.instagram_story_id}
                                      className="flex items-center gap-2 text-xs"
                                    >
                                      <div
                                        className="w-3 h-3 rounded-sm flex-shrink-0"
                                        style={{
                                          backgroundColor: storyColors[idx % storyColors.length],
                                        }}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">
                                            #{story.instagram_story_id?.slice(-8) || 'N/A'}
                                          </span>
                                          <span className="text-muted-foreground text-[10px]">
                                            {new Date(story.created_at).toLocaleTimeString(
                                              'es-ES',
                                              {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                              }
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                      <span className="ml-auto font-medium">
                                        {formatNumber(story.reach)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                      {Array.from({ length: max_stories_per_hour }, (_, i) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const CustomBarShape = (props: any) => {
                          const { payload, ...barProps } = props;
                          let lastNonZeroIndex = -1;
                          for (let j = max_stories_per_hour - 1; j >= 0; j--) {
                            const value = payload?.[`story_${j}_reach`];
                            if (typeof value === 'number' && value > 0) {
                              lastNonZeroIndex = j;
                              break;
                            }
                          }
                          const radius: [number, number, number, number] =
                            i === lastNonZeroIndex ? [4, 4, 0, 0] : [0, 0, 0, 0];
                          return <Rectangle {...barProps} radius={radius} />;
                        };

                        return (
                          <Bar
                            key={`story_${i}`}
                            dataKey={`story_${i}_reach`}
                            stackId="stories"
                            fill={storyColors[i % storyColors.length]}
                            shape={CustomBarShape}
                            name={`Story ${i + 1}`}
                          />
                        );
                      })}
                      <ReferenceLine
                        y={Math.round(
                          metrics_by_hour
                            .filter((h) => h.avg_reach > 0)
                            .reduce((sum, h) => sum + h.avg_reach, 0) /
                            Math.max(1, metrics_by_hour.filter((h) => h.avg_reach > 0).length)
                        )}
                        stroke="hsl(215, 20%, 46%)"
                        strokeDasharray="5 5"
                        label={{
                          value: 'Promedio global',
                          position: 'insideTopRight',
                          fontSize: 10,
                          fill: 'hsl(215, 20%, 46%)',
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 justify-center text-xs">
                  <span className="text-muted-foreground text-[10px] w-full text-center mb-1">
                    Colores ordenados cronológicamente (más antigua → más reciente)
                  </span>
                  {Array.from({ length: Math.min(max_stories_per_hour, 8) }, (_, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 shrink-0 rounded-sm"
                        style={{ backgroundColor: storyColors[i % storyColors.length] }}
                      />
                      <span className="text-muted-foreground">
                        {i === 0
                          ? '1ª story'
                          : i === 1
                            ? '2ª story'
                            : i === 2
                              ? '3ª story'
                              : `${i + 1}ª story`}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 border-t-2 border-dashed border-muted-foreground" />
                    <span className="text-muted-foreground">Promedio global</span>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">📊 Mejores Horarios</h4>
                  <div className="flex flex-wrap gap-2">
                    {metrics_by_hour
                      .filter((h) => h.avg_reach > 0)
                      .sort((a, b) => b.avg_reach - a.avg_reach)
                      .slice(0, 5)
                      .map((h, i) => (
                        <Badge key={h.hour} variant={i === 0 ? 'default' : 'outline'}>
                          {h.hour}:00 - {formatNumber(h.avg_reach)} alcance ({h.stories_count}{' '}
                          {h.stories_count === 1 ? 'story' : 'stories'})
                        </Badge>
                      ))}
                  </div>
                </div>

                {metrics_by_hour.filter((h) => h.stories_count > 1).length > 0 && (
                  <div className="mt-4 p-4 rounded-lg bg-warning/10 border border-warning/20">
                    <h4 className="font-medium mb-2 text-warning">
                      📌 Horas con múltiples Stories
                    </h4>
                    <div className="space-y-3">
                      {metrics_by_hour
                        .filter((h) => h.stories_count > 1)
                        .sort((a, b) => b.stories_count - a.stories_count)
                        .map((h) => (
                          <div key={h.hour} className="text-sm">
                            <p className="font-medium">
                              {h.hour}:00 - {h.stories_count} stories
                            </p>
                            <div className="ml-4 mt-1 space-y-1">
                              {h.stories.map((story, idx) => (
                                <div
                                  key={story.instagram_story_id}
                                  className="flex items-center gap-2 text-muted-foreground text-xs"
                                >
                                  <div
                                    className="w-2 h-2 shrink-0 rounded-sm"
                                    style={{
                                      backgroundColor: storyColors[idx % storyColors.length],
                                    }}
                                  />
                                  <span>#{story.instagram_story_id?.slice(-8) || 'N/A'}</span>
                                  <span className="ml-auto">
                                    {formatNumber(story.reach)} alcance /{' '}
                                    {formatNumber(story.views)} vistas
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <img src="/instagram-icon.webp" alt="Instagram" className="w-5 h-5" />
                  Stories Recientes
                </CardTitle>
                <CardDescription>Últimos snapshots de insights recolectados</CardDescription>
              </CardHeader>
              <CardContent>
                {recent_snapshots.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <img
                      src="/instagram-icon.webp"
                      alt="Instagram"
                      className="w-12 h-12 mx-auto mb-2 opacity-50"
                    />
                    <p>No hay snapshots recientes</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recent_snapshots.map((snapshot) => {
                      const snapshotDate = new Date(snapshot.snapshot_at);
                      const storyCreatedAt = snapshot.story_age_hours
                        ? new Date(
                            snapshotDate.getTime() - snapshot.story_age_hours * 60 * 60 * 1000
                          )
                        : snapshotDate;

                      return (
                        <div
                          key={snapshot.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-full bg-primary flex items-center justify-center">
                              <img src="/instagram-icon.webp" alt="Instagram" className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                Story #{snapshot.instagram_story_id?.slice(-8) || 'N/A'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                📅{' '}
                                {storyCreatedAt.toLocaleDateString('es-ES', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                              {snapshot.story_age_hours && (
                                <p className="text-xs text-muted-foreground/70">
                                  ⏱️ Snapshot tomado a las {snapshot.story_age_hours.toFixed(1)}h
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-center">
                              <p className="font-bold">{formatNumber(snapshot.reach)}</p>
                              <p className="text-xs text-muted-foreground">Alcance</p>
                            </div>
                            <div className="text-center">
                              <p className="font-bold">{formatNumber(snapshot.views)}</p>
                              <p className="text-xs text-muted-foreground">Vistas</p>
                            </div>
                            <div className="text-center">
                              <p className="font-bold">{snapshot.profile_visits}</p>
                              <p className="text-xs text-muted-foreground">Perfil</p>
                            </div>
                            <div className="text-center">
                              <p className="font-bold">{snapshot.shares}</p>
                              <p className="text-xs text-muted-foreground">Shares</p>
                            </div>
                            <div className="text-center">
                              <p className="font-bold">{snapshot.replies}</p>
                              <p className="text-xs text-muted-foreground">Replies</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
