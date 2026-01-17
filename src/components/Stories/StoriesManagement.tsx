import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskStatusBadge } from './TaskStatusBadge';
import { EMOJIS } from '@/constants';
import { TaskStatsCards } from './TaskStatsCards';
import { useFiestas } from '@/hooks/useFiestas';
import { useTasksManagement } from '@/hooks/useTasksManagement';
import { useStoriesData } from '@/hooks/useStoriesData';
import { CreateTaskModal } from './CreateTaskModal';
import { toast } from 'sonner';
import { PageHeader } from '@/components/Layout/PageHeader';
import { GlassPanel } from '@/components/Layout/GlassPanel';

export default function StoriesManagement() {
  const { selectedFiesta, selectedFiestaId } = useFiestas();
  const { ambassadors, events } = useStoriesData();
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { tasks, stats, loading: tasksLoading } = useTasksManagement();

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      searchTerm === '' ||
      task.embassadors?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.embassadors?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.embassadors?.instagram_user?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const exportTasks = async () => {
    try {
      toast.success('Funcionalidad de exportación en desarrollo');
    } catch {
      toast.error('Error al exportar tareas');
    }
  };

  if (!selectedFiestaId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Historias"
          description="Gestiona y monitorea las historias de tus embajadores"
          emoji={EMOJIS.entities.story}
        />
        <GlassPanel>
          <div className="text-center text-muted-foreground py-12">
            <span className="text-3xl block mx-auto mb-2 opacity-50">{EMOJIS.status.warning}</span>
            <p>Selecciona una fiesta para gestionar historias</p>
          </div>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Historias"
        description={`Gestión de historias de ${selectedFiesta?.name || 'la fiesta'}`}
        emoji={EMOJIS.entities.story}
      >
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          <CreateTaskModal
            ambassadors={ambassadors.map((amb) => ({
              id: amb.id,
              name: `${amb.first_name} ${amb.last_name}`,
              instagram_user: amb.instagram_user,
            }))}
            events={events}
          />
          <Button variant="outline" onClick={exportTasks}>
            <span className="mr-2">{EMOJIS.actions.download}</span>
            Exportar
          </Button>
        </div>
      </PageHeader>

      <TaskStatsCards
        stats={{
          uploaded: stats.pending,
          completed: stats.completed,
          in_progress: stats.pending,
          invalid: stats.invalid,
        }}
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Filtros y Búsqueda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    {EMOJIS.actions.search}
                  </span>
                  <Input
                    placeholder="Buscar por embajador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Todos los eventos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los eventos</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="uploaded">Subida</SelectItem>
                    <SelectItem value="in_progress">En Progreso</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                    <SelectItem value="invalid">Inválida</SelectItem>
                    <SelectItem value="expired">Expirada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="space-y-4">
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="inline-flex min-w-full sm:min-w-0">
              <TabsTrigger value="all" className="flex-1 sm:flex-none">
                Todas las Tareas
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex-1 sm:flex-none">
                Pendientes
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex-1 sm:flex-none">
                Completadas
              </TabsTrigger>
              <TabsTrigger value="invalid" className="flex-1 sm:flex-none">
                Problemáticas
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Tareas</CardTitle>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <span className="text-3xl block mx-auto mb-2 opacity-50">
                      {EMOJIS.status.pending}
                    </span>
                    <p>No hay tareas que coincidan con los filtros</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                              <div className="min-w-0">
                                <h4 className="font-medium truncate">
                                  {task.embassadors
                                    ? `${task.embassadors.first_name} ${task.embassadors.last_name}`
                                    : 'Embajador no encontrado'}
                                </h4>
                                <p className="text-sm text-muted-foreground truncate">
                                  @{task.embassadors?.instagram_user || 'usuario_no_encontrado'}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {task.task_type}
                                </Badge>
                                <TaskStatusBadge status={task.status} />
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                              {task.expected_hashtag && (
                                <span className="mr-4">Hashtag: {task.expected_hashtag}</span>
                              )}
                              {task.upload_time && (
                                <span>
                                  Subida: {new Date(task.upload_time).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-2">
                            <div className="text-left sm:text-right text-sm">
                              <div className="font-medium">{task.points_earned} pts</div>
                              <div className="text-muted-foreground">
                                {task.reach_count.toLocaleString()} alcance
                              </div>
                            </div>
                            <Button variant="outline" size="sm" className="shrink-0">
                              <span>{EMOJIS.actions.view}</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <span className="text-3xl block mx-auto mb-2 opacity-50">
                    {EMOJIS.status.pending}
                  </span>
                  <p>Tareas pendientes aparecerán aquí</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed">
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <span className="text-3xl block mx-auto mb-2 opacity-50">
                    {EMOJIS.status.success}
                  </span>
                  <p>Tareas completadas aparecerán aquí</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invalid">
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <span className="text-3xl block mx-auto mb-2 opacity-50">
                    {EMOJIS.status.error}
                  </span>
                  <p>Tareas problemáticas aparecerán aquí</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
