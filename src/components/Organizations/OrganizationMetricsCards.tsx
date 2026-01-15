import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Calendar, Users, Target, TrendingUp, Award } from 'lucide-react';

interface OrganizationMetrics {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  total_events: number;
  active_events: number;
  total_ambassadors: number;
  active_ambassadors: number;
  total_tasks: number;
  completed_tasks: number;
  total_reach: number;
  avg_engagement: number;
  completion_rate: number;
}

interface OrganizationMetricsCardsProps {
  metrics: OrganizationMetrics;
}

export function OrganizationMetricsCards({ metrics }: OrganizationMetricsCardsProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Eventos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Eventos</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.total_events}</div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              {metrics.active_events} activos
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Total de eventos creados</p>
        </CardContent>
      </Card>

      {/* Embajadores */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Embajadores</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.total_ambassadors}</div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              {metrics.active_ambassadors} activos
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Embajadores registrados</p>
        </CardContent>
      </Card>

      {/* Tareas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tareas</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.total_tasks}</div>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={
                metrics.completion_rate >= 80
                  ? 'default'
                  : metrics.completion_rate >= 60
                    ? 'secondary'
                    : 'destructive'
              }
              className="text-xs"
            >
              {metrics.completion_rate.toFixed(0)}% completadas
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {metrics.completed_tasks} de {metrics.total_tasks} completadas
          </p>
        </CardContent>
      </Card>

      {/* Alcance Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alcance Total</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(metrics.total_reach)}</div>
          <p className="text-xs text-muted-foreground mt-2">Impresiones totales generadas</p>
        </CardContent>
      </Card>

      {/* Engagement Promedio */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Engagement Promedio</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.avg_engagement.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground mt-2">Engagement promedio de contenido</p>
        </CardContent>
      </Card>

      {/* Información General */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Organización</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-semibold truncate">{metrics.name}</div>
          <p className="text-xs text-muted-foreground mt-2">
            Creado: {new Date(metrics.created_at).toLocaleDateString()}
          </p>
          {metrics.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{metrics.description}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
