import { Card, CardContent } from '@/components/ui/card';
import { EMOJIS } from '@/constants';

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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center space-x-2">
            <span className="text-lg sm:text-xl shrink-0 text-info">{EMOJIS.status.pending}</span>
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-bold text-info">{stats.uploaded}</div>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Historias Subidas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center space-x-2">
            <span className="text-lg sm:text-xl shrink-0 text-success">
              {EMOJIS.status.success}
            </span>
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-bold text-success">{stats.completed}</div>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Completadas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center space-x-2">
            <span className="text-lg sm:text-xl shrink-0 text-warning">
              {EMOJIS.status.warning}
            </span>
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-bold text-warning">{stats.in_progress}</div>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">En Progreso</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center space-x-2">
            <span className="text-lg sm:text-xl shrink-0 text-destructive">
              {EMOJIS.status.error}
            </span>
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-bold text-destructive">{stats.invalid}</div>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Inválidas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
