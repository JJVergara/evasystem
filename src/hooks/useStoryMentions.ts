
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrganization } from "./useCurrentOrganization";
import { useToast } from "@/hooks/use-toast";
import { StoryMention } from "@/types/storyMentions";

type StoryMentionState = 'new' | 'flagged_early_delete' | 'completed' | 'expired_unknown';

const validateState = (state: unknown): StoryMentionState => {
  const validStates: StoryMentionState[] = ['new', 'flagged_early_delete', 'completed', 'expired_unknown'];
  return validStates.includes(state as StoryMentionState) ? (state as StoryMentionState) : 'new';
};

export function useStoryMentions() {
  const [mentions, setMentions] = useState<StoryMention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organization } = useCurrentOrganization();
  const { toast } = useToast();

  const fetchStoryMentions = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch story mentions with related ambassador info
      const { data, error } = await supabase
        .from('social_mentions')
        .select(`
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
        `)
        .eq('organization_id', organization.id)
        .eq('mention_type', 'story_referral')
        .order('mentioned_at', { ascending: false });

      if (error) {
        console.error('Error fetching story mentions:', error);
        setError(error.message);
        return;
      }

      // Transform data to match our interface
      const mentionsData: StoryMention[] = (data || []).map(mention => ({
        id: mention.id,
        instagram_username: mention.instagram_username || 'unknown',
        instagram_user_id: mention.instagram_user_id || '',
        content: mention.content || '',
        created_at: mention.created_at,
        processed: mention.processed,
        ambassador_name: mention.embassadors ? 
          `${mention.embassadors.first_name} ${mention.embassadors.last_name}` : 
          undefined,
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
        inbox_link: mention.inbox_link || undefined
      }));

      setMentions(mentionsData);
    } catch (err) {
      console.error('Error in fetchStoryMentions:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const markAsProcessed = async (mentionId: string) => {
    try {
      const { error } = await supabase
        .from('social_mentions')
        .update({ 
          processed: true,
          processed_at: new Date().toISOString()
        })
        .eq('id', mentionId);

      if (error) {
        throw error;
      }

      // Update local state
      setMentions(prev => 
        prev.map(mention => 
          mention.id === mentionId 
            ? { ...mention, processed: true }
            : mention
        )
      );

      toast({
        title: "Mención actualizada",
        description: "La mención ha sido marcada como atendida"
      });
    } catch (error) {
      console.error('Error marking mention as processed:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la mención",
        variant: "destructive"
      });
      throw error;
    }
  };

  const flagAsEarlyDelete = async (mentionId: string) => {
    try {
      const { error } = await supabase
        .from('social_mentions')
        .update({ 
          state: 'flagged_early_delete',
          processed: true,
          processed_at: new Date().toISOString()
        })
        .eq('id', mentionId);

      if (error) {
        throw error;
      }

      // Update local state
      setMentions(prev => 
        prev.map(mention => 
          mention.id === mentionId 
            ? { ...mention, state: 'flagged_early_delete', processed: true }
            : mention
        )
      );

      // Create notification for early deletion
      await supabase
        .from('notifications')
        .insert({
          organization_id: organization?.id,
          type: 'story_early_delete',
          message: `Historia marcada como borrada antes de 24h`,
          target_type: 'story_mention',
          target_id: mentionId,
          priority: 'medium'
        });

      toast({
        title: "Mención marcada",
        description: "La historia ha sido marcada como borrada antes de 24h"
      });
    } catch (error) {
      console.error('Error flagging mention as early delete:', error);
      toast({
        title: "Error",
        description: "No se pudo marcar la mención",
        variant: "destructive"
      });
      throw error;
    }
  };

  const sendReply = async (mention: StoryMention, message: string) => {
    if (!organization?.id) {
      throw new Error('Organization not found');
    }

    try {
      // Call the Instagram send message edge function
      const { data, error } = await supabase.functions.invoke('instagram-send-message', {
        body: {
          recipientId: mention.instagram_user_id,
          message: message,
          organizationId: organization.id
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to send message');
      }

      // Optionally mark as processed after successful reply
      await markAsProcessed(mention.id);

      return data;
    } catch (error) {
      console.error('Error sending reply:', error);
      throw error;
    }
  };

  // Set up real-time subscription for new story mentions
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
          filter: `organization_id=eq.${organization.id}`
        },
        (payload) => {
          console.log('New story mention received:', payload);
          // Only handle story referrals
          if (payload.new.mention_type === 'story_referral') {
            fetchStoryMentions(); // Refresh the list
            toast({
              title: "Nueva mención de historia",
              description: `@${payload.new.instagram_username || 'Usuario desconocido'} mencionó tu historia`
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
          filter: `organization_id=eq.${organization.id}`
        },
        (payload) => {
          console.log('Story mention updated:', payload);
          // Only handle story referrals
          if (payload.new.mention_type === 'story_referral') {
            fetchStoryMentions(); // Refresh the list
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id, toast]);

  // Fetch mentions when organization changes
  useEffect(() => {
    fetchStoryMentions();
  }, [organization?.id]);

  return {
    mentions,
    loading,
    error,
    fetchStoryMentions,
    markAsProcessed,
    flagAsEarlyDelete,
    sendReply
  };
}
