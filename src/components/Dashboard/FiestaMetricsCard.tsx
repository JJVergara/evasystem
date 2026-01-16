import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Users,
  Trophy,
  TrendingUp,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { useFiestaMetrics } from '@/hooks/useFiestaMetrics';
import { MetricCard } from './MetricCard';

interface FiestaMetricsCardProps {
  fiesta: {
    id: string;
    name: string;
    event_date?: string;
    description?: string;
    status: string;
  };
}

export function FiestaMetricsCard({ fiesta }: FiestaMetricsCardProps) {
  const { metrics, loading } = useFiestaMetrics(fiesta.id);

  if (loading) {
    return (
      <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="grid grid-cols-3 gap-2">
              <div className="h-12 bg-muted rounded" />
              <div className="h-12 bg-muted rounded" />
              <div className="h-12 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-success/10 text-success',
      completed: 'bg-blue-100 text-blue-800',
      draft: 'bg-gray-100 text-gray-800',
    };
    return styles[status as keyof typeof styles] || styles.active;
  };

  return (
    <Card className="shadow-card hover:shadow-elegant transition-all duration-300 group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{fiesta.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getStatusBadge(fiesta.status)}>
                {fiesta.status === 'active'
                  ? 'Activa'
                  : fiesta.status === 'completed'
                    ? 'Completada'
                    : 'Borrador'}
              </Badge>
              {fiesta.event_date && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(fiesta.event_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Eye className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">{fiesta.name} - Detalles Completos</DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Resumen</TabsTrigger>
                  <TabsTrigger value="ambassadors">Embajadores</TabsTrigger>
                  <TabsTrigger value="events">Eventos</TabsTrigger>
                  <TabsTrigger value="metrics">Métricas</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard
                      title="Embajadores"
                      value={metrics?.total_ambassadors || 0}
                      icon={<Users className="w-4 h-4" />}
                    />
                    <MetricCard
                      title="Tareas Completadas"
                      value={metrics?.completed_tasks || 0}
                      icon={<CheckCircle className="w-4 h-4" />}
                    />
                    <MetricCard
                      title="Alcance Total"
                      value={`${((metrics?.total_reach || 0) / 1000).toFixed(1)}K`}
                      icon={<TrendingUp className="w-4 h-4" />}
                    />
                    <MetricCard
                      title="Tasa Completitud"
                      value={`${metrics?.completion_rate || 0}%`}
                      icon={<Trophy className="w-4 h-4" />}
                    />
                  </div>

                  {fiesta.description && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Descripción</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">{fiesta.description}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="ambassadors" className="space-y-4">
                  <div className="space-y-3">
                    {metrics?.top_ambassadors?.slice(0, 10).map((ambassador, index) => (
                      <div
                        key={ambassador.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                            {index + 1}
                          </div>
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{ambassador.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{ambassador.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {ambassador.tasks_completed} tareas completadas
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">{ambassador.points}</div>
                          <div className="text-xs text-muted-foreground">puntos</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="events" className="space-y-4">
                  <div className="text-center text-muted-foreground py-8">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Gestión de eventos en desarrollo</p>
                  </div>
                </TabsContent>

                <TabsContent value="metrics" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Distribución de Tareas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-success" />
                              Completadas
                            </span>
                            <span className="font-medium">{metrics?.completed_tasks || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-warning" />
                              Pendientes
                            </span>
                            <span className="font-medium">{metrics?.pending_tasks || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="flex items-center gap-2">
                              <XCircle className="w-4 h-4 text-destructive" />
                              Inválidas
                            </span>
                            <span className="font-medium">{metrics?.invalid_tasks || 0}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Métricas de Alcance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-primary">
                              {((metrics?.total_reach || 0) / 1000000).toFixed(1)}M
                            </div>
                            <div className="text-sm text-muted-foreground">Alcance Total</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-secondary">
                              {metrics?.avg_engagement?.toFixed(1) || 0}%
                            </div>
                            <div className="text-sm text-muted-foreground">Engagement Promedio</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-accent/20">
            <div className="flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="text-lg font-bold">{metrics?.total_ambassadors || 0}</div>
            <div className="text-xs text-muted-foreground">Embajadores</div>
          </div>

          <div className="text-center p-3 rounded-lg bg-accent/20">
            <div className="flex items-center justify-center mb-1">
              <CheckCircle className="w-4 h-4 text-success" />
            </div>
            <div className="text-lg font-bold">{metrics?.completed_tasks || 0}</div>
            <div className="text-xs text-muted-foreground">Completadas</div>
          </div>

          <div className="text-center p-3 rounded-lg bg-accent/20">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-secondary" />
            </div>
            <div className="text-lg font-bold">
              {((metrics?.total_reach || 0) / 1000).toFixed(0)}K
            </div>
            <div className="text-xs text-muted-foreground">Alcance</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
