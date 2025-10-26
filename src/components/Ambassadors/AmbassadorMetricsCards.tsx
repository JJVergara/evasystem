
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MetricCard } from "@/components/Dashboard/MetricCard";
import { Users, Trophy, Target, TrendingUp, Eye, Heart } from "lucide-react";

interface AmbassadorMetricsCardsProps {
  metrics: {
    name: string;
    instagram_user: string;
    status: string;
    global_points: number;
    global_category: string;
    performance_status: string;
    events_participated: number;
    completed_tasks: number;
    failed_tasks: number;
    follower_count: number;
    total_reach: number;
    avg_engagement: number;
    completion_rate: number;
    last_activity: string | null;
  };
}

export function AmbassadorMetricsCards({ metrics }: AmbassadorMetricsCardsProps) {
  const getCategoryColor = (category: string) => {
    const colors = {
      'bronze': 'bg-amber-100 text-amber-800',
      'silver': 'bg-gray-100 text-gray-800',
      'gold': 'bg-yellow-100 text-yellow-800',
      'diamond': 'bg-purple-100 text-purple-800'
    };
    return colors[category as keyof typeof colors] || colors.bronze;
  };

  const getPerformanceColor = (status: string) => {
    const colors = {
      'cumple': 'bg-green-100 text-green-800',
      'advertencia': 'bg-yellow-100 text-yellow-800',
      'no_cumple': 'bg-red-100 text-red-800',
      'exclusivo': 'bg-purple-100 text-purple-800'
    };
    return colors[status as keyof typeof colors] || colors.cumple;
  };

  return (
    <div className="space-y-6">
      {/* Ambassador Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="text-lg">
                {metrics.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{metrics.name}</h2>
              <p className="text-muted-foreground">@{metrics.instagram_user}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant={metrics.status === 'active' ? 'default' : 'secondary'}>
                  {metrics.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
                <Badge className={getCategoryColor(metrics.global_category)}>
                  {metrics.global_category.charAt(0).toUpperCase() + metrics.global_category.slice(1)}
                </Badge>
                <Badge className={getPerformanceColor(metrics.performance_status)}>
                  {metrics.performance_status === 'cumple' ? 'Cumple' :
                   metrics.performance_status === 'advertencia' ? 'Advertencia' :
                   metrics.performance_status === 'no_cumple' ? 'No Cumple' : 'Exclusivo'}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                {metrics.global_points}
              </div>
              <p className="text-sm text-muted-foreground">Puntos Globales</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Eventos Participados"
          value={metrics.events_participated}
          icon={<Users className="w-4 h-4" />}
          description="Total de eventos"
        />
        
        <MetricCard
          title="Tareas Completadas"
          value={metrics.completed_tasks}
          icon={<Trophy className="w-4 h-4" />}
          description={`${metrics.failed_tasks} fallidas`}
        />
        
        <MetricCard
          title="Tasa de Cumplimiento"
          value={`${metrics.completion_rate}%`}
          icon={<Target className="w-4 h-4" />}
          trend={{
            value: metrics.completion_rate > 80 ? 5 : -2,
            isPositive: metrics.completion_rate > 80
          }}
        />
        
        <MetricCard
          title="Alcance Total"
          value={metrics.total_reach.toLocaleString()}
          icon={<Eye className="w-4 h-4" />}
          description="Visualizaciones totales"
        />
        
        <MetricCard
          title="Engagement Promedio"
          value={`${metrics.avg_engagement}%`}
          icon={<Heart className="w-4 h-4" />}
          description="Interacción media"
        />
        
        <MetricCard
          title="Seguidores"
          value={metrics.follower_count.toLocaleString()}
          icon={<TrendingUp className="w-4 h-4" />}
          description="Instagram followers"
        />
      </div>
    </div>
  );
}
