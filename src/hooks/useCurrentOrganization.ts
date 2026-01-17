import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface OrganizationMembership {
  organization_id: string;
  role: string;
  is_owner: boolean;
  organization: {
    id: string;
    name: string;
    description?: string;
    timezone: string;
    logo_url?: string;
    plan_type: string;
    instagram_username?: string;
    instagram_connected: boolean;
    last_instagram_sync?: string;
    created_at: string;
    facebook_page_id?: string;
    instagram_business_account_id?: string;
    instagram_user_id?: string;
  };
}

async function fetchOrganizationsData(userId: string): Promise<{
  currentOrganization: OrganizationMembership | null;
  userOrganizations: OrganizationMembership[];
}> {
  const { data: userOrgs, error: orgsError } = await supabase.rpc('get_user_organizations', {
    user_auth_id: userId,
  });

  if (orgsError) {
    throw orgsError;
  }

  if (!userOrgs || userOrgs.length === 0) {
    const lockKey = `creating_org_${userId}`;
    const existingLock = localStorage.getItem(lockKey);

    if (existingLock) {
      const lockTime = parseInt(existingLock);
      const now = Date.now();
      if (now - lockTime < 10000) {
        return { currentOrganization: null, userOrganizations: [] };
      }
    }

    localStorage.setItem(lockKey, Date.now().toString());

    try {
      const { data: userProfile } = await supabase
        .from('users')
        .select('id, name, email, organization_id')
        .eq('auth_user_id', userId)
        .single();

      if (userProfile?.organization_id) {
        localStorage.removeItem(lockKey);
        const { data: retryOrgs } = await supabase.rpc('get_user_organizations', {
          user_auth_id: userId,
        });
        if (retryOrgs && retryOrgs.length > 0) {
          const membership = retryOrgs[0];
          const { data: orgDetails } = await supabase.rpc('get_organization_safe_info', {
            org_id: membership.organization_id,
          });

          if (orgDetails && orgDetails.length > 0) {
            const org = { ...membership, organization: orgDetails[0] };
            return { currentOrganization: org, userOrganizations: [org] };
          }
        }
        return { currentOrganization: null, userOrganizations: [] };
      }

      const userName = userProfile?.name || userProfile?.email || 'Usuario';

      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        .insert({
          name: 'Mi Organización',
          description: `Organización de ${userName}`,
          created_by: userId,
          timezone: 'America/Santiago',
          plan_type: 'free',
        })
        .select()
        .single();

      if (createError) {
        localStorage.removeItem(lockKey);
        throw createError;
      }

      const { data: refreshedOrgs } = await supabase.rpc('get_user_organizations', {
        user_auth_id: userId,
      });

      if (refreshedOrgs && refreshedOrgs.length > 0) {
        const membership = refreshedOrgs[0];
        const { data: orgDetails } = await supabase.rpc('get_organization_safe_info', {
          org_id: membership.organization_id,
        });

        if (orgDetails && orgDetails.length > 0) {
          localStorage.removeItem(lockKey);
          toast.success('¡Organización creada exitosamente!');
          const org = { ...membership, organization: orgDetails[0] };
          return { currentOrganization: org, userOrganizations: [org] };
        }
      }

      localStorage.removeItem(lockKey);
      return { currentOrganization: null, userOrganizations: [] };
    } catch (error) {
      localStorage.removeItem(lockKey);
      throw error;
    }
  }

  const orgsWithDetails = await Promise.all(
    (userOrgs || []).map(async (orgMembership) => {
      const { data: orgDetails } = await supabase.rpc('get_organization_safe_info', {
        org_id: orgMembership.organization_id,
      });

      return {
        ...orgMembership,
        organization: orgDetails && orgDetails.length > 0 ? orgDetails[0] : null,
      };
    })
  );

  const validOrgs = orgsWithDetails.filter((org) => org.organization) as OrganizationMembership[];

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('auth_user_id', userId)
    .single();

  const preferredOrgId = userData?.organization_id;
  const currentOrg =
    validOrgs.find((org) => org.organization_id === preferredOrgId) || validOrgs[0] || null;

  return {
    currentOrganization: currentOrg,
    userOrganizations: validOrgs,
  };
}

export const useCurrentOrganization = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['currentOrganization', user?.id];

  const { data, isLoading, refetch } = useQuery<{
    currentOrganization: OrganizationMembership | null;
    userOrganizations: OrganizationMembership[];
  }>({
    queryKey,
    queryFn: () => fetchOrganizationsData(user!.id),
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const currentOrganization = data?.currentOrganization || null;
  const userOrganizations = data?.userOrganizations || [];

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      if (!user?.id) return;

      await supabase
        .from('users')
        .update({ organization_id: organizationId })
        .eq('auth_user_id', user.id);

      await queryClient.invalidateQueries({ queryKey });
    },
    [user?.id, queryClient, queryKey]
  );

  const organization = currentOrganization?.organization || null;

  const fetchOrganizations = useCallback(() => {
    return refetch();
  }, [refetch]);

  return {
    currentOrganization,
    userOrganizations,
    loading: isLoading,
    fetchOrganizations,
    switchOrganization,
    organization,
    refreshOrganization: fetchOrganizations,
  };
};
