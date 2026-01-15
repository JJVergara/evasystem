import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Mail, Instagram, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddAmbassadorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAmbassadorAdded: () => void;
}

interface AmbassadorFormData {
  first_name: string;
  last_name: string;
  email: string;
  instagram_user: string;
  organization_id: string;
}

interface Organization {
  id: string;
  name: string;
}

export default function AddAmbassadorModal({
  isOpen,
  onClose,
  onAmbassadorAdded,
}: AddAmbassadorModalProps) {
  const [formData, setFormData] = useState<AmbassadorFormData>({
    first_name: '',
    last_name: '',
    email: '',
    instagram_user: '',
    organization_id: '',
  });

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchOrganizations();
    }
  }, [isOpen]);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase.from('organizations').select('id, name').order('name');

      if (error) {
        console.error('Error fetching organizations:', error);
        toast.error('Error al cargar organizaciones');
        return;
      }

      setOrganizations(data || []);
    } catch (error) {
      console.error('Error al obtener organizaciones:', error);
      setOrganizations([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validaciones básicas
      if (
        !formData.first_name ||
        !formData.last_name ||
        !formData.email ||
        !formData.instagram_user ||
        !formData.organization_id
      ) {
        toast.error('Todos los campos obligatorios deben estar completos');
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('El formato del email no es válido');
        return;
      }

      // Validar que el usuario de Instagram no comience con @
      const instagramUser = formData.instagram_user.startsWith('@')
        ? formData.instagram_user.slice(1)
        : formData.instagram_user;

      // Crear el embajador directamente en Supabase
      const ambassadorData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        instagram_user: instagramUser,
        organization_id: formData.organization_id,
        status: 'active',
      };

      console.log('Creando embajador con datos:', ambassadorData);

      const { data: newAmbassador, error: ambassadorError } = await supabase
        .from('embassadors')
        .insert(ambassadorData)
        .select()
        .single();

      if (ambassadorError) {
        console.error('Error creating ambassador:', ambassadorError);
        toast.error('Error al crear embajador: ' + ambassadorError.message);
        return;
      }

      toast.success('Embajador creado exitosamente');
      resetForm();
      onClose();
      onAmbassadorAdded();
    } catch (error) {
      console.error('Error creating ambassador:', error);
      toast.error('Error al crear embajador');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      instagram_user: '',
      organization_id: '',
    });
  };

  const handleInstagramChange = (value: string) => {
    // Auto-agregar @ si no está presente
    const cleanValue = value.replace('@', '');
    setFormData({ ...formData, instagram_user: cleanValue });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Embajador</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selección de Organización */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organización
            </h3>

            <div>
              <Label htmlFor="organization_id">Seleccionar Organización/Fiesta *</Label>
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

          {/* Información Personal */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Información Personal</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Nombre *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Nombre"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="last_name">Apellido *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Apellido"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@ejemplo.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="instagram_user">Usuario de Instagram *</Label>
              <div className="relative">
                <Instagram className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <div className="absolute left-8 top-3 text-muted-foreground">@</div>
                <Input
                  id="instagram_user"
                  value={formData.instagram_user}
                  onChange={(e) => handleInstagramChange(e.target.value)}
                  placeholder="usuario"
                  className="pl-12"
                  required
                />
              </div>
            </div>

            {/* Instagram Connection */}
            <div>
              <Label>Conexión Instagram (Opcional)</Label>
              <p className="text-sm text-muted-foreground">
                Podrás conectar la cuenta de Instagram del embajador después de crearlo, desde el
                dashboard.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Agregar Embajador'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
