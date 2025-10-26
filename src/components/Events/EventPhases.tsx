
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface SimpleEventPhase {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

interface EventPhasesProps {
  eventId: string;
}

export function EventPhases({ eventId }: EventPhasesProps) {
  const [phases, setPhases] = useState<SimpleEventPhase[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<SimpleEventPhase | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
  });

  // Simulamos las fases con datos locales por ahora
  useEffect(() => {
    // Simulamos fases por defecto
    setPhases([
      {
        id: "1",
        name: "Pre-evento",
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);
    setLoading(false);
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingPhase) {
        // Actualizar fase existente
        setPhases(phases.map(phase => 
          phase.id === editingPhase.id 
            ? { ...phase, ...formData }
            : phase
        ));
        toast.success("Fase actualizada correctamente");
      } else {
        // Crear nueva fase
        const newPhase: SimpleEventPhase = {
          id: Date.now().toString(),
          name: formData.name,
          start_date: formData.start_date,
          end_date: formData.end_date,
        };
        setPhases([...phases, newPhase]);
        toast.success("Fase creada correctamente");
      }

      resetForm();
    } catch (error) {
      console.error('Error saving phase:', error);
      toast.error("No se pudo guardar la fase");
    }
  };

  const handleDelete = async (phaseId: string) => {
    try {
      setPhases(phases.filter(phase => phase.id !== phaseId));
      toast.success("Fase eliminada correctamente");
    } catch (error) {
      console.error('Error deleting phase:', error);
      toast.error("No se pudo eliminar la fase");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", start_date: "", end_date: "" });
    setEditingPhase(null);
    setIsModalOpen(false);
  };

  const openEditModal = (phase: SimpleEventPhase) => {
    setEditingPhase(phase);
    setFormData({
      name: phase.name,
      start_date: format(new Date(phase.start_date), "yyyy-MM-dd'T'HH:mm"),
      end_date: format(new Date(phase.end_date), "yyyy-MM-dd'T'HH:mm"),
    });
    setIsModalOpen(true);
  };

  const getPhaseStatus = (phase: SimpleEventPhase) => {
    const now = new Date();
    const startDate = new Date(phase.start_date);
    const endDate = new Date(phase.end_date);

    if (now < startDate) return { status: "upcoming", color: "bg-blue-500" };
    if (now >= startDate && now <= endDate) return { status: "active", color: "bg-green-500" };
    return { status: "completed", color: "bg-gray-500" };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
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
              Fases del Evento (Temporal)
            </CardTitle>
            <CardDescription>
              Gestiona las fases del evento (solo en memoria por ahora)
            </CardDescription>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Fase
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPhase ? "Editar Fase" : "Nueva Fase"}
                </DialogTitle>
                <DialogDescription>
                  {editingPhase ? "Modifica los detalles de la fase" : "Crea una nueva fase para el evento"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre de la Fase</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Pre-evento, Ejecución, Post-evento"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="start_date">Fecha de Inicio</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">Fecha de Fin</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingPhase ? "Actualizar" : "Crear"} Fase
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {phases.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hay fases configuradas para este evento</p>
            <p className="text-sm">Crea la primera fase para organizar el cronograma</p>
          </div>
        ) : (
          <div className="space-y-4">
            {phases.map((phase) => {
              const { status, color } = getPhaseStatus(phase);
              return (
                <div key={phase.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${color}`}></div>
                      <div>
                        <h4 className="font-medium">{phase.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(phase.start_date), "PPp", { locale: es })}
                          </span>
                          <span>→</span>
                          <span>{format(new Date(phase.end_date), "PPp", { locale: es })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={status === "active" ? "default" : "secondary"}>
                        {status === "upcoming" && "Próxima"}
                        {status === "active" && "Activa"}
                        {status === "completed" && "Completada"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(phase)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(phase.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
