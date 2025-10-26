
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckSquare, Plus } from "lucide-react";
import { toast } from "sonner";

interface SimpleEventChecklistsProps {
  eventId: string;
}

export function EventChecklists({ eventId }: SimpleEventChecklistsProps) {
  const [tasks, setTasks] = useState<string[]>([]);
  const [newTask, setNewTask] = useState("");

  const handleAddTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, newTask.trim()]);
      setNewTask("");
      toast.success("Tarea agregada correctamente");
    }
  };

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
    toast.success("Tarea eliminada");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Lista de Tareas (Temporal)
            </CardTitle>
            <CardDescription>
              Gestiona las tareas del evento (solo en memoria por ahora)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Agregar nueva tarea..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-md"
              onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
            />
            <Button onClick={handleAddTask} disabled={!newTask.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay tareas registradas</p>
              <p className="text-sm">Agrega la primera tarea para organizar el trabajo</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <span>{task}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveTask(index)}
                  >
                    Eliminar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
