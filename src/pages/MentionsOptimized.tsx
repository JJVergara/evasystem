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
import { ExternalLink } from 'lucide-react';
import { useMentionsOptimized } from '@/hooks/useMentionsOptimized';
import { EMOJIS } from '@/constants';
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
          emoji={EMOJIS.navigation.mentions}
        />
        <GlassPanel>
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 bg-card/50 rounded-lg">
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
          emoji={EMOJIS.navigation.mentions}
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
          emoji={EMOJIS.navigation.mentions}
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
        emoji={EMOJIS.navigation.mentions}
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
            <span className="mr-2">{EMOJIS.actions.filter}</span>
            <span className="hidden sm:inline">Filtros Avanzados</span>
            <span className="sm:hidden">Filtros</span>
          </Button>
          <Button size="sm" className="flex-1 sm:flex-none">
            <span className="mr-2">{EMOJIS.entities.calendar}</span>
            <span className="hidden sm:inline">Programar Reporte</span>
            <span className="sm:hidden">Reporte</span>
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-6">
        <GlassPanel>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 bg-card/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 min-w-10 min-h-10 aspect-square bg-primary/20 rounded-full shrink-0">
                  <span className="text-xl">{EMOJIS.navigation.mentions}</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Menciones</p>
                  <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-card/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 min-w-10 min-h-10 aspect-square bg-success/20 rounded-full shrink-0">
                  <span className="text-xl">{EMOJIS.social.reach}</span>
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

            <div className="p-4 bg-card/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 min-w-10 min-h-10 aspect-square bg-warning/20 rounded-full shrink-0">
                  <span className="text-xl">{EMOJIS.entities.message}</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Engagement</p>
                  <p className="text-2xl font-bold">{stats.engagement}%</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-card/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 min-w-10 min-h-10 aspect-square bg-info/20 rounded-full shrink-0">
                  <span className="text-xl">{EMOJIS.status.pending}</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sin Asignar</p>
                  <p className="text-2xl font-bold">{stats.unassigned}</p>
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                {EMOJIS.actions.search}
              </span>
              <Input
                placeholder="Buscar menciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card/50"
              />
            </div>

            <div className="flex gap-2 sm:gap-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="flex-1 sm:w-40 md:w-48 bg-card/50">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="hashtag">Hashtags</SelectItem>
                  <SelectItem value="mention">Menciones</SelectItem>
                  <SelectItem value="story">Historias</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 sm:w-40 md:w-48 bg-card/50">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="assigned">Asignadas</SelectItem>
                  <SelectItem value="unassigned">Sin asignar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Menciones Recientes</h3>
            {mentions.length > 0 ? (
              <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2">
                {mentions.map((mention) => (
                  <div
                    key={mention.id}
                    className="p-4 bg-card/30 rounded-lg hover:bg-card/40 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0">
                          <span className="text-primary-foreground font-medium text-sm">
                            {mention.ambassador_name
                              ? mention.ambassador_name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                              : mention.instagram_username.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium truncate">
                            {mention.ambassador_name || `@${mention.instagram_username}`}
                          </h4>
                          <p className="text-sm text-muted-foreground truncate">
                            @{mention.instagram_username}
                          </p>
                          {mention.fiesta_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {mention.fiesta_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
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

                    <p className="text-sm mb-3 bg-card/40 p-3 rounded-lg">
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
