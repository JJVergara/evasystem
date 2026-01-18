import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { StoryMention } from '@/types/storyMentions';
import { EMOJIS } from '@/constants';

interface StoryMentionsListProps {
  mentions: StoryMention[];
  loading: boolean;
  onViewDetails: (mention: StoryMention) => void;
  onMarkAsProcessed: (mentionId: string) => void;
  onFlagAsEarlyDelete: (mentionId: string) => void;
  onReply: (mention: StoryMention) => void;
  onCreateLead: (mention: StoryMention) => void;
}

export function StoryMentionsList({
  mentions,
  loading,
  onViewDetails,
  onMarkAsProcessed,
  onFlagAsEarlyDelete,
  onReply,
  onCreateLead,
}: StoryMentionsListProps) {
  const handleViewStory = (mention: StoryMention) => {
    if (mention.story_url) {
      window.open(mention.story_url, '_blank', 'noopener,noreferrer');
    } else if (mention.deep_link) {
      window.open(mention.deep_link, '_blank', 'noopener,noreferrer');
    } else {
      window.open(
        `https://instagram.com/${mention.instagram_username}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  const getStateBadge = (
    state: StoryMention['state'],
    expiresAt?: string,
    checksCount?: number
  ) => {
    const now = new Date();
    const expires = expiresAt ? new Date(expiresAt) : null;
    const isExpired = expires && now > expires;
    const checksInfo = checksCount ? ` (${checksCount}/3)` : '';

    switch (state) {
      case 'new':
        return (
          <Badge variant={isExpired ? 'secondary' : 'default'} className="flex items-center gap-1">
            {isExpired ? <span>{EMOJIS.status.success}</span> : null}
            {isExpired ? `Expirada${checksInfo}` : `Nueva${checksInfo}`}
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <span>{EMOJIS.status.success}</span>
            Completada (24h)
            {checksCount && <span className="ml-1 text-xs">({checksCount} verificaciones)</span>}
          </Badge>
        );
      case 'flagged_early_delete':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <span>{EMOJIS.status.warning}</span>
            Borrada temprano
            {checksCount && <span className="ml-1 text-xs">({checksCount} verificaciones)</span>}
          </Badge>
        );
      case 'expired_unknown':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <span>{EMOJIS.status.warning}</span>
            No verificable
            {checksCount && <span className="ml-1 text-xs">({checksCount} intentos)</span>}
          </Badge>
        );
      default:
        return <Badge variant="outline">{state}</Badge>;
    }
  };

  const getTimeRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null;

    const now = new Date();
    const expires = new Date(expiresAt);

    if (now > expires) {
      return 'Expirada';
    }

    const diffMs = expires.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m restantes`;
    } else {
      return `${diffMinutes}m restantes`;
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-5 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (mentions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <span className="text-5xl block mx-auto mb-4 opacity-50">
              {EMOJIS.entities.message}
            </span>
            <p className="text-lg font-medium mb-2">No hay menciones de historias</p>
            <p>Las menciones aparecerán aquí cuando alguien interactúe con tus historias</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {mentions.map((mention) => {
        const isNew = mention.state === 'new';
        const timeRemaining = getTimeRemaining(mention.expires_at);

        return (
          <Card key={mention.id} className={`${isNew ? 'border-primary/50 bg-primary/5' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2 min-w-0">
                  <img src="/instagram-icon.webp" alt="Instagram" className="w-5 h-5 shrink-0" />
                  <span className="truncate">@{mention.instagram_username}</span>
                  {mention.ambassador_name && (
                    <Badge variant="secondary" className="shrink-0">
                      {mention.ambassador_name}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  {getStateBadge(mention.state, mention.expires_at, mention.checks_count)}
                  <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(mention.mentioned_at), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                </div>
              </div>
              {timeRemaining && mention.state === 'new' && (
                <div className="text-sm text-muted-foreground mt-1">
                  {EMOJIS.entities.timer} {timeRemaining}
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-foreground mb-4 line-clamp-2 text-sm sm:text-base">
                {mention.content}
              </p>

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(mention)}
                  className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <span className="shrink-0">{EMOJIS.actions.view}</span>
                  <span className="hidden sm:inline">Ver detalles</span>
                  <span className="sm:hidden">Detalles</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReply(mention)}
                  className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <span className="shrink-0">{EMOJIS.entities.message}</span>
                  <span>Responder</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewStory(mention)}
                  className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                  title={
                    mention.story_url
                      ? 'Abrir enlace directo a la historia'
                      : mention.deep_link
                        ? 'Abrir enlace de respaldo'
                        : 'Ver perfil de Instagram'
                  }
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">
                    {mention.story_url
                      ? 'Ver historia'
                      : mention.deep_link
                        ? 'Ver historia (respaldo)'
                        : 'Ver perfil'}
                  </span>
                  <span className="sm:hidden">Historia</span>
                </Button>

                {!mention.ambassador_name && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCreateLead(mention)}
                    className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                  >
                    <span className="shrink-0">{EMOJIS.entities.user}</span>
                    <span className="hidden sm:inline">Crear lead</span>
                    <span className="sm:hidden">Lead</span>
                  </Button>
                )}

                {isNew && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onMarkAsProcessed(mention.id)}
                      className="text-xs sm:text-sm"
                    >
                      <span className="hidden sm:inline">Marcar como procesada</span>
                      <span className="sm:hidden">Procesada</span>
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onFlagAsEarlyDelete(mention.id)}
                      className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm col-span-2 sm:col-span-1"
                    >
                      <span className="shrink-0">{EMOJIS.status.warning}</span>
                      <span className="hidden sm:inline">Borrada antes de 24h</span>
                      <span className="sm:hidden">Borrada temprano</span>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
