import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrganization } from './useCurrentOrganization';
import { toast } from 'sonner';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface SocialMentionRecord {
  id: string;
  organization_id: string;
  instagram_username: string;
  mention_type: 'story' | 'comment' | 'mention' | 'hashtag';
  matched_ambassador_id: string | null;
  processed: boolean;
  [key: string]: unknown;
}

interface AmbassadorRequestRecord {
  id: string;
  organization_id: string;
  instagram_username: string;
  status: 'pending' | 'approved' | 'rejected';
  [key: string]: unknown;
}

interface RealtimeSocialMentionsProps {
  onNewMention?: (mention: SocialMentionRecord) => void;
  onMentionUpdated?: (mention: SocialMentionRecord) => void;
  onNewAmbassadorRequest?: (request: AmbassadorRequestRecord) => void;
}

export function useRealtimeSocialMentions({
  onNewMention,
  onMentionUpdated,
  onNewAmbassadorRequest,
}: RealtimeSocialMentionsProps = {}): null {
  const { organization } = useCurrentOrganization();

  useEffect(() => {
    if (!organization) return;

    const socialMentionsChannel = supabase
      .channel(`social_mentions_${organization.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'social_mentions',
          filter: `organization_id=eq.${organization.id}`,
        },
        (payload: RealtimePostgresChangesPayload<SocialMentionRecord>) => {
          const newRecord = payload.new as SocialMentionRecord;
          console.log('New social mention:', payload);

          const mentionType = newRecord.mention_type;
          const username = newRecord.instagram_username;

          let message = '';
          switch (mentionType) {
            case 'story':
              message = `📱 Nueva historia de @${username}`;
              break;
            case 'comment':
              message = `💬 Nuevo comentario de @${username}`;
              break;
            case 'mention':
              message = `🔔 Nueva mención de @${username}`;
              break;
            case 'hashtag':
              message = `#️⃣ Nuevo hashtag de @${username}`;
              break;
            default:
              message = `📣 Nueva actividad de @${username}`;
          }

          if (newRecord.matched_ambassador_id) {
            toast.success(message, {
              description: 'Mención asignada a embajador',
            });
          } else {
            toast.info(message, {
              description: 'Mención sin asignar - revisar solicitudes',
            });
          }

          onNewMention?.(newRecord);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'social_mentions',
          filter: `organization_id=eq.${organization.id}`,
        },
        (payload: RealtimePostgresChangesPayload<SocialMentionRecord>) => {
          const newRecord = payload.new as SocialMentionRecord;
          const oldRecord = payload.old as SocialMentionRecord;
          console.log('Social mention updated:', payload);

          if (newRecord.processed && !oldRecord.processed) {
            toast.success('Mención procesada', {
              description: 'Asignada a embajador',
            });
          }

          onMentionUpdated?.(newRecord);
        }
      )
      .subscribe();

    const ambassadorRequestsChannel = supabase
      .channel(`ambassador_requests_${organization.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ambassador_requests',
          filter: `organization_id=eq.${organization.id}`,
        },
        (payload: RealtimePostgresChangesPayload<AmbassadorRequestRecord>) => {
          const newRecord = payload.new as AmbassadorRequestRecord;
          console.log('New ambassador request:', payload);

          toast.info('Nueva solicitud de embajador', {
            description: `@${newRecord.instagram_username} quiere ser embajador`,
            action: {
              label: 'Ver solicitudes',
              onClick: () => {
                window.location.hash = '#ambassadors-requests';
              },
            },
          });

          onNewAmbassadorRequest?.(newRecord);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ambassador_requests',
          filter: `organization_id=eq.${organization.id}`,
        },
        (payload: RealtimePostgresChangesPayload<AmbassadorRequestRecord>) => {
          const newRecord = payload.new as AmbassadorRequestRecord;
          const oldRecord = payload.old as AmbassadorRequestRecord;
          console.log('Ambassador request updated:', payload);

          if (newRecord.status !== oldRecord.status) {
            if (newRecord.status === 'approved') {
              toast.success('Embajador aprobado', {
                description: `@${newRecord.instagram_username} es ahora embajador`,
              });
            } else if (newRecord.status === 'rejected') {
              toast.error('Solicitud rechazada', {
                description: `@${newRecord.instagram_username}`,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(socialMentionsChannel);
      supabase.removeChannel(ambassadorRequestsChannel);
    };
  }, [organization, onNewMention, onMentionUpdated, onNewAmbassadorRequest]);

  return null;
}
