
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

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

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setProfile(null);
      setLoading(false);
      setError(null);
    }
  }, [user]);

  const retryFetch = () => {
    setError(null);
    fetchUserProfile();
  };

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // First, get user profile without nested organization query
      const { data, error: fetchError } = await supabase
        .from('users')
        .select(`
          id, 
          name, 
          full_name,
          email, 
          role,
          organization_id, 
          last_login,
          created_at
        `)
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching user profile:', fetchError);
        setError('Error al obtener datos del usuario');
        return;
      }

      if (!data) {
        // Auto-create user profile if it doesn't exist
        console.log('User profile not found, creating one...');
        // Create user profile without nested organization query
        const { data: createdUser, error: createError } = await supabase
          .from('users')
          .insert({
            auth_user_id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
            email: user.email || '',
            full_name: user.user_metadata?.full_name || null,
            role: 'user'
          })
          .select(`
            id, 
            name, 
            full_name,
            email, 
            role,
            organization_id, 
            last_login,
            created_at
          `)
          .single();

        if (createError) {
          console.error('Error creating user profile:', createError);
          setError('Error al crear el perfil de usuario. Por favor, contacta al soporte.');
          return;
        }

        if (createdUser) {
          // Auto-create default organization for new user
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: 'Mi Organización',
              description: `Organización de ${createdUser.name}`,
              created_by: user.id
            })
            .select()
            .single();

          if (orgError) {
            console.error('Error creating organization:', orgError);
          } else if (orgData) {
            // Update user with organization_id
            const { data: updatedUser, error: updateError } = await supabase
              .from('users')
              .update({ organization_id: orgData.id })
              .eq('id', createdUser.id)
              .select()
              .single();

            if (!updateError && updatedUser) {
              const profileData: UserProfile = {
                ...updatedUser,
                role: updatedUser.role as 'admin' | 'user' | 'viewer',
                organization: {
                  id: orgData.id,
                  name: orgData.name,
                  description: orgData.description,
                  timezone: orgData.timezone || 'America/Santiago',
                  logo_url: orgData.logo_url,
                  plan_type: orgData.plan_type || 'free',
                  instagram_connected: !!orgData.meta_token
                }
              };
              setProfile(profileData);
              toast.success('Perfil de usuario y organización creados exitosamente');
              return;
            }
          }

          // Fallback if organization creation fails
          const profileData: UserProfile = {
            ...createdUser,
            role: createdUser.role as 'admin' | 'user' | 'viewer',
            organization: null
          };
          setProfile(profileData);
          toast.success('Perfil de usuario creado exitosamente');
        }
        return;
      }

      // If user exists but doesn't have organization_id assigned, check if they have organizations
      if (!data.organization_id) {
        console.log('User exists but no organization assigned, checking for available organizations...');
        
        const { data: userOrganizations, error: orgError } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (orgError) {
          console.error('Error fetching user organizations:', orgError);
        } else if (userOrganizations && userOrganizations.length > 0) {
          // Auto-assign the first organization found
          const firstOrg = userOrganizations[0];
          console.log('Auto-assigning organization:', firstOrg.name);
          
          const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({ organization_id: firstOrg.id })
            .eq('auth_user_id', user.id)
            .select(`
              id, 
              name, 
              full_name,
              email, 
              role,
              organization_id, 
              last_login,
              created_at
            `)
            .single();

          if (updateError) {
            console.error('Error updating user organization:', updateError);
          } else if (updatedUser) {
            // Fetch organization info separately
            const { data: orgInfo } = await supabase
              .rpc('get_organization_safe_info', { org_id: firstOrg.id });

            const orgData = orgInfo?.[0];
            const profileData: UserProfile = {
              ...updatedUser,
              role: updatedUser.role as 'admin' | 'user' | 'viewer',
              organization: orgData ? {
                id: orgData.id,
                name: orgData.name,
                description: orgData.description,
                timezone: orgData.timezone,
                logo_url: orgData.logo_url,
                plan_type: orgData.plan_type,
                instagram_connected: orgData.instagram_connected
              } : null
            };
            setProfile(profileData);
            toast.success(`Organización "${firstOrg.name}" asignada automáticamente`);
            return;
          }
        } else {
          // No organizations found - create one automatically (fallback for users created before trigger fix)
          console.log('No organizations found, creating default organization...');
          
          const { data: newOrg, error: createOrgError } = await supabase
            .from('organizations')
            .insert({
              name: 'Mi Organización',
              description: `Organización de ${data.name}`,
              created_by: user.id,
              timezone: 'America/Santiago',
              plan_type: 'free'
            })
            .select()
            .single();

          if (createOrgError) {
            console.error('Error creating organization:', createOrgError);
            setError('Error al crear organización. Por favor, contacta al soporte.');
          } else if (newOrg) {
            console.log('Created new organization:', newOrg.id);
            
            // Update user with new organization
            const { data: updatedUser, error: updateError } = await supabase
              .from('users')
              .update({ organization_id: newOrg.id })
              .eq('auth_user_id', user.id)
              .select(`
                id, 
                name, 
                full_name,
                email, 
                role,
                organization_id, 
                last_login,
                created_at
              `)
              .single();

            if (!updateError && updatedUser) {
              const profileData: UserProfile = {
                ...updatedUser,
                role: updatedUser.role as 'admin' | 'user' | 'viewer',
                organization: {
                  id: newOrg.id,
                  name: newOrg.name,
                  description: newOrg.description || '',
                  timezone: newOrg.timezone || 'America/Santiago',
                  logo_url: newOrg.logo_url || '',
                  plan_type: newOrg.plan_type || 'free',
                  instagram_connected: !!newOrg.meta_token
                }
              };
              setProfile(profileData);
              toast.success('¡Organización creada exitosamente!');
              return;
            }
          }
        }
      }

      // Fetch organization info separately if user has organization_id
      let organizationData = null;
      if (data.organization_id) {
        const { data: orgInfo } = await supabase
          .rpc('get_organization_safe_info', { org_id: data.organization_id });
        organizationData = orgInfo?.[0] || null;
      }

      // Type assertion to ensure proper typing
      const profileData: UserProfile = {
        ...data,
        role: data.role as 'admin' | 'user' | 'viewer',
        organization: organizationData ? {
          id: organizationData.id,
          name: organizationData.name,
          description: organizationData.description,
          timezone: organizationData.timezone,
          logo_url: organizationData.logo_url,
          plan_type: organizationData.plan_type,
          instagram_connected: organizationData.instagram_connected
        } : null
      };

      setProfile(profileData);

      // Actualizar last_login si han pasado más de 1 hora
      const lastLogin = data.last_login ? new Date(data.last_login) : null;
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (!lastLogin || lastLogin < oneHourAgo) {
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('auth_user_id', user.id);
      }

    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Error inesperado al obtener datos del usuario');
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = () => {
    if (user) {
      fetchUserProfile();
    }
  };

  return {
    profile,
    loading,
    error,
    refreshProfile,
    retryFetch
  };
}
