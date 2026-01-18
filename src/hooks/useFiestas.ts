import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useCurrentOrganization } from './useCurrentOrganization';
import { QUERY_KEYS } from '@/constants';
import {
  getFiestas,
  createFiesta as createFiestaApi,
  updateFiesta as updateFiestaApi,
} from '@/services/api';
import type { Fiesta, CreateFiestaInput, UpdateFiestaInput } from '@/types';

export type { Fiesta };

export function useFiestas() {
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const queryClient = useQueryClient();
  const [selectedFiestaId, setSelectedFiestaId] = useState<string | null>(null);

  const organizationId = organization?.id;
  const queryKey = QUERY_KEYS.fiestas(organizationId || '');

  const { data: fiestas = [], isLoading: fiestasLoading } = useQuery({
    queryKey,
    queryFn: () => getFiestas(organizationId!),
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const firstFiestaId = fiestas[0]?.id;
  useEffect(() => {
    if (!selectedFiestaId && firstFiestaId) {
      setSelectedFiestaId(firstFiestaId);
    }
  }, [firstFiestaId, selectedFiestaId]);

  const createFiestaMutation = useMutation({
    mutationFn: (data: CreateFiestaInput) => createFiestaApi(organizationId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Fiesta creada exitosamente');
    },
    onError: () => {
      toast.error('Error al crear fiesta');
    },
  });

  const updateFiestaMutation = useMutation({
    mutationFn: (data: UpdateFiestaInput) => updateFiestaApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Fiesta actualizada');
    },
    onError: () => {
      toast.error('Error al actualizar fiesta');
    },
  });

  const createFiesta = useCallback(
    async (data: CreateFiestaInput) => {
      try {
        return await createFiestaMutation.mutateAsync(data);
      } catch {
        return null;
      }
    },
    [createFiestaMutation]
  );

  const updateFiesta = useCallback(
    async (fiestaId: string, updates: Partial<Fiesta>) => {
      try {
        await updateFiestaMutation.mutateAsync({ id: fiestaId, ...updates });
        return true;
      } catch {
        return false;
      }
    },
    [updateFiestaMutation]
  );

  const refreshFiestas = useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    [queryClient, queryKey]
  );

  const selectedFiesta = fiestas.find((f) => f.id === selectedFiestaId) || null;
  const loading = orgLoading || (!!organizationId && fiestasLoading);

  return {
    fiestas,
    selectedFiesta,
    selectedFiestaId,
    setSelectedFiestaId,
    loading,
    createFiesta,
    updateFiesta,
    refreshFiestas,
  };
}
