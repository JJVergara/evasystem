import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { InstagramConnect } from "@/components/Instagram/InstagramConnect";
import { useAmbassadorInstagramStatus } from "@/hooks/useAmbassadorInstagramStatus";

interface Ambassador {
  id: string;
  first_name: string;
  last_name: string;
  email?: string; // Optional - only available with manage_ambassadors permission
  instagram_user: string;
  organization_id: string;
  status: string;
  performance_status: string;
  date_of_birth?: string;
  rut?: string;
}

interface EditAmbassadorModalProps {
  isOpen: boolean;
  onClose: () => void;
  ambassador: Ambassador | null;
  onAmbassadorUpdated: () => void;
}

export function EditAmbassadorModal({ 
  isOpen, 
  onClose, 
  ambassador, 
  onAmbassadorUpdated 
}: EditAmbassadorModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    instagram_user: "",
    status: "active",
    performance_status: "cumple",
    date_of_birth: "",
    rut: ""
  });

  useEffect(() => {
    if (ambassador) {
      setFormData({
        first_name: ambassador.first_name || "",
        last_name: ambassador.last_name || "",
        email: ambassador.email || "",
        instagram_user: ambassador.instagram_user || "",
        status: ambassador.status || "active",
        performance_status: ambassador.performance_status || "cumple",
        date_of_birth: ambassador.date_of_birth || "",
        rut: ambassador.rut || ""
      });
    }
  }, [ambassador]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ambassador) return;

    try {
      setLoading(true);

      // Validate required fields
      if (!formData.first_name || !formData.last_name || !formData.email || !formData.instagram_user) {
        toast.error("Por favor completa todos los campos requeridos");
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error("Por favor ingresa un email válido");
        return;
      }

      // Clean Instagram username
      const cleanInstagram = formData.instagram_user.replace(/^@/, '');

      const { error } = await supabase
        .from('embassadors')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          instagram_user: cleanInstagram,
          status: formData.status,
          performance_status: formData.performance_status,
          date_of_birth: formData.date_of_birth || null,
          rut: formData.rut || null
        })
        .eq('id', ambassador.id);

      if (error) throw error;

      toast.success("Embajador actualizado exitosamente");
      onAmbassadorUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating ambassador:', error);
      toast.error("Error al actualizar embajador");
    } finally {
      setLoading(false);
    }
  };

  const handleInstagramChange = (value: string) => {
    const cleanValue = value.startsWith('@') ? value.slice(1) : value;
    setFormData(prev => ({ ...prev, instagram_user: cleanValue }));
  };

  if (!ambassador) return null;

  const instagramStatus = useAmbassadorInstagramStatus(ambassador.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Embajador</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">Nombre *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                placeholder="Nombre"
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Apellido *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                placeholder="Apellido"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="correo@ejemplo.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="instagram_user">Usuario de Instagram *</Label>
            <Input
              id="instagram_user"
              value={formData.instagram_user}
              onChange={(e) => handleInstagramChange(e.target.value)}
              placeholder="nombreusuario"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rut">RUT</Label>
              <Input
                id="rut"
                value={formData.rut}
                onChange={(e) => setFormData(prev => ({ ...prev, rut: e.target.value }))}
                placeholder="12.345.678-9"
              />
            </div>
            <div>
              <Label htmlFor="date_of_birth">Fecha de Nacimiento</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Estado</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="performance_status">Estado de Performance</Label>
              <Select value={formData.performance_status} onValueChange={(value) => setFormData(prev => ({ ...prev, performance_status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cumple">Cumple</SelectItem>
                  <SelectItem value="advertencia">Advertencia</SelectItem>
                  <SelectItem value="no_cumple">No Cumple</SelectItem>
                  <SelectItem value="exclusivo">Exclusivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Instagram Connection */}
          <div className="space-y-3">
            <Label>Conexión de Instagram</Label>
            <InstagramConnect
              type="ambassador"
              entityId={ambassador.id}
              organizationId={ambassador.organization_id}
              currentStatus={instagramStatus}
              onConnectionChange={onAmbassadorUpdated}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar Embajador"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}