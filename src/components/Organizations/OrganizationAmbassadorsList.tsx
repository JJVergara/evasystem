import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Award, Target } from 'lucide-react';

interface TopAmbassador {
  id: string;
  name: string;
  instagram_user: string;
  points: number;
  tasks_completed: number;
  performance_status: string;
}

interface OrganizationAmbassadorsListProps {
  ambassadors: TopAmbassador[];
}

export function OrganizationAmbassadorsList({ ambassadors }: OrganizationAmbassadorsListProps) {
  const getPerformanceBadge = (status: string) => {
    const styles = {
      cumple: { variant: 'default' as const, label: 'Cumple' },
      advertencia: { variant: 'secondary' as const, label: 'Advertencia' },
      no_cumple: { variant: 'destructive' as const, label: 'No Cumple' },
      exclusivo: { variant: 'outline' as const, label: 'Exclusivo' },
    };
    return styles[status as keyof typeof styles] || styles.cumple;
  };

  const getRankIcon = (index: number) => {
    const icons = ['🥇', '🥈', '🥉'];
    return icons[index] || '🏅';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Top Embajadores
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ambassadors.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No hay embajadores registrados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ambassadors.map((ambassador, index) => {
              const performanceBadge = getPerformanceBadge(ambassador.performance_status);

              return (
                <div
                  key={ambassador.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 text-lg">
                      {getRankIcon(index)}
                    </div>

                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {ambassador.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{ambassador.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          @{ambassador.instagram_user}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <Award className="w-3 h-3" />
                        <span className="font-bold">{ambassador.points}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">puntos</p>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <Target className="w-3 h-3" />
                        <span className="font-medium">{ambassador.tasks_completed}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">tareas</p>
                    </div>

                    <Badge variant={performanceBadge.variant} className="text-xs">
                      {performanceBadge.label}
                    </Badge>
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
