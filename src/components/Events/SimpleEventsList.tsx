import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { toast } from "sonner";

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

export function SimpleEventsList() {
  const { organization } = useCurrentOrganization();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization) {
      fetchEvents();
    }
  }, [organization]);

  const fetchEvents = async () => {
    if (!organization) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          fiestas (
            name,
            description,
            location
          )
        `)
        .eq('fiestas.organization_id', organization.id)
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Eventos</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Evento
        </Button>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hay eventos registrados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{event.fiestas?.name || `Evento ${event.id.slice(0, 8)}`}</CardTitle>
                    {event.fiestas?.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.fiestas.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={event.active ? "default" : "secondary"}>
                    {event.active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    Fecha: {new Date(event.event_date).toLocaleDateString()}
                  </div>
                  {event.fiestas?.location && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      {event.fiestas.location}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span>Inicio: {event.start_date ? new Date(event.start_date).toLocaleDateString() : 'No definido'}</span>
                    <span className="mx-2">•</span>
                    <span>Fin: {event.end_date ? new Date(event.end_date).toLocaleDateString() : 'No definido'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}