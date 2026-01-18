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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CalendarDays, Loader2 } from 'lucide-react';
import { useFiestas } from '@/hooks/useFiestas';

interface CreateFiestaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFiestaCreated: () => void;
}

interface FiestaFormData {
  name: string;
  description: string;
  event_date: string;
  location: string;
  main_hashtag: string;
  secondary_hashtags: string;
}

export function CreateFiestaModal({ isOpen, onClose, onFiestaCreated }: CreateFiestaModalProps) {
  const { createFiesta } = useFiestas();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FiestaFormData>({
    name: '',
    description: '',
    event_date: '',
    location: '',
    main_hashtag: '',
    secondary_hashtags: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    setIsLoading(true);

    const fiestaData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      event_date: formData.event_date || null,
      location: formData.location.trim() || null,
      main_hashtag: formData.main_hashtag.trim() || null,
      secondary_hashtags: formData.secondary_hashtags.trim()
        ? formData.secondary_hashtags
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
        : null,
      status: 'active',
    };

    const result = await createFiesta(fiestaData);

    if (result) {
      resetForm();
      onFiestaCreated();
    }

    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      event_date: '',
      location: '',
      main_hashtag: '',
      secondary_hashtags: '',
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Crear Nueva Fiesta
          </DialogTitle>
          <DialogDescription>
            Crea una nueva fiesta para gestionar eventos y embajadores.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Fiesta *</Label>
            <Input
              id="name"
              placeholder="Ej: Fiesta de Año Nuevo 2024"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Describe la fiesta..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_date">Fecha del Evento</Label>
              <Input
                id="event_date"
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, event_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                placeholder="Ej: Santiago, Chile"
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="main_hashtag">Hashtag Principal</Label>
            <Input
              id="main_hashtag"
              placeholder="Ej: #FiestaAñoNuevo2024"
              value={formData.main_hashtag}
              onChange={(e) => setFormData((prev) => ({ ...prev, main_hashtag: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondary_hashtags">Hashtags Secundarios</Label>
            <Input
              id="secondary_hashtags"
              placeholder="Ej: #fiesta, #celebracion, #2024 (separados por comas)"
              value={formData.secondary_hashtags}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, secondary_hashtags: e.target.value }))
              }
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Fiesta'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
