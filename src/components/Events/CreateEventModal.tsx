import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Clock, Hash, DollarSign, Target, User, Instagram } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
}

interface EventFormData {
  name: string;
  description: string;
  location: string;
  event_date: string;
  start_time: string;
  end_time: string;
  main_hashtag: string;
  is_cyclic: boolean;
  cyclic_type: "semanal" | "mensual" | "personalizado" | "";
  active: boolean;
  budget_estimate: string;
  objective: string;
  client_name: string;
  event_type: string;
  instagram_account: string;
}

export default function CreateEventModal({ isOpen, onClose, onEventCreated }: CreateEventModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    name: "",
    description: "",
    location: "",
    event_date: "",
    start_time: "",
    end_time: "",
    main_hashtag: "",
    is_cyclic: false,
    cyclic_type: "",
    active: true,
    budget_estimate: "",
    objective: "",
    client_name: "",
    event_type: "",
    instagram_account: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validaciones básicas
      if (!formData.name.trim() || !formData.event_date) {
        toast.error('El nombre del evento y la fecha son obligatorios');
        return;
      }

      // Obtener el usuario actual y su organización
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error('Usuario no autenticado');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, organization_id')
        .eq('auth_user_id', user.user.id)
        .single();

      if (userError || !userData) {
        console.error('Error getting user data:', userError);
        toast.error('Error al obtener datos del usuario');
        return;
      }

      // Preparar datos del evento - solo los campos que existen en la tabla
      const eventData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        location: formData.location.trim() || null,
        event_date: formData.event_date,
        active: formData.active,
        organization_id: userData.organization_id
      };

      console.log('Creando evento con datos:', eventData);

      // Crear el evento en Supabase
      const { data: newEvent, error: eventError } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();

      if (eventError) {
        console.error('Error creating event:', eventError);
        toast.error('Error al crear evento: ' + eventError.message);
        return;
      }

      toast.success('Evento creado exitosamente');
      resetForm();
      onClose();
      onEventCreated();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Error al crear evento');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      location: "",
      event_date: "",
      start_time: "",
      end_time: "",
      main_hashtag: "",
      is_cyclic: false,
      cyclic_type: "",
      active: true,
      budget_estimate: "",
      objective: "",
      client_name: "",
      event_type: "",
      instagram_account: ""
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Evento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Básica */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Información Básica</h3>
            
            <div>
              <Label htmlFor="name">Nombre del Evento *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Fiesta de Año Nuevo 2024"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe el evento..."
                rows={3}
              />
            </div>
          </div>

          {/* Fecha y Ubicación */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Fecha y Ubicación</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event_date">Fecha del Evento *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="event_date"
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Ubicación</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Dirección o lugar del evento"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Configuración Avanzada */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configuración</h3>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Evento Activo</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Evento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
