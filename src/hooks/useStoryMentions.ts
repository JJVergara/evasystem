import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrganization } from './useCurrentOrganization';
import { useToast } from '@/hooks/use-toast';
import type { StoryMention } from '@/types/storyMentions';

type StoryMentionState = 'new' | 'flagged_early_delete' | 'completed' | 'expired_unknown';

const validateState = (state: unknown): StoryMentionState => {
  const validStates: StoryMentionState[] = [
    'new',
    'flagged_early_delete',
    'completed',
    'expired_unknown',
  ];
  return validStates.includes(state as StoryMentionState) ? (state as StoryMentionState) : 'new';
};

async function fetchStoryMentionsData(organizationId: string): Promise<StoryMention[]> {
  const { data, error } = await supabase
    .from('social_mentions')
    .select(
      `
      id,
      instagram_username,
      instagram_user_id,
      content,
      created_at,
      processed,
      raw_data,
      recipient_page_id,
      external_event_id,
      story_url,
      instagram_story_id,
      mentioned_at,
      expires_at,
      state,
      deep_link,
      checks_count,
      last_check_at,
      conversation_id,
      inbox_link,
      embassadors!matched_ambassador_id (
        first_name,
        last_name
      )
    `
    )
    .eq('organization_id', organizationId)
    .eq('mention_type', 'story_referral')
    .order('mentioned_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((mention) => ({
    id: mention.id,
    instagram_username: mention.instagram_username || 'unknown',
    instagram_user_id: mention.instagram_user_id || '',
    content: mention.content || '',
    created_at: mention.created_at,
    processed: mention.processed,
    ambassador_name: mention.embassadors
      ? `${mention.embassadors.first_name} ${mention.embassadors.last_name}`
      : undefined,
    raw_data: mention.raw_data,
    recipient_page_id: mention.recipient_page_id || undefined,
    external_event_id: mention.external_event_id || undefined,
    story_url: mention.story_url || undefined,
    instagram_story_id: mention.instagram_story_id || undefined,
    mentioned_at: mention.mentioned_at,
    expires_at: mention.expires_at || undefined,
    state: validateState(mention.state),
    deep_link: mention.deep_link || undefined,
    checks_count: mention.checks_count || 0,
    last_check_at: mention.last_check_at || undefined,
    conversation_id: mention.conversation_id || undefined,
    inbox_link: mention.inbox_link || undefined,
  }));
}

export function useStoryMentions() {
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryKey = ['storyMentions', organization?.id];

  const {
    data: mentions = [],
    isLoading: mentionsLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => fetchStoryMentionsData(organization!.id),
    enabled: !!organization?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel(`story-mentions-${organization.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'social_mentions',
          filter: `organization_id=eq.${organization.id}`,
        },
        (payload) => {
          if (payload.new.mention_type === 'story_referral') {
            queryClient.invalidateQueries({ queryKey });
            toast({
              title: 'Nueva mención de historia',
              description: `@${payload.new.instagram_username || 'Usuario desconocido'} mencionó tu historia`,
            });
          }
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
        (payload) => {
          if (payload.new.mention_type === 'story_referral') {
            queryClient.invalidateQueries({ queryKey });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id, queryClient, queryKey, toast]);

  const markAsProcessed = useCallback(
    async (mentionId: string) => {
      try {
        const { error } = await supabase
          .from('social_mentions')
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
          })
          .eq('id', mentionId);

        if (error) throw error;

        queryClient.setQueryData<StoryMention[]>(queryKey, (old) =>
          old?.map((mention) =>
            mention.id === mentionId ? { ...mention, processed: true } : mention
          )
        );

        toast({
          title: 'Mención actualizada',
          description: 'La mención ha sido marcada como atendida',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'No se pudo actualizar la mención',
          variant: 'destructive',
        });
        throw error;
      }
    },
    [queryClient, queryKey, toast]
  );

  const flagAsEarlyDelete = useCallback(
    async (mentionId: string) => {
      try {
        const { error } = await supabase
          .from('social_mentions')
          .update({
            state: 'flagged_early_delete',
            processed: true,
            processed_at: new Date().toISOString(),
          })
          .eq('id', mentionId);

        if (error) throw error;

        queryClient.setQueryData<StoryMention[]>(queryKey, (old) =>
          old?.map((mention) =>
            mention.id === mentionId
              ? { ...mention, state: 'flagged_early_delete', processed: true }
              : mention
          )
        );

        await supabase.from('notifications').insert({
          organization_id: organization?.id,
          type: 'story_early_delete',
          message: `Historia marcada como borrada antes de 24h`,
          target_type: 'story_mention',
          target_id: mentionId,
          priority: 'medium',
        });

        toast({
          title: 'Mención marcada',
          description: 'La historia ha sido marcada como borrada antes de 24h',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'No se pudo marcar la mención',
          variant: 'destructive',
        });
        throw error;
      }
    },
    [organization?.id, queryClient, queryKey, toast]
  );

  const sendReply = useCallback(
    async (mention: StoryMention, message: string) => {
      if (!organization?.id) {
        throw new Error('Organization not found');
      }

      const { data, error } = await supabase.functions.invoke('instagram-send-message', {
        body: {
          recipientId: mention.instagram_user_id,
          message: message,
          organizationId: organization.id,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to send message');

      await markAsProcessed(mention.id);
      return data;
    },
    [organization?.id, markAsProcessed]
  );

  const fetchStoryMentions = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const loading = orgLoading || (!!organization?.id && mentionsLoading);

  return {
    mentions,
    loading,
    error: error ? (error as Error).message : null,
    fetchStoryMentions,
    markAsProcessed,
    flagAsEarlyDelete,
    sendReply,
  };
}
