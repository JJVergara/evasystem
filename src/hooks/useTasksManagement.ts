
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "./useUserProfile";
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

export function useTasksManagement() {
  const { profile } = useUserProfile();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    completed: 0,
    pending: 0,
    invalid: 0,
    totalPoints: 0,
    completionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchTasks();
    }
  }, [profile?.organization_id]);

  const fetchTasks = async () => {
    if (!profile?.organization_id) return;

    try {
      setLoading(true);
      setError(null);

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
        .eq('embassadors.organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching tasks:', fetchError);
        setError('Error al cargar tareas');
        return;
      }

      // Type assertion to ensure proper typing
      const tasksData = (data || []).map(task => ({
        ...task,
        task_type: task.task_type as 'story' | 'mention' | 'repost',
        status: task.status as 'pending' | 'uploaded' | 'in_progress' | 'completed' | 'invalid' | 'expired',
        completion_method: task.completion_method as '24h_validation' | 'manual'
      }));
      
      setTasks(tasksData);

      // Calcular estadísticas
      const completed = tasksData.filter(t => t.status === 'completed').length;
      const pending = tasksData.filter(t => ['pending', 'uploaded', 'in_progress'].includes(t.status)).length;
      const invalid = tasksData.filter(t => ['invalid', 'expired'].includes(t.status)).length;
      const totalPoints = tasksData.reduce((sum, t) => sum + t.points_earned, 0);
      const completionRate = tasksData.length > 0 ? (completed / tasksData.length) * 100 : 0;

      setStats({
        total: tasksData.length,
        completed,
        pending,
        invalid,
        totalPoints,
        completionRate: Math.round(completionRate * 100) / 100
      });

    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Error inesperado al cargar tareas');
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData: {
    embassador_id: string;
    event_id: string;
    task_type: 'story' | 'mention' | 'repost';
    expected_hashtag?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating task:', error);
        toast.error('Error al crear tarea');
        return null;
      }

      toast.success('Tarea creada exitosamente');
      fetchTasks(); // Refrescar lista
      return data;

    } catch (err) {
      console.error('Error creating task:', err);
      toast.error('Error al crear tarea');
      return null;
    }
  };

  const updateTaskStatus = async (taskId: string, status: Task['status'], points?: number) => {
    try {
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

      if (error) {
        console.error('Error updating task:', error);
        toast.error('Error al actualizar tarea');
        return false;
      }

      toast.success('Tarea actualizada correctamente');
      fetchTasks(); // Refrescar lista
      return true;

    } catch (err) {
      console.error('Error updating task:', err);
      toast.error('Error al actualizar tarea');
      return false;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        console.error('Error deleting task:', error);
        toast.error('Error al eliminar tarea');
        return false;
      }

      toast.success('Tarea eliminada correctamente');
      fetchTasks(); // Refrescar lista
      return true;

    } catch (err) {
      console.error('Error deleting task:', err);
      toast.error('Error al eliminar tarea');
      return false;
    }
  };

  return {
    tasks,
    stats,
    loading,
    error,
    createTask,
    updateTaskStatus,
    deleteTask,
    refreshTasks: fetchTasks
  };
}
