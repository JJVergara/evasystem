import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Eye, UserPlus, Upload, Download, Edit, Trash2, Clock } from 'lucide-react';
import { AmbassadorMetricsCards } from './AmbassadorMetricsCards';
import { AmbassadorPerformanceChart } from './AmbassadorPerformanceChart';
import { AmbassadorActivityTimeline } from './AmbassadorActivityTimeline';
import { AmbassadorRequestsTab } from './AmbassadorRequestsTab';
import { useAmbassadorMetrics } from '@/hooks/useAmbassadorMetrics';
import { useAmbassadorRequests } from '@/hooks/useAmbassadorRequests';
import AddAmbassadorModal from './AddAmbassadorModal';
import { EditAmbassadorModal } from './EditAmbassadorModal';
import { DeleteAmbassadorModal } from './DeleteAmbassadorModal';
import { InstagramProfileLink } from './InstagramProfileLink';

interface Ambassador {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  instagram_user: string;
  organization_id: string;
  status: string;
  global_points: number;
  global_category: string;
  performance_status: string;
  events_participated: number;
  completed_tasks: number;
  follower_count: number;
  instagram_access_token?: string;
  last_instagram_sync?: string;
  rut?: string;
  date_of_birth?: string | null;
  profile_picture_url?: string | null;
}

interface EnhancedAmbassadorDashboardProps {
  ambassadors: Ambassador[];
  onRefresh: () => void;
}

export function EnhancedAmbassadorDashboard({
  ambassadors,
  onRefresh,
}: EnhancedAmbassadorDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAmbassadorId, setSelectedAmbassadorId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAmbassador, setEditingAmbassador] = useState<Ambassador | null>(null);
  const [deletingAmbassador, setDeletingAmbassador] = useState<Ambassador | null>(null);

  const { metrics, loading: metricsLoading } = useAmbassadorMetrics(
    selectedAmbassadorId || undefined
  );
  const { getPendingCount } = useAmbassadorRequests();

  const pendingRequestsCount = getPendingCount();

  const filteredAmbassadors = ambassadors.filter((ambassador) => {
    const searchText =
      `${ambassador.first_name} ${ambassador.last_name} ${ambassador.email || ''} ${ambassador.instagram_user}`.toLowerCase();
    return searchText.includes(searchTerm.toLowerCase());
  });

  const getCategoryBadge = (category: string) => {
    const styles = {
      bronze: 'bg-amber-100 text-amber-800',
      silver: 'bg-gray-100 text-gray-800',
      gold: 'bg-yellow-100 text-yellow-800',
      diamond: 'bg-purple-100 text-purple-800',
    };
    return styles[category as keyof typeof styles] || styles.bronze;
  };

  const getPerformanceBadge = (status: string) => {
    const styles = {
      cumple: 'bg-green-100 text-green-800',
      advertencia: 'bg-yellow-100 text-yellow-800',
      no_cumple: 'bg-red-100 text-red-800',
      exclusivo: 'bg-purple-100 text-purple-800',
    };
    return styles[status as keyof typeof styles] || styles.cumple;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard de Embajadores</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Agregar Embajador
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="list">Embajadores</TabsTrigger>
          <TabsTrigger value="requests" className="relative">
            <Clock className="h-4 w-4 mr-1" />
            Solicitudes
            {pendingRequestsCount > 0 && (
              <Badge variant="destructive" className="ml-1 px-1 min-w-[1.2rem] h-5 text-xs">
                {pendingRequestsCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar embajadores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Embajador</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Puntos</TableHead>
                    <TableHead>Eventos</TableHead>
                    <TableHead>Tareas</TableHead>
                    <TableHead>Seguidores</TableHead>
                    <TableHead>Perfil Instagram</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAmbassadors.map((ambassador) => (
                    <TableRow key={ambassador.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback>
                              {ambassador.first_name[0]}
                              {ambassador.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {ambassador.first_name} {ambassador.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              @{ambassador.instagram_user}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryBadge(ambassador.global_category)}>
                          {ambassador.global_category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPerformanceBadge(ambassador.performance_status)}>
                          {ambassador.performance_status === 'cumple'
                            ? 'Cumple'
                            : ambassador.performance_status === 'advertencia'
                              ? 'Advertencia'
                              : ambassador.performance_status === 'no_cumple'
                                ? 'No Cumple'
                                : 'Exclusivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{ambassador.global_points}</span>
                      </TableCell>
                      <TableCell>{ambassador.events_participated}</TableCell>
                      <TableCell>{ambassador.completed_tasks}</TableCell>
                      <TableCell>{ambassador.follower_count.toLocaleString()}</TableCell>
                      <TableCell>
                        <InstagramProfileLink
                          username={ambassador.instagram_user}
                          followerCount={ambassador.follower_count}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAmbassadorId(ambassador.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingAmbassador(ambassador)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingAmbassador(ambassador)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <AmbassadorRequestsTab />
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!selectedAmbassadorId}
        onOpenChange={(open) => !open && setSelectedAmbassadorId(null)}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dashboard del Embajador</DialogTitle>
          </DialogHeader>

          {metricsLoading ? (
            <div className="flex items-center justify-center py-8">Cargando métricas...</div>
          ) : metrics ? (
            <div className="space-y-6">
              <AmbassadorMetricsCards metrics={metrics} />
              <AmbassadorPerformanceChart monthlyData={metrics.monthly_performance} />
              <AmbassadorActivityTimeline activities={metrics.recent_activities} />
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No se pudieron cargar las métricas
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AddAmbassadorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAmbassadorAdded={onRefresh}
      />

      <EditAmbassadorModal
        isOpen={!!editingAmbassador}
        onClose={() => setEditingAmbassador(null)}
        ambassador={editingAmbassador}
        onAmbassadorUpdated={onRefresh}
      />

      <DeleteAmbassadorModal
        isOpen={!!deletingAmbassador}
        onClose={() => setDeletingAmbassador(null)}
        ambassador={deletingAmbassador}
        onAmbassadorDeleted={onRefresh}
      />
    </div>
  );
}
