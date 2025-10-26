import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface SimpleEvent {
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

interface SimpleEventDashboardProps {
  onCreateEvent?: () => void;
}

export function SimpleEventDashboard({ onCreateEvent }: SimpleEventDashboardProps) {
  const { user } = useAuth();
  const [events, setEvents] = useState<SimpleEvent[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Obtener eventos de las organizaciones del usuario
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Cargando eventos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Eventos Recientes
            </CardTitle>
            <CardDescription>
              {events.length === 0 ? 'No hay eventos creados' : `${events.length} evento(s) registrado(s)`}
            </CardDescription>
          </div>
          {onCreateEvent && (
            <Button onClick={onCreateEvent} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Evento
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hay eventos registrados</p>
            <p className="text-sm">Crea tu primer evento para comenzar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">
                      {event.fiestas?.name || `Evento ${event.id.slice(0, 8)}`}
                    </h3>
                    <Badge variant={event.active ? "default" : "secondary"}>
                      {event.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(event.event_date), "PPP", { locale: es })}
                    </div>
                    {event.fiestas?.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.fiestas.location}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {events.length > 5 && (
              <p className="text-center text-sm text-muted-foreground">
                Y {events.length - 5} evento(s) más...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}