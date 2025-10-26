import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Ambassador {
  id: string;
  first_name: string;
  last_name: string;
  email?: string; // Optional - only available with manage_ambassadors permission
  instagram_user: string;
}

interface DeleteAmbassadorModalProps {
  isOpen: boolean;
  onClose: () => void;
  ambassador: Ambassador | null;
  onAmbassadorDeleted: () => void;
}

export function DeleteAmbassadorModal({ 
  isOpen, 
  onClose, 
  ambassador, 
  onAmbassadorDeleted 
}: DeleteAmbassadorModalProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!ambassador) return;

    try {
      setLoading(true);

      // Instead of hard delete, we'll set status to 'deleted' (soft delete)
      const { error } = await supabase
        .from('embassadors')
        .update({ status: 'deleted' })
        .eq('id', ambassador.id);

      if (error) throw error;

      toast.success("Embajador eliminado exitosamente");
      onAmbassadorDeleted();
      onClose();
    } catch (error) {
      console.error('Error deleting ambassador:', error);
      toast.error("Error al eliminar embajador");
    } finally {
      setLoading(false);
    }
  };

  if (!ambassador) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Eliminar Embajador</DialogTitle>
              <DialogDescription>
                Esta acción no se puede deshacer
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              Vas a eliminar al siguiente embajador:
            </p>
            <div className="font-medium">
              {ambassador.first_name} {ambassador.last_name}
            </div>
            <div className="text-sm text-muted-foreground">
              @{ambassador.instagram_user}
            </div>
            <div className="text-sm text-muted-foreground">
              {ambassador.email}
            </div>
          </div>

          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <p className="text-sm text-warning-foreground">
              <strong>Importante:</strong> Sus tareas e historial permanecerán en el sistema para mantener la integridad de los datos de eventos pasados.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={loading}
            >
              {loading ? "Eliminando..." : "Eliminar Embajador"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}