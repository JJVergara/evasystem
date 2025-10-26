import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Calendar, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { SimpleCreateEventModal } from "./SimpleCreateEventModal";

interface EventData {
  id: string;
  event_date: string;
  active: boolean;
  created_at: string;
  created_by_user_id: string;
  end_date: string;
  fiesta_id: string;
  start_date: string;
  fiestas?: {
    name: string;
    description: string;
    location: string;
  };
}

export default function EventManagement() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      setLoading(true);

      // Primero obtener las organizaciones del usuario
      const { data: organizations, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('created_by', user!.id);

      if (orgError) throw orgError;

      if (!organizations || organizations.length === 0) {
        setEvents([]);
        return;
      }

      const organizationIds = organizations.map(org => org.id);

      // Obtener eventos de las organizaciones del usuario con información de fiestas
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          fiestas (
            name,
            description,
            location
          )
        `)
        .eq('fiestas.organization_id', organizationIds[0])
        .order('event_date', { ascending: false });

      if (eventsError) throw eventsError;

      setEvents(eventsData || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event =>
    searchTerm === "" ||
    event.fiestas?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.fiestas?.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.fiestas?.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">Cargando eventos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Eventos</h1>
          <p className="text-muted-foreground">
            Administra los eventos de tu organización
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Evento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nombre, ubicación o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {filteredEvents.length === 0 && searchTerm !== "" ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>No se encontraron eventos que coincidan con "{searchTerm}"</p>
          </CardContent>
        </Card>
      ) : filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hay eventos registrados</p>
            <p className="text-sm">Crea tu primer evento para comenzar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="space-y-2">
                  <CardTitle className="text-lg">
                    {event.fiestas?.name || `Evento ${event.id.slice(0, 8)}`}
                  </CardTitle>
                  <div className="space-y-2">
                    <Badge variant={event.active ? "default" : "secondary"}>
                      {event.active ? "Activo" : "Inactivo"}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Fecha: {new Date(event.event_date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Inicio: {event.start_date ? new Date(event.start_date).toLocaleDateString() : 'No definido'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Fin: {event.end_date ? new Date(event.end_date).toLocaleDateString() : 'No definido'}
                    </p>
                    {event.fiestas?.location && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-1" />
                        {event.fiestas.location}
                      </div>
                    )}
                    {event.fiestas?.description && (
                      <p className="text-sm text-muted-foreground">
                        {event.fiestas.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <SimpleCreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onEventCreated={fetchEvents}
      />
    </div>
  );
}