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
  // Get user's accessible organizations
  const { data: userOrgs, error: orgsError } = await supabase
    .rpc('get_user_organizations', { user_auth_id: userId });

  if (orgsError) {
    throw orgsError;
  }

  // If user has NO organizations at all, create one automatically
  if (!userOrgs || userOrgs.length === 0) {
    // Use localStorage as a global lock to prevent concurrent creation across tabs/instances
    const lockKey = `creating_org_${userId}`;
    const existingLock = localStorage.getItem(lockKey);

    // If there's a recent lock (within last 10 seconds), skip
    if (existingLock) {
      const lockTime = parseInt(existingLock);
      const now = Date.now();
      if (now - lockTime < 10000) {
        console.log('⚠️ Organization creation in progress (locked), skipping...');
        return { currentOrganization: null, userOrganizations: [] };
      }
    }

    // Set the lock
    localStorage.setItem(lockKey, Date.now().toString());
    console.log('User has no organizations, creating default organization...');

    try {
      // Get user profile for name
      const { data: userProfile } = await supabase
        .from('users')
        .select('id, name, email, organization_id')
        .eq('auth_user_id', userId)
        .single();

      // Double-check: maybe another tab just created an org
      if (userProfile?.organization_id) {
        console.log('✅ Organization already exists, refreshing...');
        localStorage.removeItem(lockKey);
        // Retry fetching organizations
        const { data: retryOrgs } = await supabase
          .rpc('get_user_organizations', { user_auth_id: userId });
        if (retryOrgs && retryOrgs.length > 0) {
          const membership = retryOrgs[0];
          const { data: orgDetails } = await supabase
            .rpc('get_organization_safe_info', { org_id: membership.organization_id });

          if (orgDetails && orgDetails.length > 0) {
            const org = { ...membership, organization: orgDetails[0] };
            return { currentOrganization: org, userOrganizations: [org] };
          }
        }
        return { currentOrganization: null, userOrganizations: [] };
      }

      const userName = userProfile?.name || userProfile?.email || 'Usuario';

      // Create organization
      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        .insert({
          name: 'Mi Organización',
          description: `Organización de ${userName}`,
          created_by: userId,
          timezone: 'America/Santiago',
          plan_type: 'free'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating organization:', createError);
        localStorage.removeItem(lockKey);
        throw createError;
      }

      console.log('✅ Organization created:', newOrg.id);

      // Refresh to get the new organization
      const { data: refreshedOrgs } = await supabase
        .rpc('get_user_organizations', { user_auth_id: userId });

      if (refreshedOrgs && refreshedOrgs.length > 0) {
        const membership = refreshedOrgs[0];
        const { data: orgDetails } = await supabase
          .rpc('get_organization_safe_info', { org_id: membership.organization_id });

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

  // Get organizations with their details
  const orgsWithDetails = await Promise.all(
    (userOrgs || []).map(async (orgMembership) => {
      const { data: orgDetails } = await supabase
        .rpc('get_organization_safe_info', {
          org_id: orgMembership.organization_id
        });

      return {
        ...orgMembership,
        organization: orgDetails && orgDetails.length > 0 ? orgDetails[0] : null
      };
    })
  );

  const validOrgs = orgsWithDetails.filter(org => org.organization) as OrganizationMembership[];

  // Get user's current organization preference
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('auth_user_id', userId)
    .single();

  // Set current organization (prefer user's selected one, or first available)
  const preferredOrgId = userData?.organization_id;
  const currentOrg = validOrgs.find(org =>
    org.organization_id === preferredOrgId
  ) || validOrgs[0] || null;

  return {
    currentOrganization: currentOrg,
    userOrganizations: validOrgs
  };
}

export const useCurrentOrganization = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['currentOrganization', user?.id];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchOrganizationsData(user!.id),
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  });

  const currentOrganization = data?.currentOrganization || null;
  const userOrganizations = data?.userOrganizations || [];

  const switchOrganization = useCallback(async (organizationId: string) => {
    if (!user?.id) return;

    try {
      // Update user's current organization preference
      await supabase
        .from('users')
        .update({ organization_id: organizationId })
        .eq('auth_user_id', user.id);

      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      console.error('Error switching organization:', error);
      throw error;
    }
  }, [user?.id, queryClient, queryKey]);

  // Provide legacy compatibility
  const organization = currentOrganization?.organization || null;

  const updateOrganization = useCallback(async (updates: Partial<any>) => {
    if (!currentOrganization?.organization) return false;

    try {
      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', currentOrganization.organization.id);

      if (error) {
        console.error('Error updating organization:', error);
        toast.error('Error al actualizar organización');
        return false;
      }

      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey });
      toast.success('Organización actualizada');
      return true;
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Error inesperado');
      return false;
    }
  }, [currentOrganization, queryClient, queryKey]);

  const fetchOrganizations = useCallback(() => {
    return refetch();
  }, [refetch]);

  return {
    // New multi-organization interface
    currentOrganization,
    userOrganizations,
    loading: isLoading,
    error: error as Error | null,
    fetchOrganizations,
    switchOrganization,
    // Legacy compatibility
    organization,
    updateOrganization,
    refreshOrganization: fetchOrganizations
  };
};
