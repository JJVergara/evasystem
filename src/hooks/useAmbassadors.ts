/**
 * @fileoverview Hook for managing ambassador data with React Query.
 *
 * This hook provides CRUD operations for ambassadors using:
 * - Service layer (`@/services/api`) for API calls
 * - Query keys from `@/constants` for cache management
 * - Automatic organization scoping via `useCurrentOrganization`
 *
 * Data is automatically cached for 5 minutes (staleTime) and kept in
 * memory for 15 minutes (gcTime) for optimal performance.
 *
 * @example
 * ```tsx
 * function AmbassadorList() {
 *   const { ambassadors, loading, createAmbassador, deleteAmbassador } = useAmbassadors();
 *
 *   const handleCreate = async () => {
 *     await createAmbassador({ first_name: 'John', last_name: 'Doe', ... });
 *   };
 *
 *   if (loading) return <Skeleton />;
 *   return ambassadors.map(a => <AmbassadorCard key={a.id} ambassador={a} />);
 * }
 * ```
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useCurrentOrganization } from './useCurrentOrganization';
import { QUERY_KEYS } from '@/constants';
import {
  getAmbassadors,
  createAmbassador as createAmbassadorApi,
  updateAmbassador as updateAmbassadorApi,
  deleteAmbassador as deleteAmbassadorApi,
} from '@/services/api';
import type { Ambassador, CreateAmbassadorInput, UpdateAmbassadorInput } from '@/types';

// Re-export Ambassador type for backwards compatibility
export type { Ambassador };

/**
 * Hook for managing ambassadors with full CRUD operations.
 *
 * @returns Object containing:
 * - `ambassadors` - Array of Ambassador objects for current organization
 * - `loading` - Whether data is being fetched
 * - `error` - Error message if fetch failed
 * - `createAmbassador(data)` - Create a new ambassador
 * - `updateAmbassador(id, updates)` - Update an existing ambassador
 * - `deleteAmbassador(id)` - Delete an ambassador
 * - `refreshAmbassadors()` - Manually refresh the ambassador list
 */
export function useAmbassadors() {
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const queryClient = useQueryClient();

  const organizationId = organization?.id;
  const queryKey = QUERY_KEYS.ambassadors(organizationId || '');

  const {
    data: ambassadors = [],
    isLoading: ambassadorsLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => getAmbassadors(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  const createAmbassadorMutation = useMutation({
    mutationFn: (data: CreateAmbassadorInput) => createAmbassadorApi(organizationId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Embajador creado exitosamente');
    },
    onError: () => {
      toast.error('Error al crear embajador');
    },
  });

  const updateAmbassadorMutation = useMutation({
    mutationFn: (data: UpdateAmbassadorInput) => updateAmbassadorApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Embajador actualizado');
    },
    onError: () => {
      toast.error('Error al actualizar embajador');
    },
  });

  const deleteAmbassadorMutation = useMutation({
    mutationFn: (ambassadorId: string) => deleteAmbassadorApi(ambassadorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Embajador eliminado');
    },
    onError: () => {
      toast.error('Error al eliminar embajador');
    },
  });

  const createAmbassador = useCallback(
    (data: CreateAmbassadorInput) => createAmbassadorMutation.mutateAsync(data),
    [createAmbassadorMutation]
  );

  const updateAmbassador = useCallback(
    (id: string, updates: Partial<Ambassador>) =>
      updateAmbassadorMutation.mutateAsync({ id, ...updates }),
    [updateAmbassadorMutation]
  );

  const deleteAmbassador = useCallback(
    (ambassadorId: string) => deleteAmbassadorMutation.mutateAsync(ambassadorId),
    [deleteAmbassadorMutation]
  );

  const refreshAmbassadors = useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    [queryClient, queryKey]
  );

  const loading = orgLoading || (!!organizationId && ambassadorsLoading);

  return {
    ambassadors,
    loading,
    error: error ? 'Error al cargar embajadores' : null,
    createAmbassador,
    updateAmbassador,
    deleteAmbassador,
    refreshAmbassadors,
  };
}
