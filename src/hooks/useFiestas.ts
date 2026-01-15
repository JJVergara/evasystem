import { useState, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrganization } from "./useCurrentOrganization";
import { toast } from "sonner";

export interface Fiesta {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
  event_date: string | null;
  location: string | null;
  main_hashtag: string | null;
  secondary_hashtags: string[] | null;
  status: string;
  created_at: string;
  updated_at: string;
}

async function fetchFiestasData(organizationId: string): Promise<Fiesta[]> {
  const { data, error } = await supabase
    .from('fiestas')
    .select('id, organization_id, name, description, location, event_date, main_hashtag, secondary_hashtags, instagram_handle, status, created_at, updated_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching fiestas:', error);
    throw error;
  }

  return data || [];
}

export function useFiestas() {
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const queryClient = useQueryClient();
  const [selectedFiestaId, setSelectedFiestaId] = useState<string | null>(null);

  const queryKey = ['fiestas', organization?.id];

  const { data: fiestas = [], isLoading: fiestasLoading } = useQuery({
    queryKey,
    queryFn: () => fetchFiestasData(organization!.id),
    enabled: !!organization?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  });

  // Auto-select first fiesta if none selected and fiestas loaded
  if (!selectedFiestaId && fiestas.length > 0) {
    // Use setTimeout to avoid state update during render
    setTimeout(() => {
      setSelectedFiestaId(fiestas[0].id);
    }, 0);
  }

  const createFiestaMutation = useMutation({
    mutationFn: async (fiestaData: Omit<Fiesta, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organization) throw new Error('No organization');

      const { data, error } = await supabase
        .from('fiestas')
        .insert({
          ...fiestaData,
          organization_id: organization.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating fiesta:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Fiesta creada exitosamente');
    },
    onError: () => {
      toast.error('Error al crear fiesta');
    }
  });

  const updateFiestaMutation = useMutation({
    mutationFn: async ({ fiestaId, updates }: { fiestaId: string; updates: Partial<Fiesta> }) => {
      const { error } = await supabase
        .from('fiestas')
        .update(updates)
        .eq('id', fiestaId);

      if (error) {
        console.error('Error updating fiesta:', error);
        throw error;
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Fiesta actualizada');
    },
    onError: () => {
      toast.error('Error al actualizar fiesta');
    }
  });

  const createFiesta = useCallback(async (fiestaData: Omit<Fiesta, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
    try {
      return await createFiestaMutation.mutateAsync(fiestaData);
    } catch {
      return null;
    }
  }, [createFiestaMutation]);

  const updateFiesta = useCallback(async (fiestaId: string, updates: Partial<Fiesta>) => {
    try {
      await updateFiestaMutation.mutateAsync({ fiestaId, updates });
      return true;
    } catch {
      return false;
    }
  }, [updateFiestaMutation]);

  const refreshFiestas = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const selectedFiesta = fiestas.find(f => f.id === selectedFiestaId) || null;

  // Loading is true if org is loading OR fiestas are loading (when org exists)
  const loading = orgLoading || (!!organization?.id && fiestasLoading);

  return {
    fiestas,
    selectedFiesta,
    selectedFiestaId,
    setSelectedFiestaId,
    loading,
    createFiesta,
    updateFiesta,
    refreshFiestas
  };
}
