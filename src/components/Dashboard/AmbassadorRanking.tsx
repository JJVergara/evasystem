import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAmbassadorRanking } from '@/hooks/useAmbassadorRanking';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { EMOJIS } from '@/constants';

const CATEGORY_STYLES: Record<string, string> = {
  bronze: 'bg-warning/10 text-warning border-warning/30',
  silver: 'bg-muted text-muted-foreground border-border',
  gold: 'bg-warning/20 text-warning border-warning/40',
  diamond: 'bg-primary/10 text-primary border-primary/30',
};

const RANK_BADGES: Record<number, JSX.Element> = {
  1: <span className="text-3xl">🥇</span>,
  2: <span className="text-3xl">🥈</span>,
  3: <span className="text-3xl">🥉</span>,
};

function getRankBadge(rank: number) {
  return RANK_BADGES[rank] || <span className="text-muted-foreground font-medium">#{rank}</span>;
}

function formatNumber(num: number) {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function AmbassadorRanking() {
  const { ranking, loading, refreshRanking } = useAmbassadorRanking();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshRanking();
    setRefreshing(false);
    toast.success('Ranking actualizado');
  };

  const getCategoryBadge = (category: string) => {
    const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.bronze;
    return (
      <Badge variant="outline" className={style}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl text-warning">{EMOJIS.feedback.trophy}</span>
          <CardTitle className="text-lg sm:text-xl">Ranking de Embajadores</CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {/* Skeleton table rows */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        ) : ranking.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <span className="text-5xl block mb-4 opacity-50">{EMOJIS.feedback.trophy}</span>
            <p>No hay embajadores activos en tu organización.</p>
            <p className="text-sm mt-2">
              Los embajadores aparecerán aquí cuando se registren y participen en eventos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 sm:w-16">Rank</TableHead>
                  <TableHead>Embajador</TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="hidden sm:inline">{EMOJIS.feedback.medal}</span>
                      Puntos
                    </div>
                  </TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Categoría</TableHead>
                  <TableHead className="text-right hidden md:table-cell">
                    <div className="flex items-center justify-end gap-1">
                      <span>{EMOJIS.feedback.target}</span>
                      Eventos
                    </div>
                  </TableHead>
                  <TableHead className="text-right hidden md:table-cell">
                    <div className="flex items-center justify-end gap-1">
                      <span>{EMOJIS.entities.task}</span>
                      Tareas
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="hidden sm:inline">{EMOJIS.navigation.analytics}</span>
                      <span className="hidden sm:inline">Completación</span>
                      <span className="sm:hidden">%</span>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((ambassador) => (
                  <TableRow key={ambassador.id}>
                    <TableCell>{getRankBadge(ambassador.rank)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {ambassador.first_name} {ambassador.last_name}
                        </div>
                        {ambassador.instagram_user && (
                          <div className="text-sm text-muted-foreground">
                            @{ambassador.instagram_user}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(ambassador.global_points)}
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      {getCategoryBadge(ambassador.global_category)}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      {ambassador.events_participated}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      <div className="flex flex-col items-end">
                        <span className="font-medium">{ambassador.completed_tasks}</span>
                        <span className="text-xs text-muted-foreground">
                          / {ambassador.total_tasks} total
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span
                          className={
                            ambassador.completion_rate >= 80
                              ? 'text-success font-medium'
                              : ambassador.completion_rate >= 60
                                ? 'text-warning'
                                : 'text-destructive'
                          }
                        >
                          {ambassador.completion_rate}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
