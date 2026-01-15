import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrganization } from "./useCurrentOrganization";
import { useRealtimeSocialMentions } from "./useRealtimeSocialMentions";
import { toast } from "sonner";

interface SocialMention {
  id: string;
  instagram_username: string;
  content: string;
  mention_type: 'mention' | 'hashtag' | 'story' | 'comment';
  platform: string;
  reach_count: number;
  engagement_score: number;
  created_at: string;
  processed: boolean;
  matched_ambassador_id?: string;
  ambassador_name?: string;
  event_name?: string;
  fiesta_name?: string;
  story_url?: string;
  hashtag?: string;
  raw_data?: Record<string, unknown>;
}

interface MentionStats {
  total: number;
  reach: number;
  engagement: number;
  unique_hashtags: number;
  unassigned: number;
}

interface MentionsData {
  mentions: SocialMention[];
  stats: MentionStats;
}

async function fetchMentionsData(organizationId: string): Promise<MentionsData> {
  const { data, error: fetchError } = await supabase
    .from('social_mentions')
    .select(`
      id,
      instagram_username,
      content,
      mention_type,
      platform,
      reach_count,
      engagement_score,
      created_at,
      processed,
      matched_ambassador_id,
      story_url,
      hashtag,
      raw_data,
      embassadors:matched_ambassador_id (
        first_name,
        last_name
      ),
      fiestas:matched_fiesta_id (
        name
      ),
      events:matched_event_id (
        id
      )
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('Error fetching social mentions:', fetchError);
    throw new Error('Error al cargar menciones');
  }

  // Transform data for the component
  const mentionsData: SocialMention[] = (data || []).map(mention => ({
    id: mention.id,
    instagram_username: mention.instagram_username || 'Usuario desconocido',
    content: mention.content || '',
    mention_type: mention.mention_type as SocialMention['mention_type'],
    platform: mention.platform || 'Instagram',
    reach_count: mention.reach_count || 0,
    engagement_score: mention.engagement_score || 0,
    created_at: mention.created_at || new Date().toISOString(),
    processed: mention.processed || false,
    matched_ambassador_id: mention.matched_ambassador_id,
    ambassador_name: mention.embassadors ?
      `${mention.embassadors.first_name} ${mention.embassadors.last_name}` :
      undefined,
    fiesta_name: mention.fiestas?.name || undefined,
    story_url: mention.story_url || undefined,
    hashtag: mention.hashtag || undefined,
    raw_data: mention.raw_data as Record<string, unknown> | undefined
  }));

  // Calculate statistics
  const totalReach = mentionsData.reduce((sum, m) => sum + m.reach_count, 0);
  const avgEngagement = mentionsData.length > 0 ?
    mentionsData.reduce((sum, m) => sum + m.engagement_score, 0) / mentionsData.length : 0;
  const uniqueHashtags = new Set(
    mentionsData
      .filter(m => m.hashtag)
      .map(m => m.hashtag)
  ).size;
  const unassignedCount = mentionsData.filter(m => !m.matched_ambassador_id).length;

  return {
    mentions: mentionsData,
    stats: {
      total: mentionsData.length,
      reach: totalReach,
      engagement: Math.round(avgEngagement * 100) / 100,
      unique_hashtags: uniqueHashtags,
      unassigned: unassignedCount
    }
  };
}

export function useMentionsManagement() {
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const queryClient = useQueryClient();

  const queryKey = ['mentionsManagement', organization?.id];

  const { data, isLoading: mentionsLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchMentionsData(organization!.id),
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes cache
  });

  // Setup realtime subscriptions for live updates
  useRealtimeSocialMentions({
    onNewMention: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onMentionUpdated: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  const assignMutation = useMutation({
    mutationFn: async ({ mentionId, ambassadorId }: { mentionId: string; ambassadorId: string }) => {
      const { error } = await supabase
        .from('social_mentions')
        .update({
          matched_ambassador_id: ambassadorId,
          processed: true,
          processed_at: new Date().toISOString()
        })
        .eq('id', mentionId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Mencion asignada exitosamente');
    },
    onError: () => {
      toast.error('Error al asignar mencion');
    }
  });

  const filterMentions = useCallback((searchTerm: string, typeFilter: string, statusFilter: string) => {
    const mentions = data?.mentions || [];
    return mentions.filter(mention => {
      const matchesSearch = mention.instagram_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mention.content.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'all' || mention.mention_type === typeFilter;
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'assigned' && mention.matched_ambassador_id) ||
        (statusFilter === 'unassigned' && !mention.matched_ambassador_id);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [data?.mentions]);

  const assignToAmbassador = useCallback(async (mentionId: string, ambassadorId: string) => {
    return assignMutation.mutateAsync({ mentionId, ambassadorId });
  }, [assignMutation]);

  const refreshMentions = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const loading = orgLoading || (!!organization?.id && mentionsLoading);

  return {
    mentions: data?.mentions || [],
    stats: data?.stats || {
      total: 0,
      reach: 0,
      engagement: 0,
      unique_hashtags: 0,
      unassigned: 0
    },
    loading,
    error: error ? 'Error al cargar menciones' : null,
    filterMentions,
    assignToAmbassador,
    refreshMentions
  };
}
