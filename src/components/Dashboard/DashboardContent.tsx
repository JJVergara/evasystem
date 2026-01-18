import { useUserProfile } from '@/hooks/useUserProfile';
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';
import { EVABrandedDashboard } from './EVABrandedDashboard';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GlassPanel } from '@/components/Layout/GlassPanel';
import { PageHeader } from '@/components/Layout/PageHeader';
import { EMOJIS } from '@/constants';

export default function DashboardContent() {
  const { profile, loading, error, retryFetch } = useUserProfile();

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard EVA"
          description="Cargando tu experiencia personalizada..."
          emoji={EMOJIS.navigation.dashboard}
        />
        <GlassPanel className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <span className="text-3xl animate-pulse">{EMOJIS.ui.loading}</span>
          <p className="text-muted-foreground">Cargando tu perfil...</p>
        </GlassPanel>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard EVA"
          description="Error al cargar el dashboard"
          emoji={EMOJIS.navigation.dashboard}
        />
        <GlassPanel className="max-w-md mx-auto">
          <Alert variant="destructive">
            <span>{EMOJIS.status.error}</span>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button onClick={retryFetch} variant="outline">
              Reintentar
            </Button>
          </div>
        </GlassPanel>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard EVA"
          description="Configurando tu perfil"
          emoji={EMOJIS.navigation.dashboard}
        />
        <GlassPanel className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-4">Perfil no encontrado</h2>
          <p className="text-muted-foreground mb-6">
            No se pudo cargar tu perfil. Por favor, contacta al soporte técnico.
          </p>
          <Button onClick={retryFetch}>Reintentar</Button>
        </GlassPanel>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <EVABrandedDashboard />
    </ErrorBoundary>
  );
}
