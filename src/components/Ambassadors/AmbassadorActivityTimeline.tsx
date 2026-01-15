import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'invalid':
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
      case 'uploaded':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'in_progress':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
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
                className="flex items-start space-x-3 pb-4 border-b border-border last:border-b-0"
              >
                <div className="flex-shrink-0 mt-0.5">{getStatusIcon(activity.status)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{activity.description}</p>
                    <div className="flex items-center space-x-2">
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
