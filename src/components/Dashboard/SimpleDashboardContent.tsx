import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { AmbassadorRanking } from './AmbassadorRanking';
import { EMOJIS } from '@/constants';

export function SimpleDashboardContent() {
  const { stats, loading } = useDashboardStats();

  const StatCard = ({
    title,
    value,
    emoji,
    description,
  }: {
    title: string;
    value: number;
    emoji: string;
    description: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className="text-lg">{emoji}</span>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {EMOJIS.navigation.dashboard} Dashboard
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Resumen de tu actividad en el sistema EVA
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Organizaciones"
          value={stats.totalOrganizations}
          emoji={EMOJIS.entities.organization}
          description="Productoras registradas"
        />
        <StatCard
          title="Eventos"
          value={stats.totalEvents}
          emoji={EMOJIS.navigation.events}
          description="Fiestas organizadas"
        />
        <StatCard
          title="Embajadores"
          value={stats.totalAmbassadors}
          emoji={EMOJIS.navigation.ambassadors}
          description="Personas registradas"
        />
        <StatCard
          title="Sistema"
          value={1}
          emoji={EMOJIS.status.success}
          description="EVA funcionando"
        />
      </div>

      {stats.totalOrganizations === 0 && !loading && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <span className="text-5xl block mb-4">{EMOJIS.feedback.celebrate}</span>
              <h3 className="text-lg font-semibold mb-2">¡Bienvenido a EVA!</h3>
              <p className="text-muted-foreground mb-4">
                Para comenzar, crea tu primera organización o productora de eventos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {stats.totalOrganizations > 0 && <AmbassadorRanking />}
    </div>
  );
}
