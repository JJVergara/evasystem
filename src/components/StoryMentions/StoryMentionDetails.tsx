import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  MessageCircle,
  ExternalLink,
  Instagram,
  Calendar,
  User,
  Hash,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { StoryMention } from '@/types/storyMentions';

interface StoryMentionDetailsProps {
  mention: StoryMention | null;
  open: boolean;
  onClose: () => void;
  onMarkAsProcessed: (mentionId: string) => void;
  onFlagAsEarlyDelete: (mentionId: string) => void;
  onReply: (mention: StoryMention, message: string) => Promise<void>;
  onCreateLead: (mention: StoryMention) => void;
}

export function StoryMentionDetails({
  mention,
  open,
  onClose,
  onMarkAsProcessed,
  onFlagAsEarlyDelete,
  onReply,
  onCreateLead,
}: StoryMentionDetailsProps) {
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSendReply = async () => {
    if (!mention || !replyMessage.trim()) return;

    try {
      setSending(true);
      await onReply(mention, replyMessage.trim());
      setReplyMessage('');
      toast({
        title: 'Respuesta enviada',
        description: 'Tu mensaje ha sido enviado correctamente',
      });
    } catch (error) {
      toast({
        title: 'Error al enviar',
        description: 'No se pudo enviar la respuesta',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleViewStory = () => {
    if (mention?.deep_link) {
      window.open(mention.deep_link, '_blank', 'noopener,noreferrer');
    } else if (mention?.story_url) {
      window.open(mention.story_url, '_blank', 'noopener,noreferrer');
    } else if (mention?.instagram_username) {
      window.open(
        `https://instagram.com/${mention.instagram_username}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  const getStateBadge = (state: StoryMention['state']) => {
    switch (state) {
      case 'new':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Nueva
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Completada (24h)
          </Badge>
        );
      case 'flagged_early_delete':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Borrada antes de 24h
          </Badge>
        );
      case 'expired_unknown':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Estado desconocido
          </Badge>
        );
      default:
        return <Badge variant="outline">{state}</Badge>;
    }
  };

  const getTimeRemaining = () => {
    if (!mention?.expires_at) return null;

    const now = new Date();
    const expires = new Date(mention.expires_at);

    if (now > expires) {
      return 'Historia expirada';
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

  if (!mention) return null;

  const isNew = mention.state === 'new';
  const timeRemaining = getTimeRemaining();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="w-5 h-5 text-pink-600" />
            Mención de Historia - @{mention.instagram_username}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStateBadge(mention.state)}
              {mention.ambassador_name && (
                <Badge variant="outline">Embajador: {mention.ambassador_name}</Badge>
              )}
            </div>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(mention.mentioned_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
            </span>
          </div>

          {/* Time remaining */}
          {timeRemaining && isNew && (
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 text-primary">
                <Clock className="w-4 h-4" />
                <span className="font-medium">{timeRemaining}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Las historias de Instagram duran 24 horas
              </p>
            </div>
          )}

          {/* User Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">@{mention.instagram_username}</span>
            </div>
            {mention.instagram_user_id && (
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  ID: {mention.instagram_user_id}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <h3 className="font-semibold mb-2">Contenido del mensaje:</h3>
            <p className="text-muted-foreground p-3 bg-muted/30 rounded-lg">{mention.content}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleViewStory} className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              {mention.deep_link ? 'Ver historia' : 'Ver perfil'}
            </Button>

            {mention.inbox_link && (
              <Button
                variant="outline"
                onClick={() => window.open(mention.inbox_link, '_blank', 'noopener,noreferrer')}
                className="flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Abrir en Bandeja
              </Button>
            )}

            {!mention.ambassador_name && (
              <Button variant="outline" onClick={() => onCreateLead(mention)}>
                Crear lead en CRM
              </Button>
            )}

            {isNew && (
              <>
                <Button variant="secondary" onClick={() => onMarkAsProcessed(mention.id)}>
                  Marcar como procesada
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => onFlagAsEarlyDelete(mention.id)}
                  className="flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Borrada antes de 24h
                </Button>
              </>
            )}
          </div>

          <Separator />

          {/* Reply Section */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Responder por mensaje directo
            </h3>

            <Textarea
              placeholder="Escribe tu respuesta aquí..."
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSendReply} disabled={!replyMessage.trim() || sending}>
                {sending ? 'Enviando...' : 'Enviar respuesta'}
              </Button>
            </div>
          </div>

          {/* Deep link info */}
          {mention.deep_link && !mention.deep_link.includes('instagram.com') && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Nota:</strong> El enlace directo a la historia puede no funcionar en todos
                los navegadores. Si no funciona, se abrirá el perfil del usuario.
              </p>
            </div>
          )}

          {/* Raw Data (for debugging) */}
          {mention.raw_data && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Ver datos técnicos
              </summary>
              <pre className="mt-2 p-3 bg-muted/30 rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(mention.raw_data, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
