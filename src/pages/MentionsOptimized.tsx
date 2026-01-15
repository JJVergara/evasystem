import { useState } from 'react';
import { PageHeader } from '@/components/Layout/PageHeader';
import { GlassPanel } from '@/components/Layout/GlassPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Hash,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { useMentionsOptimized } from '@/hooks/useMentionsOptimized';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { Skeleton } from '@/components/ui/skeleton';

export default function MentionsOptimized() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { mentions, stats, loading, error } = useMentionsOptimized(
    searchTerm,
    typeFilter,
    statusFilter
  );

  const getMentionTypeColor = (type: string): 'default' | 'secondary' | 'outline' => {
    switch (type) {
      case 'hashtag':
        return 'default';
      case 'mention':
        return 'secondary';
      case 'story':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getMentionTypeLabel = (type: string) => {
    switch (type) {
      case 'hashtag':
        return 'Hashtag';
      case 'mention':
        return 'Mención';
      case 'story':
        return 'Historia';
      default:
        return type;
    }
  };

  const { organization } = useCurrentOrganization();

  if (loading) {
    return (
      <>
        <PageHeader
          title="Menciones"
          description="Monitorea las menciones y hashtags de tu organización"
        />
        <GlassPanel>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 bg-white/50 rounded-lg">
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>
      </>
    );
  }

  if (!organization) {
    return (
      <>
        <PageHeader
          title="Menciones"
          description="Monitorea las menciones y hashtags de tu organización"
        />
        <GlassPanel className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Organización requerida</h3>
            <p className="text-muted-foreground">
              Para ver las menciones, selecciona una organización.
            </p>
          </div>
        </GlassPanel>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="Menciones"
          description="Monitorea las menciones y hashtags de tu organización"
        />
        <GlassPanel className="text-center py-12">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </GlassPanel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Menciones"
        description={`Monitorea las menciones y hashtags de ${organization?.name}`}
      >
        <div className="flex items-center space-x-3 flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtros Avanzados
          </Button>
          <Button size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Programar Reporte
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-6">
        {/* Metrics */}
        <GlassPanel>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 bg-white/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Hash className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Menciones</p>
                  <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-success/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Alcance Total</p>
                  <p className="text-2xl font-bold">
                    {stats.reach > 1000
                      ? `${(stats.reach / 1000).toFixed(1)}K`
                      : stats.reach.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-warning/20 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Engagement</p>
                  <p className="text-2xl font-bold">{stats.engagement}%</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Hash className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sin Asignar</p>
                  <p className="text-2xl font-bold">{stats.unassigned}</p>
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* Search and Filters */}
        <GlassPanel>
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar menciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/50"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48 bg-white/50">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="hashtag">Hashtags</SelectItem>
                <SelectItem value="mention">Menciones</SelectItem>
                <SelectItem value="story">Historias</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 bg-white/50">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="assigned">Asignadas</SelectItem>
                <SelectItem value="unassigned">Sin asignar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </GlassPanel>

        {/* Mentions List - Optimized with height constraint */}
        <GlassPanel>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Menciones Recientes</h3>
            {mentions.length > 0 ? (
              <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2">
                {mentions.map((mention) => (
                  <div
                    key={mention.id}
                    className="p-4 bg-white/30 rounded-lg hover:bg-white/40 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {mention.ambassador_name
                              ? mention.ambassador_name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                              : mention.instagram_username.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium">
                            {mention.ambassador_name || `@${mention.instagram_username}`}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            @{mention.instagram_username}
                          </p>
                          {mention.fiesta_name && (
                            <p className="text-xs text-muted-foreground">{mention.fiesta_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getMentionTypeColor(mention.mention_type)}>
                          {getMentionTypeLabel(mention.mention_type)}
                        </Badge>
                        <Badge variant="outline">{mention.platform}</Badge>
                        <Badge variant={mention.processed ? 'default' : 'secondary'}>
                          {mention.processed ? 'Procesada' : 'Sin procesar'}
                        </Badge>
                        {mention.story_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={mention.story_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>

                    <p className="text-sm mb-3 bg-white/40 p-3 rounded-lg">
                      {mention.content}
                      {mention.hashtag && (
                        <span className="text-primary font-medium"> #{mention.hashtag}</span>
                      )}
                    </p>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        <span>Alcance: {mention.reach_count.toLocaleString()}</span>
                        <span>Engagement: {mention.engagement_score}%</span>
                      </div>
                      <span>{new Date(mention.created_at).toLocaleDateString('es-ES')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || typeFilter !== 'all' || statusFilter !== 'all' ? (
                  <>
                    <p className="mb-4">No se encontraron menciones con los filtros aplicados</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm('');
                        setTypeFilter('all');
                        setStatusFilter('all');
                      }}
                    >
                      Limpiar Filtros
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="mb-4">No hay menciones registradas aún</p>
                    <p className="text-sm">
                      Las menciones aparecerán cuando los embajadores completen sus tareas
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </GlassPanel>
      </div>
    </>
  );
}
