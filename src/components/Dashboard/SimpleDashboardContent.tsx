import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Calendar, Users, Activity } from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { AmbassadorRanking } from './AmbassadorRanking';

export function SimpleDashboardContent() {
  const { stats, loading } = useDashboardStats();

  const StatCard = ({
    title,
    value,
    icon: Icon,
    description,
  }: {
    title: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
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
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Resumen de tu actividad en el sistema EVA</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Organizaciones"
          value={stats.totalOrganizations}
          icon={Building2}
          description="Productoras registradas"
        />
        <StatCard
          title="Eventos"
          value={stats.totalEvents}
          icon={Calendar}
          description="Fiestas organizadas"
        />
        <StatCard
          title="Embajadores"
          value={stats.totalAmbassadors}
          icon={Users}
          description="Personas registradas"
        />
        <StatCard title="Sistema" value={1} icon={Activity} description="EVA funcionando" />
      </div>

      {stats.totalOrganizations === 0 && !loading && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
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
