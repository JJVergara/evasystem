import { useState, useEffect, useCallback } from 'react';
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

export const useCurrentOrganization = () => {
  const { user } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState<OrganizationMembership | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<OrganizationMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrganizations = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get user's accessible organizations
      const { data: userOrgs, error: orgsError } = await supabase
        .rpc('get_user_organizations', { user_auth_id: user.id });

      if (orgsError) {
        throw orgsError;
      }

      // If user has NO organizations at all, create one automatically
      if (!userOrgs || userOrgs.length === 0) {
        // Use localStorage as a global lock to prevent concurrent creation across tabs/instances
        const lockKey = `creating_org_${user.id}`;
        const existingLock = localStorage.getItem(lockKey);
        
        // If there's a recent lock (within last 10 seconds), skip
        if (existingLock) {
          const lockTime = parseInt(existingLock);
          const now = Date.now();
          if (now - lockTime < 10000) { // 10 second lock
            console.log('⚠️ Organization creation in progress (locked), skipping...');
            setLoading(false);
            return;
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
            .eq('auth_user_id', user.id)
            .single();

          // Double-check: maybe another tab just created an org
          if (userProfile?.organization_id) {
            console.log('✅ Organization already exists, refreshing...');
            localStorage.removeItem(lockKey);
            // Retry fetching organizations
            const { data: retryOrgs } = await supabase
              .rpc('get_user_organizations', { user_auth_id: user.id });
            if (retryOrgs && retryOrgs.length > 0) {
              const membership = retryOrgs[0];
              const { data: orgDetails } = await supabase
                .rpc('get_organization_safe_info', { org_id: membership.organization_id });
              
              if (orgDetails && orgDetails.length > 0) {
                setCurrentOrganization({
                  ...membership,
                  organization: orgDetails[0]
                });
                setUserOrganizations([{
                  ...membership,
                  organization: orgDetails[0]
                }]);
              }
            }
            setLoading(false);
            return;
          }

          const userName = userProfile?.name || userProfile?.email || user.email || 'Usuario';

          // Create organization
          const { data: newOrg, error: createError } = await supabase
            .from('organizations')
            .insert({
              name: 'Mi Organización',
              description: `Organización de ${userName}`,
              created_by: user.id,
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
          
          // Don't try to update organization_id - RLS policy prevents it
          // The membership relationship is established through get_user_organizations RPC
          
          // Refresh to get the new organization
          const { data: refreshedOrgs } = await supabase
            .rpc('get_user_organizations', { user_auth_id: user.id });
          
          if (refreshedOrgs && refreshedOrgs.length > 0) {
            const membership = refreshedOrgs[0];
            const { data: orgDetails } = await supabase
              .rpc('get_organization_safe_info', { org_id: membership.organization_id });
            
            if (orgDetails && orgDetails.length > 0) {
              setCurrentOrganization({
                ...membership,
                organization: orgDetails[0]
              });
              setUserOrganizations([{
                ...membership,
                organization: orgDetails[0]
              }]);
              toast.success('¡Organización creada exitosamente!');
            }
          }
          
          // Clear lock after successful creation
          localStorage.removeItem(lockKey);
        } catch (error) {
          localStorage.removeItem(lockKey);
          throw error;
        } finally {
          setLoading(false);
        }
        
        return;
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

      setUserOrganizations(orgsWithDetails.filter(org => org.organization));

      // Get user's current organization preference
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('auth_user_id', user.id)
        .single();

      // Set current organization (prefer user's selected one, or first available)
      const preferredOrgId = userData?.organization_id;
      const currentOrg = orgsWithDetails.find(org => 
        org.organization_id === preferredOrgId
      ) || orgsWithDetails[0];

      setCurrentOrganization(currentOrg && currentOrg.organization ? currentOrg : null);
      
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setError(error as Error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const switchOrganization = async (organizationId: string) => {
    if (!user?.id) return;
    
    try {
      // Update user's current organization preference
      await supabase
        .from('users')
        .update({ organization_id: organizationId })
        .eq('auth_user_id', user.id);

      // Update local state
      const newCurrentOrg = userOrganizations.find(org => 
        org.organization_id === organizationId
      );
      
      if (newCurrentOrg) {
        setCurrentOrganization(newCurrentOrg);
      }
      
    } catch (error) {
      console.error('Error switching organization:', error);
      throw error;
    }
  };

  // Provide legacy compatibility
  const organization = currentOrganization?.organization || null;
  const updateOrganization = async (updates: Partial<any>) => {
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

      // Update local state
      setCurrentOrganization({
        ...currentOrganization,
        organization: { ...currentOrganization.organization, ...updates }
      });
      
      toast.success('Organización actualizada');
      return true;
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Error inesperado');
      return false;
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  return {
    // New multi-organization interface
    currentOrganization,
    userOrganizations,
    loading,
    error,
    fetchOrganizations,
    switchOrganization,
    // Legacy compatibility
    organization,
    updateOrganization,
    refreshOrganization: fetchOrganizations
  };
};