import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrganization } from "./useCurrentOrganization";
import { useDebounce } from "./useDebounce";
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
  raw_data?: any;
}

interface MentionStats {
  total: number;
  reach: number;
  engagement: number;
  unique_hashtags: number;
  unassigned: number;
}

interface PaginatedMentions {
  mentions: SocialMention[];
  stats: MentionStats;
  count: number;
}

const MENTIONS_PER_PAGE = 50;

export function useMentionsOptimized(
  searchTerm: string = "",
  typeFilter: string = "all", 
  statusFilter: string = "all"
) {
  const { organization } = useCurrentOrganization();
  const queryClient = useQueryClient();
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['social_mentions', organization?.id, debouncedSearchTerm, typeFilter, statusFilter],
    queryFn: async (): Promise<PaginatedMentions> => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      let query = supabase
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
        `, { count: 'exact' })
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(MENTIONS_PER_PAGE);

      // Apply filters
      if (debouncedSearchTerm) {
        query = query.or(`instagram_username.ilike.%${debouncedSearchTerm}%,content.ilike.%${debouncedSearchTerm}%`);
      }
      
      if (typeFilter !== 'all') {
        query = query.eq('mention_type', typeFilter);
      }
      
      if (statusFilter === 'assigned') {
        query = query.not('matched_ambassador_id', 'is', null);
      } else if (statusFilter === 'unassigned') {
        query = query.is('matched_ambassador_id', null);
      }

      const { data: mentionsData, error: fetchError, count } = await query;

      if (fetchError) {
        console.error('Error fetching social mentions:', fetchError);
        throw new Error('Error al cargar menciones');
      }

      // Transform data
      const mentions: SocialMention[] = (mentionsData || []).map(mention => ({
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
        raw_data: mention.raw_data
      }));

      // Calculate statistics
      const totalReach = mentions.reduce((sum, m) => sum + m.reach_count, 0);
      const avgEngagement = mentions.length > 0 ? 
        mentions.reduce((sum, m) => sum + m.engagement_score, 0) / mentions.length : 0;
      const uniqueHashtags = new Set(
        mentions
          .filter(m => m.hashtag)
          .map(m => m.hashtag)
      ).size;
      const unassignedCount = mentions.filter(m => !m.matched_ambassador_id).length;

      const stats: MentionStats = {
        total: count || 0,
        reach: totalReach,
        engagement: Math.round(avgEngagement * 100) / 100,
        unique_hashtags: uniqueHashtags,
        unassigned: unassignedCount
      };

      return {
        mentions,
        stats,
        count: count || 0
      };
    },
    enabled: !!organization?.id,
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const assignToAmbassador = async (mentionId: string, ambassadorId: string) => {
    try {
      const { error } = await supabase
        .from('social_mentions')
        .update({ 
          matched_ambassador_id: ambassadorId, 
          processed: true,
          processed_at: new Date().toISOString()
        })
        .eq('id', mentionId);

      if (error) throw error;

      toast.success('Mención asignada exitosamente');
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['social_mentions', organization?.id] });
    } catch (error) {
      console.error('Error assigning mention:', error);
      toast.error('Error al asignar mención');
    }
  };

  // Memoized client-side filtering for search responsiveness
  const filteredMentions = useMemo(() => {
    if (!data?.mentions) return [];
    
    let filtered = data.mentions;
    
    // Additional client-side filtering for immediate responsiveness
    if (searchTerm && searchTerm !== debouncedSearchTerm) {
      filtered = filtered.filter(mention => 
        mention.instagram_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mention.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [data?.mentions, searchTerm, debouncedSearchTerm]);

  return {
    mentions: filteredMentions,
    stats: data?.stats || {
      total: 0,
      reach: 0,
      engagement: 0,
      unique_hashtags: 0,
      unassigned: 0
    },
    loading: isLoading,
    error: error?.message || null,
    assignToAmbassador,
    refreshMentions: refetch
  };
}