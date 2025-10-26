
import { useState, useEffect } from "react";
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
  raw_data?: any;
}

interface MentionStats {
  total: number;
  reach: number;
  engagement: number;
  unique_hashtags: number;
  unassigned: number;
}

export function useMentionsManagement() {
  const { organization } = useCurrentOrganization();
  const [mentions, setMentions] = useState<SocialMention[]>([]);
  const [stats, setStats] = useState<MentionStats>({
    total: 0,
    reach: 0,
    engagement: 0,
    unique_hashtags: 0,
    unassigned: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organization) {
      fetchMentions();
    }
  }, [organization]);

  // Setup realtime subscriptions for live updates
  useRealtimeSocialMentions({
    onNewMention: () => {
      // Refresh mentions when new one arrives
      fetchMentions();
    },
    onMentionUpdated: () => {
      // Refresh mentions when one is updated
      fetchMentions();
    }
  });

  const fetchMentions = async () => {
    if (!organization) return;

    try {
      setLoading(true);
      setError(null);

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
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching social mentions:', fetchError);
        setError('Error al cargar menciones');
        return;
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
        raw_data: mention.raw_data
      }));

      setMentions(mentionsData);

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

      setStats({
        total: mentionsData.length,
        reach: totalReach,
        engagement: Math.round(avgEngagement * 100) / 100,
        unique_hashtags: uniqueHashtags,
        unassigned: unassignedCount
      });

    } catch (err) {
      console.error('Error fetching mentions:', err);
      setError('Error inesperado al cargar menciones');
    } finally {
      setLoading(false);
    }
  };

  const filterMentions = (searchTerm: string, typeFilter: string, statusFilter: string) => {
    return mentions.filter(mention => {
      const matchesSearch = mention.instagram_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mention.content.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || mention.mention_type === typeFilter;
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'assigned' && mention.matched_ambassador_id) ||
        (statusFilter === 'unassigned' && !mention.matched_ambassador_id);
      
      return matchesSearch && matchesType && matchesStatus;
    });
  };

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
      fetchMentions(); // Refresh data
    } catch (error) {
      console.error('Error assigning mention:', error);
      toast.error('Error al asignar mención');
    }
  };

  return {
    mentions,
    stats,
    loading,
    error,
    filterMentions,
    assignToAmbassador,
    refreshMentions: fetchMentions
  };
}
