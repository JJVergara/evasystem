import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  name: string;
  full_name: string | null;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  organization_id: string | null;
  last_login: string | null;
  created_at: string;
  organization?: {
    id: string;
    name: string;
    description: string | null;
    timezone: string;
    logo_url: string | null;
    plan_type: string;
    instagram_connected: boolean;
  } | null;
}

async function fetchUserProfileData(
  userId: string,
  userEmail: string | undefined,
  userMetadata: { full_name?: string } | null
): Promise<UserProfile> {
  const { data, error: fetchError } = await supabase
    .from('users')
    .select(
      `
      id,
      name,
      full_name,
      email,
      role,
      organization_id,
      last_login,
      created_at
    `
    )
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (fetchError) {
    throw new Error('Error al obtener datos del usuario');
  }

  if (!data) {
    const { data: createdUser, error: createError } = await supabase
      .from('users')
      .insert({
        auth_user_id: userId,
        name: userMetadata?.full_name || userEmail?.split('@')[0] || 'Usuario',
        email: userEmail || '',
        full_name: userMetadata?.full_name || null,
        role: 'user',
      })
      .select(
        `
        id,
        name,
        full_name,
        email,
        role,
        organization_id,
        last_login,
        created_at
      `
      )
      .single();

    if (createError) {
      throw new Error('Error al crear el perfil de usuario');
    }

    if (createdUser) {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: 'Mi Organización',
          description: `Organización de ${createdUser.name}`,
          created_by: userId,
        })
        .select()
        .single();

      if (!orgError && orgData) {
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ organization_id: orgData.id })
          .eq('id', createdUser.id)
          .select()
          .single();

        if (!updateError && updatedUser) {
          toast.success('Perfil de usuario y organización creados exitosamente');
          return {
            ...updatedUser,
            role: updatedUser.role as 'admin' | 'user' | 'viewer',
            organization: {
              id: orgData.id,
              name: orgData.name,
              description: orgData.description,
              timezone: orgData.timezone || 'America/Santiago',
              logo_url: orgData.logo_url,
              plan_type: orgData.plan_type || 'free',
              instagram_connected: !!orgData.meta_token,
            },
          };
        }
      }

      toast.success('Perfil de usuario creado exitosamente');
      return {
        ...createdUser,
        role: createdUser.role as 'admin' | 'user' | 'viewer',
        organization: null,
      };
    }

    throw new Error('Error al crear el perfil de usuario');
  }

  if (!data.organization_id) {
    const { data: userOrganizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!orgError && userOrganizations && userOrganizations.length > 0) {
      const firstOrg = userOrganizations[0];

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ organization_id: firstOrg.id })
        .eq('auth_user_id', userId)
        .select(
          `
          id,
          name,
          full_name,
          email,
          role,
          organization_id,
          last_login,
          created_at
        `
        )
        .single();

      if (!updateError && updatedUser) {
        const { data: orgInfo } = await supabase.rpc('get_organization_safe_info', {
          org_id: firstOrg.id,
        });

        const orgData = orgInfo?.[0];
        toast.success(`Organización "${firstOrg.name}" asignada automáticamente`);
        return {
          ...updatedUser,
          role: updatedUser.role as 'admin' | 'user' | 'viewer',
          organization: orgData
            ? {
                id: orgData.id,
                name: orgData.name,
                description: orgData.description,
                timezone: orgData.timezone,
                logo_url: orgData.logo_url,
                plan_type: orgData.plan_type,
                instagram_connected: orgData.instagram_connected,
              }
            : null,
        };
      }
    } else if (!orgError) {
      const { data: newOrg, error: createOrgError } = await supabase
        .from('organizations')
        .insert({
          name: 'Mi Organización',
          description: `Organización de ${data.name}`,
          created_by: userId,
          timezone: 'America/Santiago',
          plan_type: 'free',
        })
        .select()
        .single();

      if (!createOrgError && newOrg) {
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ organization_id: newOrg.id })
          .eq('auth_user_id', userId)
          .select(
            `
            id,
            name,
            full_name,
            email,
            role,
            organization_id,
            last_login,
            created_at
          `
          )
          .single();

        if (!updateError && updatedUser) {
          toast.success('¡Organización creada exitosamente!');
          return {
            ...updatedUser,
            role: updatedUser.role as 'admin' | 'user' | 'viewer',
            organization: {
              id: newOrg.id,
              name: newOrg.name,
              description: newOrg.description || '',
              timezone: newOrg.timezone || 'America/Santiago',
              logo_url: newOrg.logo_url || '',
              plan_type: newOrg.plan_type || 'free',
              instagram_connected: !!newOrg.meta_token,
            },
          };
        }
      }
    }
  }

  let organizationData = null;
  if (data.organization_id) {
    const { data: orgInfo } = await supabase.rpc('get_organization_safe_info', {
      org_id: data.organization_id,
    });
    organizationData = orgInfo?.[0] || null;
  }

  const lastLogin = data.last_login ? new Date(data.last_login) : null;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  if (!lastLogin || lastLogin < oneHourAgo) {
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('auth_user_id', userId);
  }

  return {
    ...data,
    role: data.role as 'admin' | 'user' | 'viewer',
    organization: organizationData
      ? {
          id: organizationData.id,
          name: organizationData.name,
          description: organizationData.description,
          timezone: organizationData.timezone,
          logo_url: organizationData.logo_url,
          plan_type: organizationData.plan_type,
          instagram_connected: organizationData.instagram_connected,
        }
      : null,
  };
}

export function useUserProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['userProfile', user?.id];

  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchUserProfileData(user!.id, user!.email, user!.user_metadata),
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const refreshProfile = useCallback(() => {
    return refetch();
  }, [refetch]);

  const retryFetch = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    profile: profile || null,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refreshProfile,
    retryFetch,
  };
}
