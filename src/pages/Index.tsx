import { EVABrandedDashboard } from '@/components/Dashboard/EVABrandedDashboard';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';

export default function Index() {
  const { loading: orgLoading } = useCurrentOrganization();

  // Mostrar loading mientras se cargan las organizaciones
  if (orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground animate-pulse">Cargando organizaciones...</p>
        </div>
      </div>
    );
  }

  return <EVABrandedDashboard />;
}
