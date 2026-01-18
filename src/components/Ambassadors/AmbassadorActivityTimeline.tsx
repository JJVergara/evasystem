import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EMOJIS } from '@/constants';

interface ActivityTimelineProps {
  activities: Array<{
    date: string;
    type: string;
    description: string;
    points?: number;
    status?: string;
  }>;
}

export function AmbassadorActivityTimeline({ activities }: ActivityTimelineProps) {
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <span className="text-success">{EMOJIS.status.success}</span>;
      case 'invalid':
      case 'expired':
        return <span className="text-destructive">{EMOJIS.status.error}</span>;
      case 'pending':
      case 'uploaded':
        return <span className="text-warning">{EMOJIS.status.pending}</span>;
      case 'in_progress':
        return <span className="text-info">{EMOJIS.status.inProgress}</span>;
      default:
        return <span className="text-muted-foreground">{EMOJIS.status.pending}</span>;
    }
  };

  const getStatusLabel = (status?: string) => {
    const labels: Record<string, string> = {
      completed: 'Completada',
      invalid: 'Inválida',
      expired: 'Expirada',
      pending: 'Pendiente',
      uploaded: 'Subida',
      in_progress: 'En Progreso',
    };
    return labels[status || ''] || status;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline de Actividades</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay actividades recientes
            </div>
          ) : (
            activities.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-2 sm:gap-3 pb-4 border-b border-border last:border-b-0"
              >
                <div className="flex-shrink-0 mt-0.5">{getStatusIcon(activity.status)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                    <p className="text-sm font-medium text-foreground">{activity.description}</p>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                      {activity.points && activity.points > 0 && (
                        <Badge variant="outline" className="text-xs">
                          +{activity.points} pts
                        </Badge>
                      )}
                      {activity.status && (
                        <Badge
                          variant={activity.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {getStatusLabel(activity.status)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">{activity.type}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(activity.date)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
