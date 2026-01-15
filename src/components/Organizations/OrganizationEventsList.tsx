import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Target, TrendingUp } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  event_date: string;
  total_tasks: number;
  completed_tasks: number;
  total_reach: number;
}

interface OrganizationEventsListProps {
  events: Event[];
}

export function OrganizationEventsList({ events }: OrganizationEventsListProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getCompletionBadgeVariant = (completed: number, total: number) => {
    if (total === 0) return 'secondary';
    const rate = (completed / total) * 100;
    if (rate >= 80) return 'default';
    if (rate >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Eventos Recientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No hay eventos registrados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const completionRate =
                event.total_tasks > 0
                  ? Math.round((event.completed_tasks / event.total_tasks) * 100)
                  : 0;

              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-medium">{event.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.event_date).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Tareas */}
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <Target className="w-3 h-3" />
                        <span className="font-medium">
                          {event.completed_tasks}/{event.total_tasks}
                        </span>
                      </div>
                      <Badge
                        variant={getCompletionBadgeVariant(
                          event.completed_tasks,
                          event.total_tasks
                        )}
                        className="text-xs mt-1"
                      >
                        {completionRate}% completado
                      </Badge>
                    </div>

                    {/* Alcance */}
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <TrendingUp className="w-3 h-3" />
                        <span className="font-medium">{formatNumber(event.total_reach)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">alcance</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
