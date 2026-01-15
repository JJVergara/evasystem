import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, MapPin, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

interface SimpleCreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
}

interface Organization {
  id: string;
  name: string;
}

export function SimpleCreateEventModal({
  isOpen,
  onClose,
  onEventCreated,
}: SimpleCreateEventModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_date: '',
    location: '',
    organization_id: '',
  });
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [organizationsLoaded, setOrganizationsLoaded] = useState(false);

  const loadOrganizations = async () => {
    if (!user || organizationsLoaded) return;

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('created_by', user.id)
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
      setOrganizationsLoaded(true);
    } catch (error) {
      console.error('Error loading organizations:', error);
      toast.error('Error al cargar organizaciones');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name || !formData.event_date || !formData.organization_id) {
        toast.error('Nombre, fecha y organización son obligatorios');
        return;
      }

      const { data, error } = await supabase
        .from('events')
        .insert([
          {
            name: formData.name,
            description: formData.description || null,
            event_date: formData.event_date,
            location: formData.location || null,
            organization_id: formData.organization_id,
            active: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;

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
      name: '',
      description: '',
      event_date: '',
      location: '',
      organization_id: '',
    });
  };

  // Cargar organizaciones cuando se abre el modal
  useEffect(() => {
    if (isOpen && user) {
      loadOrganizations();
    }
  }, [isOpen, user]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Evento</DialogTitle>
          <DialogDescription>
            Completa la información básica para crear un nuevo evento
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organización
            </h3>

            <div>
              <Label htmlFor="organization_id">Seleccionar Organización/Productora *</Label>
              <Select
                value={formData.organization_id}
                onValueChange={(value) => setFormData({ ...formData, organization_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una organización..." />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Información del Evento</h3>

            <div>
              <Label htmlFor="name">Nombre del Evento *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Fiesta de Año Nuevo"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="event_date">Fecha del Evento *</Label>
              <Input
                id="event_date"
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="location">Ubicación</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ej: Club Social, Santiago"
                  className="pl-10"
                />
              </div>
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

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
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
