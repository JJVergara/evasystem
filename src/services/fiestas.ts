import { supabase } from '@/integrations/supabase/client';
import { BaseService, executeQuery, ServiceOptions } from './base';
import { handleError } from '@/lib/errors';
import type {
  Fiesta,
  FiestaInsert,
  FiestaUpdate,
  FiestaWithMetrics,
} from '@/types/entities';

/**
 * Fiesta (Party) service for managing fiestas/events
 */
class FiestaService extends BaseService<
  Fiesta,
  FiestaInsert,
  FiestaUpdate,
  'fiestas'
> {
  constructor() {
    super('fiestas', 'FiestaService');
  }

  /**
   * Get all fiestas with ordering options
   */
  async getAll(
    organizationId: string,
    options: ServiceOptions & { orderBy?: 'created_at' | 'event_date' | 'name' } = {}
  ): Promise<Fiesta[]> {
    const { orderBy = 'created_at', ...serviceOptions } = options;

    const result = await executeQuery(
      supabase
        .from('fiestas')
        .select('*')
        .eq('organization_id', organizationId)
        .order(orderBy, { ascending: false }),
      'FiestaService.getAll',
      serviceOptions
    );

    return (result as Fiesta[]) ?? [];
  }

  /**
   * Get active fiestas
   */
  async getActive(organizationId: string): Promise<Fiesta[]> {
    const result = await executeQuery(
      supabase
        .from('fiestas')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('event_date', { ascending: true }),
      'FiestaService.getActive'
    );

    return (result as Fiesta[]) ?? [];
  }

  /**
   * Get upcoming fiestas
   */
  async getUpcoming(organizationId: string, limit = 5): Promise<Fiesta[]> {
    const now = new Date().toISOString();

    const result = await executeQuery(
      supabase
        .from('fiestas')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('event_date', now)
        .in('status', ['scheduled', 'active'])
        .order('event_date', { ascending: true })
        .limit(limit),
      'FiestaService.getUpcoming'
    );

    return (result as Fiesta[]) ?? [];
  }

  /**
   * Get fiesta by hashtag
   */
  async getByHashtag(
    hashtag: string,
    organizationId: string
  ): Promise<Fiesta | null> {
    // Normalize hashtag (remove # if present)
    const normalizedHashtag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;

    return executeQuery(
      supabase
        .from('fiestas')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('main_hashtag', normalizedHashtag)
        .maybeSingle(),
      'FiestaService.getByHashtag'
    );
  }

  /**
   * Get fiesta with metrics
   */
  async getWithMetrics(fiestaId: string): Promise<FiestaWithMetrics | null> {
    // Get fiesta
    const fiesta = await this.getById(fiestaId);
    if (!fiesta) return null;

    // Get mention stats
    const { count: mentionCount } = await supabase
      .from('social_mentions')
      .select('*', { count: 'exact', head: true })
      .eq('matched_fiesta_id', fiestaId);

    // Get reach stats
    const { data: reachData } = await supabase
      .from('social_mentions')
      .select('reach_count')
      .eq('matched_fiesta_id', fiestaId)
      .not('reach_count', 'is', null);

    const totalReach = reachData?.reduce((sum, m) => sum + (m.reach_count ?? 0), 0) ?? 0;

    // Get unique ambassadors
    const { data: ambassadorData } = await supabase
      .from('social_mentions')
      .select('matched_ambassador_id')
      .eq('matched_fiesta_id', fiestaId)
      .not('matched_ambassador_id', 'is', null);

    const uniqueAmbassadors = new Set(
      ambassadorData?.map((m) => m.matched_ambassador_id) ?? []
    );

    return {
      ...fiesta,
      total_mentions: mentionCount ?? 0,
      total_reach: totalReach,
      ambassador_count: uniqueAmbassadors.size,
    };
  }

  /**
   * Update fiesta status
   */
  async updateStatus(
    fiestaId: string,
    status: 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled'
  ): Promise<boolean> {
    const result = await executeQuery(
      supabase
        .from('fiestas')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fiestaId)
        .select()
        .single(),
      'FiestaService.updateStatus',
      { showToast: true }
    );

    return result !== null;
  }

  /**
   * Add secondary hashtag
   */
  async addSecondaryHashtag(
    fiestaId: string,
    hashtag: string
  ): Promise<boolean> {
    const fiesta = await this.getById(fiestaId);
    if (!fiesta) return false;

    const normalizedHashtag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
    const currentHashtags = fiesta.secondary_hashtags ?? [];

    if (currentHashtags.includes(normalizedHashtag)) {
      return true; // Already exists
    }

    const result = await executeQuery(
      supabase
        .from('fiestas')
        .update({
          secondary_hashtags: [...currentHashtags, normalizedHashtag],
          updated_at: new Date().toISOString(),
        })
        .eq('id', fiestaId)
        .select()
        .single(),
      'FiestaService.addSecondaryHashtag'
    );

    return result !== null;
  }

  /**
   * Remove secondary hashtag
   */
  async removeSecondaryHashtag(
    fiestaId: string,
    hashtag: string
  ): Promise<boolean> {
    const fiesta = await this.getById(fiestaId);
    if (!fiesta) return false;

    const normalizedHashtag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
    const currentHashtags = fiesta.secondary_hashtags ?? [];

    const result = await executeQuery(
      supabase
        .from('fiestas')
        .update({
          secondary_hashtags: currentHashtags.filter((h) => h !== normalizedHashtag),
          updated_at: new Date().toISOString(),
        })
        .eq('id', fiestaId)
        .select()
        .single(),
      'FiestaService.removeSecondaryHashtag'
    );

    return result !== null;
  }

  /**
   * Search fiestas by name or hashtag
   */
  async search(
    organizationId: string,
    query: string,
    limit = 10
  ): Promise<Fiesta[]> {
    const result = await executeQuery(
      supabase
        .from('fiestas')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`name.ilike.%${query}%,main_hashtag.ilike.%${query}%,description.ilike.%${query}%`)
        .order('event_date', { ascending: false })
        .limit(limit),
      'FiestaService.search'
    );

    return (result as Fiesta[]) ?? [];
  }

  /**
   * Get fiestas by date range
   */
  async getByDateRange(
    organizationId: string,
    startDate: string,
    endDate: string
  ): Promise<Fiesta[]> {
    const result = await executeQuery(
      supabase
        .from('fiestas')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('event_date', { ascending: true }),
      'FiestaService.getByDateRange'
    );

    return (result as Fiesta[]) ?? [];
  }

  /**
   * Duplicate a fiesta
   */
  async duplicate(fiestaId: string, newName?: string): Promise<Fiesta | null> {
    const fiesta = await this.getById(fiestaId);
    if (!fiesta) return null;

    const { id, created_at, updated_at, ...fiestaData } = fiesta;

    return this.create({
      ...fiestaData,
      name: newName ?? `${fiesta.name} (copia)`,
      status: 'draft',
    } as FiestaInsert);
  }
}

/**
 * Singleton instance
 */
export const fiestaService = new FiestaService();
