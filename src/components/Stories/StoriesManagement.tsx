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
import {
  Plus,
  Filter,
  Download,
  Search,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskFilters } from './TaskFilters';
import { TaskStatsCards } from './TaskStatsCards';
import { useFiestas } from '@/hooks/useFiestas';
import { useTasksManagement } from '@/hooks/useTasksManagement';
import { useStoriesData } from '@/hooks/useStoriesData';
import { FiestaSelector } from '@/components/Fiestas/FiestaSelector';
import { CreateTaskModal } from './CreateTaskModal';
import { toast } from 'sonner';
import { PageHeader } from '@/components/Layout/PageHeader';
import { GlassPanel } from '@/components/Layout/GlassPanel';

export default function StoriesManagement() {
  const { selectedFiesta, selectedFiestaId } = useFiestas();
  const { ambassadors, events, loading } = useStoriesData();
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const {
    tasks,
    stats,
    loading: tasksLoading,
    refreshTasks,
    updateTaskStatus,
    deleteTask,
  } = useTasksManagement();

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
    } catch (error) {
      toast.error('Error al exportar tareas');
    }
  };

  if (!selectedFiestaId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Historias"
          description="Gestiona y monitorea las historias de tus embajadores"
        />
        <GlassPanel>
          <div className="text-center text-muted-foreground py-12">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
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
      >
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Tarea
          </Button>
          <Button variant="outline" onClick={exportTasks}>
            <Download className="h-4 w-4 mr-2" />
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
            <div className="flex items-center space-x-4 flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar por embajador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="w-[200px]">
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
                <SelectTrigger className="w-[150px]">
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
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Todas las Tareas</TabsTrigger>
            <TabsTrigger value="pending">Pendientes</TabsTrigger>
            <TabsTrigger value="completed">Completadas</TabsTrigger>
            <TabsTrigger value="invalid">Problemáticas</TabsTrigger>
          </TabsList>

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
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No hay tareas que coincidan con los filtros</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div>
                                <h4 className="font-medium">
                                  {task.embassadors
                                    ? `${task.embassadors.first_name} ${task.embassadors.last_name}`
                                    : 'Embajador no encontrado'}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  @{task.embassadors?.instagram_user || 'usuario_no_encontrado'}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {task.task_type}
                              </Badge>
                              <TaskStatusBadge status={task.status} />
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
                          <div className="flex items-center space-x-2">
                            <div className="text-right text-sm">
                              <div className="font-medium">{task.points_earned} pts</div>
                              <div className="text-muted-foreground">
                                {task.reach_count.toLocaleString()} alcance
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
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
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Tareas pendientes aparecerán aquí</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed">
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Tareas completadas aparecerán aquí</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invalid">
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Tareas problemáticas aparecerán aquí</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CreateTaskModal
        ambassadors={ambassadors.map((amb) => ({
          id: amb.id,
          name: `${amb.first_name} ${amb.last_name}`,
          instagram_user: amb.instagram_user,
        }))}
        events={events}
      />
    </div>
  );
}
