import { useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrganization } from "./useCurrentOrganization";
import { toast } from "sonner";

interface Task {
  id: string;
  embassador_id: string;
  event_id: string;
  task_type: 'story' | 'mention' | 'repost';
  platform: string;
  expected_hashtag: string | null;
  status: 'pending' | 'uploaded' | 'in_progress' | 'completed' | 'invalid' | 'expired';
  instagram_story_id: string | null;
  story_url: string | null;
  upload_time: string | null;
  expiry_time: string | null;
  completion_method: '24h_validation' | 'manual';
  engagement_score: number;
  reach_count: number;
  verified_through_api: boolean;
  points_earned: number;
  last_status_update: string;
  created_at: string;
  embassadors?: {
    first_name: string;
    last_name: string;
    instagram_user: string;
  };
  events?: {
    id: string;
    fiesta_id: string;
    fiestas?: {
      name: string;
    };
  };
}

interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  invalid: number;
  totalPoints: number;
  completionRate: number;
}

interface TasksData {
  tasks: Task[];
  stats: TaskStats;
}

async function fetchTasksData(organizationId: string): Promise<TasksData> {
  const { data, error: fetchError } = await supabase
    .from('tasks')
    .select(`
      *,
      embassadors (
        first_name,
        last_name,
        instagram_user,
        organization_id
      ),
      events (
        id,
        fiesta_id,
        fiestas (
          name
        )
      )
    `)
    .eq('embassadors.organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('Error fetching tasks:', fetchError);
    throw fetchError;
  }

  // Type assertion to ensure proper typing
  const tasksData = (data || []).map(task => ({
    ...task,
    task_type: task.task_type as 'story' | 'mention' | 'repost',
    status: task.status as 'pending' | 'uploaded' | 'in_progress' | 'completed' | 'invalid' | 'expired',
    completion_method: task.completion_method as '24h_validation' | 'manual'
  }));

  // Calculate stats
  const completed = tasksData.filter(t => t.status === 'completed').length;
  const pending = tasksData.filter(t => ['pending', 'uploaded', 'in_progress'].includes(t.status)).length;
  const invalid = tasksData.filter(t => ['invalid', 'expired'].includes(t.status)).length;
  const totalPoints = tasksData.reduce((sum, t) => sum + t.points_earned, 0);
  const completionRate = tasksData.length > 0 ? (completed / tasksData.length) * 100 : 0;

  return {
    tasks: tasksData,
    stats: {
      total: tasksData.length,
      completed,
      pending,
      invalid,
      totalPoints,
      completionRate: Math.round(completionRate * 100) / 100
    }
  };
}

export function useTasksManagement() {
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const queryClient = useQueryClient();

  const queryKey = ['tasks', organization?.id];

  const { data, isLoading: tasksLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchTasksData(organization!.id),
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes cache
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: {
      embassador_id: string;
      event_id: string;
      task_type: 'story' | 'mention' | 'repost';
      expected_hashtag?: string;
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Tarea creada exitosamente');
    },
    onError: () => {
      toast.error('Error al crear tarea');
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status, points }: { taskId: string; status: Task['status']; points?: number }) => {
      const updateData: any = {
        status,
        last_status_update: new Date().toISOString()
      };

      if (points !== undefined) {
        updateData.points_earned = points;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Tarea actualizada correctamente');
    },
    onError: () => {
      toast.error('Error al actualizar tarea');
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Tarea eliminada correctamente');
    },
    onError: () => {
      toast.error('Error al eliminar tarea');
    }
  });

  const createTask = useCallback(async (taskData: {
    embassador_id: string;
    event_id: string;
    task_type: 'story' | 'mention' | 'repost';
    expected_hashtag?: string;
  }) => {
    try {
      return await createTaskMutation.mutateAsync(taskData);
    } catch {
      return null;
    }
  }, [createTaskMutation]);

  const updateTaskStatus = useCallback(async (taskId: string, status: Task['status'], points?: number) => {
    try {
      await updateTaskMutation.mutateAsync({ taskId, status, points });
      return true;
    } catch {
      return false;
    }
  }, [updateTaskMutation]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await deleteTaskMutation.mutateAsync(taskId);
      return true;
    } catch {
      return false;
    }
  }, [deleteTaskMutation]);

  const refreshTasks = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const loading = orgLoading || (!!organization?.id && tasksLoading);

  return {
    tasks: data?.tasks || [],
    stats: data?.stats || {
      total: 0,
      completed: 0,
      pending: 0,
      invalid: 0,
      totalPoints: 0,
      completionRate: 0
    },
    loading,
    error: error ? 'Error al cargar tareas' : null,
    createTask,
    updateTaskStatus,
    deleteTask,
    refreshTasks
  };
}
