import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { InstagramConnect } from '@/components/Instagram/InstagramConnect';

interface EditOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrganizationUpdated: () => void;
  organization: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

interface OrganizationFormData {
  name: string;
  description: string;
}

export default function EditOrganizationModal({
  isOpen,
  onClose,
  onOrganizationUpdated,
  organization,
}: EditOrganizationModalProps) {
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: '',
    description: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (organization && isOpen) {
      setFormData({
        name: organization.name,
        description: organization.description || '',
      });
    }
  }, [organization, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    setIsLoading(true);

    try {
      // Validación básica
      if (!formData.name.trim()) {
        toast.error('El nombre de la organización es obligatorio');
        return;
      }

      console.log('Updating organization:', organization.id);

      // Actualizar la organización
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
        })
        .eq('id', organization.id);

      if (updateError) {
        console.error('Error updating organization:', updateError);
        toast.error('Error al actualizar organización: ' + updateError.message);
        return;
      }

      console.log('Organization updated successfully');

      toast.success(`¡Organización "${formData.name}" actualizada exitosamente!`);
      onOrganizationUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Error al actualizar organización');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!organization) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Editar Organización
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <Label htmlFor="name">Nombre de la Organización/Productora *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Productora de Eventos XYZ"
              required
              maxLength={100}
            />
          </div>

          {/* Descripción */}
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe brevemente tu productora de eventos..."
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Instagram Business Connection */}
          <div>
            <Label>Conexión Instagram Business</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Conecta tu cuenta business de Instagram para gestionar contenido automáticamente
            </p>
            <InstagramConnect
              type="organization"
              entityId={organization.id}
              organizationId={organization.id}
              currentStatus={{ isConnected: false }} // TODO: Get actual status from organization data
              onConnectionChange={onOrganizationUpdated}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Actualizando...' : 'Actualizar Organización'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
