import { useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useCurrentOrganization } from './useCurrentOrganization';
import { QUERY_KEYS } from '@/constants';
import {
  getTasks,
  createTask as createTaskApi,
  updateTask as updateTaskApi,
  deleteTask as deleteTaskApi,
  type TaskType,
  type TaskStatusType,
  type TaskWithRelations,
  type TaskStats,
  type CreateTaskInput,
} from '@/services/api';

export type { TaskType, TaskStatusType, TaskWithRelations, TaskStats };

export function useTasksManagement() {
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const queryClient = useQueryClient();

  const organizationId = organization?.id;
  const queryKey = QUERY_KEYS.tasks(organizationId || '');

  const {
    data,
    isLoading: tasksLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => getTasks(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData: CreateTaskInput) => createTaskApi(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Tarea creada exitosamente');
    },
    onError: () => {
      toast.error('Error al crear tarea');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({
      taskId,
      status,
      points,
    }: {
      taskId: string;
      status: TaskStatusType;
      points?: number;
    }) => updateTaskApi({ taskId, status, points }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Tarea actualizada correctamente');
    },
    onError: () => {
      toast.error('Error al actualizar tarea');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => deleteTaskApi(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Tarea eliminada correctamente');
    },
    onError: () => {
      toast.error('Error al eliminar tarea');
    },
  });

  const createTask = useCallback(
    async (taskData: CreateTaskInput) => {
      try {
        return await createTaskMutation.mutateAsync(taskData);
      } catch {
        return null;
      }
    },
    [createTaskMutation]
  );

  const updateTaskStatus = useCallback(
    async (taskId: string, status: TaskStatusType, points?: number) => {
      try {
        await updateTaskMutation.mutateAsync({ taskId, status, points });
        return true;
      } catch {
        return false;
      }
    },
    [updateTaskMutation]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      try {
        await deleteTaskMutation.mutateAsync(taskId);
        return true;
      } catch {
        return false;
      }
    },
    [deleteTaskMutation]
  );

  const refreshTasks = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const loading = orgLoading || (!!organizationId && tasksLoading);

  return {
    tasks: data?.tasks || [],
    stats: data?.stats || {
      total: 0,
      completed: 0,
      pending: 0,
      invalid: 0,
      totalPoints: 0,
      completionRate: 0,
    },
    loading,
    error: error ? 'Error al cargar tareas' : null,
    createTask,
    updateTaskStatus,
    deleteTask,
    refreshTasks,
  };
}
