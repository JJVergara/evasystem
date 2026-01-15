import { useState } from 'react';
import { Plus, Calendar, MapPin, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Fiesta } from '@/hooks/useFiestas';
import { useFiestas } from '@/hooks/useFiestas';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { CreateFiestaModal } from './CreateFiestaModal';
import { FiestaDetailsModal } from './FiestaDetailsModal';
import { PageHeader } from '@/components/Layout/PageHeader';
import { GlassPanel } from '@/components/Layout/GlassPanel';

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
        <PageHeader title="Fiestas" description="Carga de organización..." />
        <GlassPanel>
          <p className="text-gray-600 text-center py-8">
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
      >
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Fiesta
        </Button>
      </PageHeader>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <GlassPanel key={i} className="animate-pulse">
              <div className="space-y-3">
                <div className="h-4 bg-gray-300 rounded"></div>
                <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </GlassPanel>
          ))}
        </div>
      ) : fiestas.length === 0 ? (
        <GlassPanel className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-semibold mb-2 text-gray-900">No hay fiestas</h3>
          <p className="text-gray-600 mb-6">
            Comienza creando tu primera fiesta para gestionar eventos y embajadores.
          </p>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Primera Fiesta
          </Button>
        </GlassPanel>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {fiestas.map((fiesta) => (
            <GlassPanel
              key={fiesta.id}
              className="hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-blue-600 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                      {fiesta.name}
                    </h3>
                    {fiesta.description && (
                      <p className="text-gray-600 mt-2 line-clamp-2">{fiesta.description}</p>
                    )}
                  </div>
                  <Badge
                    variant={fiesta.status === 'active' ? 'default' : 'secondary'}
                    className={
                      fiesta.status === 'active'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                        : ''
                    }
                  >
                    {fiesta.status === 'active' ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {fiesta.event_date && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                      {new Date(fiesta.event_date).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  )}

                  {fiesta.location && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 text-green-500" />
                      {fiesta.location}
                    </div>
                  )}

                  {fiesta.main_hashtag && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Hash className="h-4 w-4 mr-2 text-purple-500" />
                      {fiesta.main_hashtag}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200/50 flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    Creada {new Date(fiesta.created_at).toLocaleDateString()}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(fiesta)}
                    className="hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 hover:text-white hover:border-transparent transition-all duration-300"
                  >
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
