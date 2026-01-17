import { Card, CardContent } from '@/components/ui/card';
import { Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface TaskStatsCardsProps {
  stats: {
    uploaded: number;
    completed: number;
    in_progress: number;
    invalid: number;
  };
}

export function TaskStatsCards({ stats }: TaskStatsCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-info" />
            <div>
              <div className="text-2xl font-bold text-info">{stats.uploaded}</div>
              <p className="text-sm text-muted-foreground">Historias Subidas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-success" />
            <div>
              <div className="text-2xl font-bold text-success">{stats.completed}</div>
              <p className="text-sm text-muted-foreground">Completadas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <div>
              <div className="text-2xl font-bold text-warning">{stats.in_progress}</div>
              <p className="text-sm text-muted-foreground">En Progreso</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-destructive" />
            <div>
              <div className="text-2xl font-bold text-destructive">{stats.invalid}</div>
              <p className="text-sm text-muted-foreground">Inválidas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
