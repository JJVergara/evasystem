import { EnhancedAmbassadorDashboard } from './EnhancedAmbassadorDashboard';
import { PageHeader } from '@/components/Layout/PageHeader';
import { GlassPanel } from '@/components/Layout/GlassPanel';
import { useAmbassadors } from '@/hooks/useAmbassadors';
import { Skeleton } from '@/components/ui/skeleton';

export default function AmbassadorManagement() {
  const { ambassadors, loading, refreshAmbassadors } = useAmbassadors();

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Embajadores" description="Cargando embajadores..." />
        <GlassPanel className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Embajadores"
        description="Gestiona y monitorea el rendimiento de tus embajadores"
      />
      <EnhancedAmbassadorDashboard ambassadors={ambassadors} onRefresh={refreshAmbassadors} />
    </div>
  );
}
