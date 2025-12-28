import { supabase } from '@/integrations/supabase/client';
import { BaseService, executeQuery } from './base';
import { handleError } from '@/lib/errors';
import type {
  SocialMention,
  SocialMentionInsert,
  SocialMentionUpdate,
  SocialMentionState,
} from '@/types/entities';

/**
 * Social Mentions service
 */
class MentionService extends BaseService<
  SocialMention,
  SocialMentionInsert,
  SocialMentionUpdate,
  'social_mentions'
> {
  constructor() {
    super('social_mentions', 'MentionService');
  }

  /**
   * Get mentions with filters
   */
  async getFiltered(
    organizationId: string,
    filters: {
      state?: SocialMentionState;
      fiestaId?: string;
      ambassadorId?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<SocialMention[]> {
    const {
      state,
      fiestaId,
      ambassadorId,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = filters;

    let query = supabase
      .from('social_mentions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('mentioned_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (state) {
      query = query.eq('state', state);
    }

    if (fiestaId) {
      query = query.eq('matched_fiesta_id', fiestaId);
    }

    if (ambassadorId) {
      query = query.eq('matched_ambassador_id', ambassadorId);
    }

    if (startDate) {
      query = query.gte('mentioned_at', startDate);
    }

    if (endDate) {
      query = query.lte('mentioned_at', endDate);
    }

    const result = await executeQuery(query, 'MentionService.getFiltered');
    return (result as SocialMention[]) ?? [];
  }

  /**
   * Get unprocessed mentions
   */
  async getUnprocessed(organizationId: string): Promise<SocialMention[]> {
    const result = await executeQuery(
      supabase
        .from('social_mentions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('processed', false)
        .order('mentioned_at', { ascending: true }),
      'MentionService.getUnprocessed'
    );

    return (result as SocialMention[]) ?? [];
  }

  /**
   * Get mentions by Instagram user
   */
  async getByInstagramUser(
    organizationId: string,
    instagramUsername: string,
    limit = 20
  ): Promise<SocialMention[]> {
    const result = await executeQuery(
      supabase
        .from('social_mentions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('instagram_username', instagramUsername)
        .order('mentioned_at', { ascending: false })
        .limit(limit),
      'MentionService.getByInstagramUser'
    );

    return (result as SocialMention[]) ?? [];
  }

  /**
   * Get mentions by story ID
   */
  async getByStoryId(storyId: string): Promise<SocialMention | null> {
    return executeQuery(
      supabase
        .from('social_mentions')
        .select('*')
        .eq('instagram_story_id', storyId)
        .maybeSingle(),
      'MentionService.getByStoryId'
    );
  }

  /**
   * Update mention state
   */
  async updateState(
    mentionId: string,
    state: SocialMentionState
  ): Promise<boolean> {
    const result = await executeQuery(
      supabase
        .from('social_mentions')
        .update({
          state,
          processed: state === 'completed',
          processed_at: state === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', mentionId)
        .select()
        .single(),
      'MentionService.updateState'
    );

    return result !== null;
  }

  /**
   * Match mention to ambassador
   */
  async matchToAmbassador(
    mentionId: string,
    ambassadorId: string
  ): Promise<boolean> {
    const result = await executeQuery(
      supabase
        .from('social_mentions')
        .update({ matched_ambassador_id: ambassadorId })
        .eq('id', mentionId)
        .select()
        .single(),
      'MentionService.matchToAmbassador'
    );

    return result !== null;
  }

  /**
   * Match mention to fiesta
   */
  async matchToFiesta(
    mentionId: string,
    fiestaId: string
  ): Promise<boolean> {
    const result = await executeQuery(
      supabase
        .from('social_mentions')
        .update({ matched_fiesta_id: fiestaId })
        .eq('id', mentionId)
        .select()
        .single(),
      'MentionService.matchToFiesta'
    );

    return result !== null;
  }

  /**
   * Update reach count
   */
  async updateReachCount(
    mentionId: string,
    reachCount: number
  ): Promise<boolean> {
    const result = await executeQuery(
      supabase
        .from('social_mentions')
        .update({
          reach_count: reachCount,
          last_check_at: new Date().toISOString(),
        })
        .eq('id', mentionId)
        .select()
        .single(),
      'MentionService.updateReachCount'
    );

    return result !== null;
  }

  /**
   * Increment checks count
   */
  async incrementChecksCount(mentionId: string): Promise<boolean> {
    const mention = await this.getById(mentionId);
    if (!mention) return false;

    const result = await executeQuery(
      supabase
        .from('social_mentions')
        .update({
          checks_count: (mention.checks_count ?? 0) + 1,
          last_check_at: new Date().toISOString(),
        })
        .eq('id', mentionId)
        .select()
        .single(),
      'MentionService.incrementChecksCount'
    );

    return result !== null;
  }

  /**
   * Get expired mentions
   */
  async getExpired(organizationId: string): Promise<SocialMention[]> {
    const now = new Date().toISOString();

    const result = await executeQuery(
      supabase
        .from('social_mentions')
        .select('*')
        .eq('organization_id', organizationId)
        .lt('expires_at', now)
        .eq('state', 'new'),
      'MentionService.getExpired'
    );

    return (result as SocialMention[]) ?? [];
  }

  /**
   * Get total reach for organization
   */
  async getTotalReach(
    organizationId: string,
    filters: {
      fiestaId?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<number> {
    const { fiestaId, startDate, endDate } = filters;

    let query = supabase
      .from('social_mentions')
      .select('reach_count')
      .eq('organization_id', organizationId)
      .not('reach_count', 'is', null);

    if (fiestaId) {
      query = query.eq('matched_fiesta_id', fiestaId);
    }

    if (startDate) {
      query = query.gte('mentioned_at', startDate);
    }

    if (endDate) {
      query = query.lte('mentioned_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      handleError('MentionService.getTotalReach', error);
      return 0;
    }

    return data?.reduce((sum, m) => sum + (m.reach_count ?? 0), 0) ?? 0;
  }

  /**
   * Get mention stats
   */
  async getStats(
    organizationId: string,
    filters: {
      fiestaId?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{
    total: number;
    new: number;
    completed: number;
    expired: number;
    totalReach: number;
  }> {
    const { fiestaId, startDate, endDate } = filters;

    let baseQuery = supabase
      .from('social_mentions')
      .select('state, reach_count')
      .eq('organization_id', organizationId);

    if (fiestaId) {
      baseQuery = baseQuery.eq('matched_fiesta_id', fiestaId);
    }

    if (startDate) {
      baseQuery = baseQuery.gte('mentioned_at', startDate);
    }

    if (endDate) {
      baseQuery = baseQuery.lte('mentioned_at', endDate);
    }

    const { data, error } = await baseQuery;

    if (error) {
      handleError('MentionService.getStats', error);
      return { total: 0, new: 0, completed: 0, expired: 0, totalReach: 0 };
    }

    const mentions = data ?? [];

    return {
      total: mentions.length,
      new: mentions.filter((m) => m.state === 'new').length,
      completed: mentions.filter((m) => m.state === 'completed').length,
      expired: mentions.filter((m) =>
        m.state === 'expired_unknown' || m.state === 'flagged_early_delete'
      ).length,
      totalReach: mentions.reduce((sum, m) => sum + (m.reach_count ?? 0), 0),
    };
  }

  /**
   * Subscribe to new mentions (returns unsubscribe function)
   */
  subscribeToMentions(
    organizationId: string,
    callback: (mention: SocialMention) => void
  ): () => void {
    const channel = supabase
      .channel(`mentions:${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'social_mentions',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          callback(payload.new as SocialMention);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

/**
 * Singleton instance
 */
export const mentionService = new MentionService();
