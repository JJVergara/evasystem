import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrganization } from './useCurrentOrganization';
import { toast } from 'sonner';

interface RealtimeSocialMentionsProps {
  onNewMention?: (mention: any) => void;
  onMentionUpdated?: (mention: any) => void;
  onNewAmbassadorRequest?: (request: any) => void;
}

export function useRealtimeSocialMentions({
  onNewMention,
  onMentionUpdated,
  onNewAmbassadorRequest
}: RealtimeSocialMentionsProps = {}): null {
  const { organization } = useCurrentOrganization();

  useEffect(() => {
    if (!organization) return;

    // Subscribe to social mentions changes
    const socialMentionsChannel = supabase
      .channel(`social_mentions_${organization.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'social_mentions',
          filter: `organization_id=eq.${organization.id}`
        },
        (payload) => {
          console.log('New social mention:', payload);
          
          // Show notification based on mention type
          const mentionType = payload.new.mention_type;
          const username = payload.new.instagram_username;
          
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

          if (payload.new.matched_ambassador_id) {
            toast.success(message, {
              description: 'Mención asignada a embajador'
            });
          } else {
            toast.info(message, {
              description: 'Mención sin asignar - revisar solicitudes'
            });
          }

          onNewMention?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'social_mentions',
          filter: `organization_id=eq.${organization.id}`
        },
        (payload) => {
          console.log('Social mention updated:', payload);
          
          // Show notification when mention is processed/assigned
          if (payload.new.processed && !payload.old.processed) {
            toast.success('Mención procesada', {
              description: `Asignada a embajador`
            });
          }

          onMentionUpdated?.(payload.new);
        }
      )
      .subscribe();

    // Subscribe to ambassador requests changes
    const ambassadorRequestsChannel = supabase
      .channel(`ambassador_requests_${organization.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ambassador_requests',
          filter: `organization_id=eq.${organization.id}`
        },
        (payload) => {
          console.log('New ambassador request:', payload);
          
          toast.info('🙋‍♂️ Nueva solicitud de embajador', {
            description: `@${payload.new.instagram_username} quiere ser embajador`,
            action: {
              label: 'Ver solicitudes',
              onClick: () => {
                // This could navigate to ambassador requests tab
                window.location.hash = '#ambassadors-requests';
              }
            }
          });

          onNewAmbassadorRequest?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ambassador_requests',
          filter: `organization_id=eq.${organization.id}`
        },
        (payload) => {
          console.log('Ambassador request updated:', payload);
          
          // Show notification when request is approved/rejected
          if (payload.new.status !== payload.old.status) {
            if (payload.new.status === 'approved') {
              toast.success('✅ Embajador aprobado', {
                description: `@${payload.new.instagram_username} es ahora embajador`
              });
            } else if (payload.new.status === 'rejected') {
              toast.error('❌ Solicitud rechazada', {
                description: `@${payload.new.instagram_username}`
              });
            }
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(socialMentionsChannel);
      supabase.removeChannel(ambassadorRequestsChannel);
    };
  }, [organization, onNewMention, onMentionUpdated, onNewAmbassadorRequest]);

  return null; // This hook doesn't return any value, just manages subscriptions
}