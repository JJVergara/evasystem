import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrganizationDeleted: () => void;
  organization: {
    id: string;
    name: string;
  };
}

export function DeleteOrganizationModal({
  isOpen,
  onClose,
  onOrganizationDeleted,
  organization
}: DeleteOrganizationModalProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmationText !== organization.name) {
      toast.error("El nombre de la organización no coincide");
      return;
    }

    try {
      setIsDeleting(true);

      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', organization.id);

      if (error) {
        console.error('Error deleting organization:', error);
        toast.error('Error al eliminar organización: ' + error.message);
        return;
      }

      toast.success('Organización eliminada exitosamente');
      handleClose();
      onOrganizationDeleted();
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast.error('Error inesperado al eliminar organización');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmationText("");
    onClose();
  };

  const isDeleteEnabled = confirmationText === organization.name && !isDeleting;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Eliminar Organización
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>¡Advertencia!</strong> Esta acción no se puede deshacer. 
              Se eliminarán todos los datos asociados incluyendo embajadores, 
              eventos y tareas.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Para confirmar, escribe el nombre de la organización: <strong>{organization.name}</strong>
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Nombre de la organización"
              className="w-full"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!isDeleteEnabled}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                "Eliminar Organización"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}