import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageCircle,
  Eye,
  UserPlus,
  ExternalLink,
  Instagram,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { StoryMention } from '@/types/storyMentions';

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
    // Priority order: story_url > deep_link > profile fallback
    if (mention.story_url) {
      window.open(mention.story_url, '_blank', 'noopener,noreferrer');
    } else if (mention.deep_link) {
      window.open(mention.deep_link, '_blank', 'noopener,noreferrer');
    } else {
      // Fallback to Instagram profile
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
            {isExpired ? <CheckCircle className="w-3 h-3" /> : null}
            {isExpired ? `Expirada${checksInfo}` : `Nueva${checksInfo}`}
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Completada (24h)
            {checksCount && <span className="ml-1 text-xs">({checksCount} verificaciones)</span>}
          </Badge>
        );
      case 'flagged_early_delete':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Borrada temprano
            {checksCount && <span className="ml-1 text-xs">({checksCount} verificaciones)</span>}
          </Badge>
        );
      case 'expired_unknown':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
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
            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
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
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Instagram className="w-5 h-5 text-pink-600" />@{mention.instagram_username}
                  {mention.ambassador_name && (
                    <Badge variant="secondary" className="ml-2">
                      {mention.ambassador_name}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {getStateBadge(mention.state, mention.expires_at, mention.checks_count)}
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(mention.mentioned_at), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                </div>
              </div>
              {timeRemaining && mention.state === 'new' && (
                <div className="text-sm text-muted-foreground">⏱️ {timeRemaining}</div>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4 line-clamp-2">{mention.content}</p>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(mention)}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Ver detalles
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReply(mention)}
                  className="flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Responder
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewStory(mention)}
                  className="flex items-center gap-2"
                  title={
                    mention.story_url
                      ? 'Abrir enlace directo a la historia'
                      : mention.deep_link
                        ? 'Abrir enlace de respaldo'
                        : 'Ver perfil de Instagram'
                  }
                >
                  <ExternalLink className="w-4 h-4" />
                  {mention.story_url
                    ? 'Ver historia'
                    : mention.deep_link
                      ? 'Ver historia (respaldo)'
                      : 'Ver perfil'}
                </Button>

                {!mention.ambassador_name && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCreateLead(mention)}
                    className="flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Crear lead
                  </Button>
                )}

                {isNew && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onMarkAsProcessed(mention.id)}
                    >
                      Marcar como procesada
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onFlagAsEarlyDelete(mention.id)}
                      className="flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Borrada antes de 24h
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
