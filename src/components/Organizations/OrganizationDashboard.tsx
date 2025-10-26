
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Building2 } from "lucide-react";
import { useOrganizationMetrics } from "@/hooks/useOrganizationMetrics";
import { OrganizationMetricsCards } from "./OrganizationMetricsCards";
import { OrganizationPerformanceChart } from "./OrganizationPerformanceChart";
import { OrganizationEventsList } from "./OrganizationEventsList";
import { OrganizationAmbassadorsList } from "./OrganizationAmbassadorsList";
import EditOrganizationModal from "./EditOrganizationModal";
import { InstagramConnect } from "@/components/Instagram/InstagramConnect";

interface OrganizationDashboardProps {
  organizationId: string;
  onBack: () => void;
}

export function OrganizationDashboard({ organizationId, onBack }: OrganizationDashboardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { metrics, loading, error, refreshMetrics } = useOrganizationMetrics(organizationId);

  const handleOrganizationUpdated = () => {
    refreshMetrics();
    setIsEditModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Cargando métricas de la organización...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="text-center py-8">
        <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Error al cargar datos</h3>
        <p className="text-muted-foreground mb-4">
          {error || 'No se pudieron cargar las métricas de la organización'}
        </p>
        <Button onClick={refreshMetrics}>Intentar de nuevo</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{metrics.name}</h1>
            {metrics.description && (
              <p className="text-muted-foreground">{metrics.description}</p>
            )}
          </div>
        </div>
        <Button onClick={() => setIsEditModalOpen(true)}>
          <Edit className="w-4 h-4 mr-2" />
          Editar Organización
        </Button>
      </div>

      {/* Instagram Connection */}
      <div className="bg-card rounded-lg p-6 border">
        <h3 className="text-lg font-semibold mb-4">Conexión Instagram Business</h3>
        <InstagramConnect 
          type="organization"
          entityId={metrics.id}
          organizationId={metrics.id}
          currentStatus={{
            isConnected: !!metrics.instagram_username,
            lastSync: metrics.last_instagram_sync
          }}
        />
      </div>

      {/* Metrics Cards */}
      <OrganizationMetricsCards metrics={metrics} />

      {/* Performance Charts */}
      <OrganizationPerformanceChart monthlyData={metrics.monthly_performance} />

      {/* Events and Ambassadors Lists */}
      <div className="grid gap-6 md:grid-cols-2">
        <OrganizationEventsList events={metrics.recent_events} />
        <OrganizationAmbassadorsList ambassadors={metrics.top_ambassadors} />
      </div>

      {/* Edit Organization Modal */}
      <EditOrganizationModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onOrganizationUpdated={handleOrganizationUpdated}
        organization={metrics ? {
          id: metrics.id,
          name: metrics.name,
          description: metrics.description
        } : null}
      />
    </div>
  );
}
