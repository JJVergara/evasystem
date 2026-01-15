import { useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrganization } from "./useCurrentOrganization";
import { toast } from "sonner";

export interface Ambassador {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  instagram_user: string;
  organization_id: string;
  status: string;
  global_points: number;
  global_category: string;
  performance_status: string;
  events_participated: number;
  completed_tasks: number;
  failed_tasks: number;
  follower_count: number;
  created_at: string;
  rut?: string;
  date_of_birth?: string | null;
  profile_picture_url?: string | null;
}

interface SensitiveData {
  email?: string;
  date_of_birth?: string | null;
  rut?: string;
  profile_picture_url?: string | null;
}

async function fetchAmbassadorsData(organizationId: string): Promise<Ambassador[]> {
  // Fetch basic ambassador data (non-sensitive)
  const { data: basicData, error: basicError } = await supabase
    .from('embassadors')
    .select('id, first_name, last_name, instagram_user, instagram_user_id, follower_count, global_points, global_category, performance_status, events_participated, completed_tasks, failed_tasks, organization_id, created_by_user_id, status, profile_public, last_instagram_sync, created_at')
    .eq('organization_id', organizationId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false });

  if (basicError) throw basicError;

  // For each ambassador, try to fetch sensitive data (will only work if user has manage_ambassadors permission)
  const ambassadorsWithSensitiveData = await Promise.all(
    (basicData || []).map(async (ambassador) => {
      try {
        const { data: sensitiveData } = await supabase
          .rpc('get_ambassador_sensitive_data', { ambassador_id: ambassador.id });

        const sensitive: SensitiveData = sensitiveData?.[0] || {};
        return {
          ...ambassador,
          email: sensitive.email || undefined,
          date_of_birth: sensitive.date_of_birth || null,
          rut: sensitive.rut || undefined,
          profile_picture_url: sensitive.profile_picture_url || null
        };
      } catch {
        // If user doesn't have permission, return without sensitive data
        return {
          ...ambassador,
          email: undefined,
          date_of_birth: null,
          rut: undefined,
          profile_picture_url: null
        };
      }
    })
  );

  return ambassadorsWithSensitiveData;
}

export function useAmbassadors() {
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const queryClient = useQueryClient();

  const queryKey = ['ambassadors', organization?.id];

  const { data: ambassadors = [], isLoading: ambassadorsLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchAmbassadorsData(organization!.id),
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes cache
  });

  const createAmbassadorMutation = useMutation({
    mutationFn: async (ambassadorData: {
      first_name: string;
      last_name: string;
      email: string;
      instagram_user: string;
      date_of_birth?: string;
      rut?: string;
    }) => {
      const { data, error } = await supabase
        .from('embassadors')
        .insert({
          ...ambassadorData,
          organization_id: organization?.id,
          status: 'active',
          global_points: 0,
          global_category: 'bronze'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Embajador creado exitosamente');
    },
    onError: () => {
      toast.error('Error al crear embajador');
    }
  });

  const updateAmbassadorMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Ambassador> & { id: string }) => {
      const { error } = await supabase
        .from('embassadors')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Embajador actualizado');
    },
    onError: () => {
      toast.error('Error al actualizar embajador');
    }
  });

  const deleteAmbassadorMutation = useMutation({
    mutationFn: async (ambassadorId: string) => {
      const { error } = await supabase
        .from('embassadors')
        .update({ status: 'deleted' })
        .eq('id', ambassadorId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Embajador eliminado');
    },
    onError: () => {
      toast.error('Error al eliminar embajador');
    }
  });

  const createAmbassador = useCallback(async (ambassadorData: {
    first_name: string;
    last_name: string;
    email: string;
    instagram_user: string;
    date_of_birth?: string;
    rut?: string;
  }) => {
    return createAmbassadorMutation.mutateAsync(ambassadorData);
  }, [createAmbassadorMutation]);

  const updateAmbassador = useCallback(async (id: string, updates: Partial<Ambassador>) => {
    return updateAmbassadorMutation.mutateAsync({ id, ...updates });
  }, [updateAmbassadorMutation]);

  const deleteAmbassador = useCallback(async (ambassadorId: string) => {
    return deleteAmbassadorMutation.mutateAsync(ambassadorId);
  }, [deleteAmbassadorMutation]);

  const refreshAmbassadors = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const loading = orgLoading || (!!organization?.id && ambassadorsLoading);

  return {
    ambassadors,
    loading,
    error: error ? 'Error al cargar embajadores' : null,
    createAmbassador,
    updateAmbassador,
    deleteAmbassador,
    refreshAmbassadors
  };
}
