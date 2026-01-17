import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Fiesta } from '@/hooks/useFiestas';
import { useFiestas } from '@/hooks/useFiestas';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { CreateFiestaModal } from './CreateFiestaModal';
import { FiestaDetailsModal } from './FiestaDetailsModal';
import { PageHeader } from '@/components/Layout/PageHeader';
import { GlassPanel } from '@/components/Layout/GlassPanel';
import { EMOJIS } from '@/constants';

const FiestasManagement = () => {
  const { organization } = useCurrentOrganization();
  const { fiestas, loading } = useFiestas();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedFiesta, setSelectedFiesta] = useState<Fiesta | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const handleViewDetails = (fiesta: Fiesta) => {
    setSelectedFiesta(fiesta);
    setIsDetailsModalOpen(true);
  };

  if (!organization) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Fiestas"
          description="Carga de organización..."
          emoji={EMOJIS.navigation.events}
        />
        <GlassPanel>
          <p className="text-muted-foreground text-center py-8">
            No se encontró organización. Por favor, configura tu organización primero.
          </p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fiestas"
        description={`Gestiona las fiestas y eventos de ${organization.name}`}
        emoji={EMOJIS.navigation.events}
      >
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Fiesta
        </Button>
      </PageHeader>

      {loading ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <GlassPanel key={i} className="animate-pulse">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </GlassPanel>
          ))}
        </div>
      ) : fiestas.length === 0 ? (
        <GlassPanel className="text-center py-12">
          <span className="text-5xl block mb-4 text-muted-foreground">
            {EMOJIS.entities.calendar}
          </span>
          <h3 className="text-xl font-semibold mb-2 text-foreground">No hay fiestas</h3>
          <p className="text-muted-foreground mb-6">
            Comienza creando tu primera fiesta para gestionar eventos y embajadores.
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Primera Fiesta
          </Button>
        </GlassPanel>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {fiestas.map((fiesta) => (
            <GlassPanel
              key={fiesta.id}
              className="hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                      {fiesta.name}
                    </h3>
                    {fiesta.description && (
                      <p className="text-muted-foreground mt-2 line-clamp-2">
                        {fiesta.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={fiesta.status === 'active' ? 'success' : 'secondary'}>
                    {fiesta.status === 'active' ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {fiesta.event_date && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span className="mr-2 text-info">{EMOJIS.entities.calendar}</span>
                      {new Date(fiesta.event_date).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  )}

                  {fiesta.location && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span className="mr-2 text-success">📍</span>
                      {fiesta.location}
                    </div>
                  )}

                  {fiesta.main_hashtag && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span className="mr-2 text-primary">{EMOJIS.navigation.mentions}</span>
                      {fiesta.main_hashtag}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Creada {new Date(fiesta.created_at).toLocaleDateString()}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => handleViewDetails(fiesta)}>
                    Ver Detalles
                  </Button>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}

      <CreateFiestaModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onFiestaCreated={() => {
          setIsCreateModalOpen(false);
        }}
      />

      <FiestaDetailsModal
        fiesta={selectedFiesta}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedFiesta(null);
        }}
      />
    </div>
  );
};

export default FiestasManagement;
