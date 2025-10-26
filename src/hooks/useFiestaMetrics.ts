import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FiestaMetrics {
  total_ambassadors: number;
  active_ambassadors: number;
  total_tasks: number;
  completed_tasks: number;
  invalid_tasks: number;
  pending_tasks: number;
  total_reach: number;
  avg_engagement: number;
  completion_rate: number;
  top_ambassadors: Array<{
    id: string;
    name: string;
    instagram_user: string;
    points: number;
    tasks_completed: number;
    category: string;
  }>;
  recent_tasks: Array<{
    id: string;
    task_type: string;
    status: string;
    created_at: string;
    ambassador_name: string;
    fiesta_name: string;
  }>;
}

export function useFiestaMetrics(fiestaId: string | null) {
  const [metrics, setMetrics] = useState<FiestaMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [fiestaId]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);

      if (!fiestaId) {
        // Métricas globales de todas las fiestas
        await fetchGlobalMetrics();
      } else {
        // Métricas específicas de una fiesta
        await fetchFiestaSpecificMetrics(fiestaId);
      }
    } catch (error) {
      console.error('Error fetching fiesta metrics:', error);
      toast.error('Error al cargar métricas');
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalMetrics = async () => {
    // Obtener todas las tareas de la organización
    const { data: tasks } = await supabase
      .from('tasks')
      .select(`
        id,
        task_type,
        status,
        points_earned,
        reach_count,
        engagement_score,
        created_at,
        embassadors!inner (
          id,
          first_name,
          last_name,
          instagram_user,
          global_points,
          global_category,
          organization_id
        ),
        events!inner (
          id,
          fiestas!inner (
            id,
            name,
            organization_id
          )
        )
      `);

    // Obtener embajadores únicos
    const ambassadorSet = new Set();
    const ambassadorMap = new Map();
    
    tasks?.forEach(task => {
      const ambassador = task.embassadors;
      if (ambassador) {
        ambassadorSet.add(ambassador.id);
        
        const key = ambassador.id;
        if (!ambassadorMap.has(key)) {
          ambassadorMap.set(key, {
            id: ambassador.id,
            name: `${ambassador.first_name} ${ambassador.last_name}`,
            instagram_user: ambassador.instagram_user,
            points: ambassador.global_points || 0,
            tasks_completed: 0,
            category: ambassador.global_category || 'bronze'
          });
        }
        
        if (task.status === 'completed') {
          ambassadorMap.get(key).tasks_completed += 1;
        }
      }
    });

    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
    const invalidTasks = tasks?.filter(t => t.status === 'invalid').length || 0;
    const pendingTasks = tasks?.filter(t => t.status === 'pending').length || 0;
    const totalReach = tasks?.reduce((sum, t) => sum + (t.reach_count || 0), 0) || 0;
    const avgEngagement = tasks?.length > 0 
      ? tasks.reduce((sum, t) => sum + (t.engagement_score || 0), 0) / tasks.length 
      : 0;

    const metricsData: FiestaMetrics = {
      total_ambassadors: ambassadorSet.size,
      active_ambassadors: ambassadorSet.size, // Simplificado por ahora
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      invalid_tasks: invalidTasks,
      pending_tasks: pendingTasks,
      total_reach: totalReach,
      avg_engagement: Number(avgEngagement.toFixed(1)),
      completion_rate: totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(1)) : 0,
      top_ambassadors: Array.from(ambassadorMap.values())
        .sort((a, b) => b.points - a.points)
        .slice(0, 5),
      recent_tasks: tasks?.slice(0, 10).map(task => ({
        id: task.id,
        task_type: task.task_type,
        status: task.status,
        created_at: task.created_at,
        ambassador_name: `${task.embassadors.first_name} ${task.embassadors.last_name}`,
        fiesta_name: task.events?.fiestas?.name || 'Sin fiesta'
      })) || []
    };

    setMetrics(metricsData);
  };

  const fetchFiestaSpecificMetrics = async (fiestaId: string) => {
    // Obtener eventos de la fiesta específica
    const { data: events } = await supabase
      .from('events')
      .select('id')
      .eq('fiesta_id', fiestaId);

    const eventIds = events?.map(e => e.id) || [];

    if (eventIds.length === 0) {
      setMetrics({
        total_ambassadors: 0,
        active_ambassadors: 0,
        total_tasks: 0,
        completed_tasks: 0,
        invalid_tasks: 0,
        pending_tasks: 0,
        total_reach: 0,
        avg_engagement: 0,
        completion_rate: 0,
        top_ambassadors: [],
        recent_tasks: []
      });
      return;
    }

    // Obtener tareas específicas de esta fiesta
    const { data: tasks } = await supabase
      .from('tasks')
      .select(`
        id,
        task_type,
        status,
        points_earned,
        reach_count,
        engagement_score,
        created_at,
        embassadors!inner (
          id,
          first_name,
          last_name,
          instagram_user,
          global_points,
          global_category
        ),
        events!inner (
          id,
          fiestas!inner (
            id,
            name
          )
        )
      `)
      .in('event_id', eventIds);

    // Similar lógica que fetchGlobalMetrics pero filtrada por fiesta
    const ambassadorSet = new Set();
    const ambassadorMap = new Map();
    
    tasks?.forEach(task => {
      const ambassador = task.embassadors;
      if (ambassador) {
        ambassadorSet.add(ambassador.id);
        
        const key = ambassador.id;
        if (!ambassadorMap.has(key)) {
          ambassadorMap.set(key, {
            id: ambassador.id,
            name: `${ambassador.first_name} ${ambassador.last_name}`,
            instagram_user: ambassador.instagram_user,
            points: ambassador.global_points || 0,
            tasks_completed: 0,
            category: ambassador.global_category || 'bronze'
          });
        }
        
        if (task.status === 'completed') {
          ambassadorMap.get(key).tasks_completed += 1;
        }
      }
    });

    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
    const invalidTasks = tasks?.filter(t => t.status === 'invalid').length || 0;
    const pendingTasks = tasks?.filter(t => t.status === 'pending').length || 0;
    const totalReach = tasks?.reduce((sum, t) => sum + (t.reach_count || 0), 0) || 0;
    const avgEngagement = tasks?.length > 0 
      ? tasks.reduce((sum, t) => sum + (t.engagement_score || 0), 0) / tasks.length 
      : 0;

    const metricsData: FiestaMetrics = {
      total_ambassadors: ambassadorSet.size,
      active_ambassadors: ambassadorSet.size,
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      invalid_tasks: invalidTasks,
      pending_tasks: pendingTasks,
      total_reach: totalReach,
      avg_engagement: Number(avgEngagement.toFixed(1)),
      completion_rate: totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(1)) : 0,
      top_ambassadors: Array.from(ambassadorMap.values())
        .sort((a, b) => b.points - a.points)
        .slice(0, 5),
      recent_tasks: tasks?.slice(0, 10).map(task => ({
        id: task.id,
        task_type: task.task_type,
        status: task.status,
        created_at: task.created_at,
        ambassador_name: `${task.embassadors.first_name} ${task.embassadors.last_name}`,
        fiesta_name: task.events?.fiestas?.name || 'Sin fiesta'
      })) || []
    };

    setMetrics(metricsData);
  };

  return {
    metrics,
    loading,
    refreshMetrics: fetchMetrics
  };
}