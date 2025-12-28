import { supabase } from '@/integrations/supabase/client';
import { BaseService, executeQuery, ServiceOptions } from './base';
import { handleError } from '@/lib/errors';
import type {
  Ambassador,
  AmbassadorInsert,
  AmbassadorUpdate,
  AmbassadorWithOrganization,
} from '@/types/entities';
import type { AmbassadorSafeInfo } from '@/types/api';

/**
 * Ambassador service for managing ambassador data
 */
class AmbassadorService extends BaseService<
  Ambassador,
  AmbassadorInsert,
  AmbassadorUpdate,
  'embassadors'
> {
  constructor() {
    super('embassadors', 'AmbassadorService');
  }

  /**
   * Get ambassadors with safe info (excludes sensitive data)
   */
  async getSafeInfo(organizationId: string): Promise<AmbassadorSafeInfo[]> {
    const { data, error } = await supabase.rpc('get_ambassador_safe_info', {
      org_id: organizationId,
    });

    if (error) {
      handleError('AmbassadorService.getSafeInfo', error);
      return [];
    }

    return data ?? [];
  }

  /**
   * Get ambassadors with organization relation
   */
  async getWithOrganization(
    organizationId: string,
    options: ServiceOptions = {}
  ): Promise<AmbassadorWithOrganization[]> {
    const result = await executeQuery(
      supabase
        .from('embassadors')
        .select(`
          *,
          organization:organizations(id, name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false }),
      'AmbassadorService.getWithOrganization',
      options
    );

    return (result as AmbassadorWithOrganization[]) ?? [];
  }

  /**
   * Get ambassador by Instagram username
   */
  async getByInstagramUser(
    instagramUser: string,
    organizationId: string
  ): Promise<Ambassador | null> {
    return executeQuery(
      supabase
        .from('embassadors')
        .select('*')
        .eq('instagram_user', instagramUser)
        .eq('organization_id', organizationId)
        .maybeSingle(),
      'AmbassadorService.getByInstagramUser'
    );
  }

  /**
   * Get ambassador by Instagram user ID
   */
  async getByInstagramUserId(
    instagramUserId: string,
    organizationId: string
  ): Promise<Ambassador | null> {
    return executeQuery(
      supabase
        .from('embassadors')
        .select('*')
        .eq('instagram_user_id', instagramUserId)
        .eq('organization_id', organizationId)
        .maybeSingle(),
      'AmbassadorService.getByInstagramUserId'
    );
  }

  /**
   * Update ambassador Instagram token
   */
  async updateInstagramToken(
    ambassadorId: string,
    token: string,
    expiresAt: string
  ): Promise<boolean> {
    const result = await executeQuery(
      supabase
        .from('embassadors')
        .update({
          instagram_access_token: token,
          token_expires_at: expiresAt,
          last_instagram_sync: new Date().toISOString(),
        })
        .eq('id', ambassadorId)
        .select()
        .single(),
      'AmbassadorService.updateInstagramToken'
    );

    return result !== null;
  }

  /**
   * Update ambassador stats
   */
  async updateStats(
    ambassadorId: string,
    stats: {
      completed_tasks?: number;
      failed_tasks?: number;
      events_participated?: number;
      global_points?: number;
    }
  ): Promise<boolean> {
    const result = await executeQuery(
      supabase
        .from('embassadors')
        .update(stats)
        .eq('id', ambassadorId)
        .select()
        .single(),
      'AmbassadorService.updateStats'
    );

    return result !== null;
  }

  /**
   * Search ambassadors by name or Instagram handle
   */
  async search(
    organizationId: string,
    query: string,
    limit = 10
  ): Promise<Ambassador[]> {
    const result = await executeQuery(
      supabase
        .from('embassadors')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,instagram_user.ilike.%${query}%`)
        .limit(limit),
      'AmbassadorService.search'
    );

    return (result as Ambassador[]) ?? [];
  }

  /**
   * Get active ambassadors count
   */
  async getActiveCount(organizationId: string): Promise<number> {
    const { count, error } = await supabase
      .from('embassadors')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    if (error) {
      handleError('AmbassadorService.getActiveCount', error);
      return 0;
    }

    return count ?? 0;
  }

  /**
   * Get ambassadors with expired tokens
   */
  async getWithExpiredTokens(organizationId: string): Promise<Ambassador[]> {
    const result = await executeQuery(
      supabase
        .from('embassadors')
        .select('*')
        .eq('organization_id', organizationId)
        .not('instagram_access_token', 'is', null)
        .lt('token_expires_at', new Date().toISOString()),
      'AmbassadorService.getWithExpiredTokens'
    );

    return (result as Ambassador[]) ?? [];
  }

  /**
   * Get top ambassadors by points
   */
  async getTopByPoints(
    organizationId: string,
    limit = 10
  ): Promise<Ambassador[]> {
    const result = await executeQuery(
      supabase
        .from('embassadors')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('global_points', { ascending: false, nullsFirst: false })
        .limit(limit),
      'AmbassadorService.getTopByPoints'
    );

    return (result as Ambassador[]) ?? [];
  }
}

/**
 * Singleton instance
 */
export const ambassadorService = new AmbassadorService();
