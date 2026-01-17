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
import { Trophy, RefreshCw, TrendingUp, MessageSquare, Award, Target } from 'lucide-react';

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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-warning" />
          <CardTitle>Ranking de Embajadores</CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || loading}
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
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay embajadores activos en tu organización.</p>
            <p className="text-sm mt-2">
              Los embajadores aparecerán aquí cuando se registren y participen en eventos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Embajador</TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Award className="h-4 w-4" />
                      Puntos
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Categoría</TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Target className="h-4 w-4" />
                      Eventos
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <MessageSquare className="h-4 w-4" />
                      Tareas
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <TrendingUp className="h-4 w-4" />
                      Completación
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
                    <TableCell className="text-center">
                      {getCategoryBadge(ambassador.global_category)}
                    </TableCell>
                    <TableCell className="text-right">{ambassador.events_participated}</TableCell>
                    <TableCell className="text-right">
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
