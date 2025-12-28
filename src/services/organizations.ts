import { supabase } from '@/integrations/supabase/client';
import { executeQuery, ServiceOptions } from './base';
import { handleError } from '@/lib/errors';
import type {
  Organization,
  OrganizationInsert,
  OrganizationUpdate,
  OrganizationMember,
} from '@/types/entities';
import type { OrganizationSafeInfo, UserOrganization } from '@/types/api';

/**
 * Organization service
 */
class OrganizationService {
  /**
   * Get organization by ID
   */
  async getById(id: string): Promise<Organization | null> {
    return executeQuery(
      supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single(),
      'OrganizationService.getById'
    );
  }

  /**
   * Get organization safe info (excludes sensitive data like tokens)
   */
  async getSafeInfo(organizationId: string): Promise<OrganizationSafeInfo | null> {
    const { data, error } = await supabase.rpc('get_organization_safe_info', {
      org_id: organizationId,
    });

    if (error) {
      handleError('OrganizationService.getSafeInfo', error);
      return null;
    }

    return data?.[0] ?? null;
  }

  /**
   * Get organizations for a user
   */
  async getUserOrganizations(userAuthId: string): Promise<UserOrganization[]> {
    const { data, error } = await supabase.rpc('get_user_organizations', {
      user_auth_id: userAuthId,
    });

    if (error) {
      handleError('OrganizationService.getUserOrganizations', error);
      return [];
    }

    return data ?? [];
  }

  /**
   * Create a new organization
   */
  async create(data: OrganizationInsert): Promise<Organization | null> {
    return executeQuery(
      supabase
        .from('organizations')
        .insert(data)
        .select()
        .single(),
      'OrganizationService.create',
      { showToast: true }
    );
  }

  /**
   * Update an organization
   */
  async update(
    id: string,
    data: OrganizationUpdate
  ): Promise<Organization | null> {
    return executeQuery(
      supabase
        .from('organizations')
        .update(data)
        .eq('id', id)
        .select()
        .single(),
      'OrganizationService.update',
      { showToast: true }
    );
  }

  /**
   * Update Instagram connection info
   */
  async updateInstagramConnection(
    organizationId: string,
    data: {
      instagram_username?: string;
      instagram_user_id?: string;
      instagram_business_account_id?: string;
      facebook_page_id?: string;
      meta_token?: string;
      token_expiry?: string;
    }
  ): Promise<boolean> {
    const result = await executeQuery(
      supabase
        .from('organizations')
        .update({
          ...data,
          last_instagram_sync: new Date().toISOString(),
        })
        .eq('id', organizationId)
        .select()
        .single(),
      'OrganizationService.updateInstagramConnection'
    );

    return result !== null;
  }

  /**
   * Disconnect Instagram
   */
  async disconnectInstagram(organizationId: string): Promise<boolean> {
    const result = await executeQuery(
      supabase
        .from('organizations')
        .update({
          instagram_username: null,
          instagram_user_id: null,
          instagram_business_account_id: null,
          facebook_page_id: null,
          meta_token: null,
          token_expiry: null,
          last_instagram_sync: null,
        })
        .eq('id', organizationId)
        .select()
        .single(),
      'OrganizationService.disconnectInstagram',
      { showToast: true }
    );

    return result !== null;
  }

  /**
   * Check if organization has Instagram connected
   */
  async hasInstagramConnected(organizationId: string): Promise<boolean> {
    const org = await this.getById(organizationId);
    return org?.instagram_business_account_id != null && org?.meta_token != null;
  }

  /**
   * Get organization members
   */
  async getMembers(organizationId: string): Promise<OrganizationMember[]> {
    const result = await executeQuery(
      supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId)
        .order('joined_at', { ascending: false }),
      'OrganizationService.getMembers'
    );

    return (result as OrganizationMember[]) ?? [];
  }

  /**
   * Add member to organization
   */
  async addMember(
    organizationId: string,
    userId: string,
    role: 'admin' | 'member' | 'viewer' = 'member',
    invitedBy?: string
  ): Promise<OrganizationMember | null> {
    return executeQuery(
      supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          role,
          status: 'active',
          invited_by: invitedBy,
        })
        .select()
        .single(),
      'OrganizationService.addMember',
      { showToast: true }
    );
  }

  /**
   * Remove member from organization
   */
  async removeMember(organizationId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) {
      handleError('OrganizationService.removeMember', error, { showToast: true });
      return false;
    }

    return true;
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: 'admin' | 'member' | 'viewer'
  ): Promise<boolean> {
    const result = await executeQuery(
      supabase
        .from('organization_members')
        .update({ role })
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .select()
        .single(),
      'OrganizationService.updateMemberRole',
      { showToast: true }
    );

    return result !== null;
  }

  /**
   * Check if user is member of organization
   */
  async isMember(organizationId: string, userAuthId: string): Promise<boolean> {
    const { data } = await supabase.rpc('is_organization_member', {
      org_id: organizationId,
      user_auth_id: userAuthId,
    });

    return data === true;
  }

  /**
   * Get user's role in organization
   */
  async getUserRole(
    organizationId: string,
    userId: string
  ): Promise<string | null> {
    const { data } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    return data?.role ?? null;
  }

  /**
   * Get Meta credentials status
   */
  async getMetaCredentialsStatus(
    organizationId: string
  ): Promise<{ has_credentials: boolean; updated_at: string | null } | null> {
    const { data, error } = await supabase.rpc('get_org_meta_credentials_status', {
      p_organization_id: organizationId,
    });

    if (error) {
      handleError('OrganizationService.getMetaCredentialsStatus', error);
      return null;
    }

    return data?.[0] ?? null;
  }
}

/**
 * Singleton instance
 */
export const organizationService = new OrganizationService();
