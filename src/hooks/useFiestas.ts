/**
 * @fileoverview Hook for managing fiesta (party/event) data with React Query.
 *
 * This hook provides:
 * - CRUD operations for fiestas using the service layer
 * - Automatic organization scoping
 * - Selection state for the currently active fiesta
 *
 * Data is cached for 10 minutes (staleTime) and kept in memory
 * for 30 minutes (gcTime).
 *
 * @example
 * ```tsx
 * function FiestaManager() {
 *   const { fiestas, selectedFiesta, setSelectedFiestaId, createFiesta } = useFiestas();
 *
 *   return (
 *     <div>
 *       <FiestaList fiestas={fiestas} onSelect={setSelectedFiestaId} />
 *       {selectedFiesta && <FiestaDetails fiesta={selectedFiesta} />}
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useCallback } from 'react';
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

// Re-export Fiesta type for backwards compatibility
export type { Fiesta };

/**
 * Hook for managing fiestas with selection state.
 *
 * @returns Object containing:
 * - `fiestas` - Array of Fiesta objects for current organization
 * - `selectedFiesta` - Currently selected Fiesta or null
 * - `selectedFiestaId` - ID of selected fiesta
 * - `setSelectedFiestaId(id)` - Select a fiesta by ID
 * - `loading` - Whether data is being fetched
 * - `createFiesta(data)` - Create a new fiesta
 * - `updateFiesta(id, updates)` - Update an existing fiesta
 * - `refreshFiestas()` - Manually refresh the fiesta list
 */
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
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Auto-select first fiesta if none selected and fiestas loaded
  if (!selectedFiestaId && fiestas.length > 0) {
    setTimeout(() => setSelectedFiestaId(fiestas[0].id), 0);
  }

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
