import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Plus } from 'lucide-react';
import { useTasksManagement } from '@/hooks/useTasksManagement';

interface CreateTaskModalProps {
  ambassadors: Array<{ id: string; name: string; instagram_user: string }>;
  events: Array<{ id: string; name: string; main_hashtag: string }>;
}

export function CreateTaskModal({ ambassadors, events }: CreateTaskModalProps) {
  const { createTask } = useTasksManagement();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    embassador_id: '',
    event_id: '',
    task_type: 'story' as 'story' | 'mention' | 'repost',
    expected_hashtag: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedEvent = events.find((e) => e.id === formData.event_id);
    const hashtag = formData.expected_hashtag || selectedEvent?.main_hashtag || '';

    const success = await createTask({
      ...formData,
      expected_hashtag: hashtag,
    });

    if (success) {
      setOpen(false);
      setFormData({
        embassador_id: '',
        event_id: '',
        task_type: 'story',
        expected_hashtag: '',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Crear Tarea
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Nueva Tarea</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="embassador">Embajador</Label>
            <Select
              value={formData.embassador_id}
              onValueChange={(value) => setFormData({ ...formData, embassador_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar embajador" />
              </SelectTrigger>
              <SelectContent>
                {ambassadors.map((ambassador) => (
                  <SelectItem key={ambassador.id} value={ambassador.id}>
                    {ambassador.name} (@{ambassador.instagram_user})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="event">Evento</Label>
            <Select
              value={formData.event_id}
              onValueChange={(value) => setFormData({ ...formData, event_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar evento" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name} {event.main_hashtag && `(#${event.main_hashtag})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="task_type">Tipo de Tarea</Label>
            <Select
              value={formData.task_type}
              onValueChange={(value: 'story' | 'mention' | 'repost') =>
                setFormData({ ...formData, task_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="story">Historia</SelectItem>
                <SelectItem value="mention">Mención</SelectItem>
                <SelectItem value="repost">Repost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="hashtag">Hashtag Personalizado (opcional)</Label>
            <Input
              id="hashtag"
              placeholder="Dejar vacío para usar hashtag del evento"
              value={formData.expected_hashtag}
              onChange={(e) => setFormData({ ...formData, expected_hashtag: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!formData.embassador_id || !formData.event_id}>
              Crear Tarea
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
