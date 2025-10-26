
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AmbassadorMetrics {
  id: string;
  name: string;
  instagram_user: string;
  email: string;
  status: string;
  global_points: number;
  global_category: string;
  performance_status: string;
  events_participated: number;
  completed_tasks: number;
  failed_tasks: number;
  follower_count: number;
  total_reach: number;
  avg_engagement: number;
  completion_rate: number;
  last_activity: string | null;
  monthly_performance: Array<{
    month: string;
    points: number;
    tasks: number;
    reach: number;
  }>;
  recent_activities: Array<{
    date: string;
    type: string;
    description: string;
    points?: number;
    status?: string;
  }>;
}

export function useAmbassadorMetrics(ambassadorId?: string) {
  const [metrics, setMetrics] = useState<AmbassadorMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ambassadorId) {
      fetchAmbassadorMetrics();
    }
  }, [ambassadorId]);

  const fetchAmbassadorMetrics = async () => {
    if (!ambassadorId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch ambassador basic info and stats
      const { data: ambassador, error: ambassadorError } = await supabase
        .from('embassadors')
        .select('id, first_name, last_name, email, instagram_user, instagram_user_id, follower_count, profile_picture_url, date_of_birth, rut, global_points, global_category, performance_status, events_participated, completed_tasks, failed_tasks, organization_id, created_by_user_id, status, profile_public, last_instagram_sync, created_at')
        .eq('id', ambassadorId)
        .single();

      if (ambassadorError) throw ambassadorError;

      // Fetch tasks for this ambassador
      const { data: tasks } = await supabase
        .from('tasks')
        .select(`
          id,
          status,
          points_earned,
          reach_count,
          engagement_score,
          created_at,
          task_type,
          events (name)
        `)
        .eq('embassador_id', ambassadorId);

      // Calculate metrics
      const totalReach = tasks?.reduce((sum, t) => sum + (t.reach_count || 0), 0) || 0;
      const avgEngagement = tasks?.length > 0 
        ? tasks.reduce((sum, t) => sum + (t.engagement_score || 0), 0) / tasks.length 
        : 0;
      const completionRate = ambassador.completed_tasks + ambassador.failed_tasks > 0
        ? (ambassador.completed_tasks / (ambassador.completed_tasks + ambassador.failed_tasks)) * 100
        : 0;

      // Generate monthly performance (last 6 months)
      const monthlyPerformance = generateMonthlyPerformance(tasks || []);

      // Generate recent activities
      const recentActivities = generateRecentActivities(tasks || [], ambassador);

      // Find last activity
      const lastActivity = tasks?.length > 0 
        ? tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : null;

      const metricsData: AmbassadorMetrics = {
        id: ambassador.id,
        name: `${ambassador.first_name} ${ambassador.last_name}`,
        instagram_user: ambassador.instagram_user,
        email: ambassador.email,
        status: ambassador.status,
        global_points: ambassador.global_points || 0,
        global_category: ambassador.global_category || 'bronze',
        performance_status: ambassador.performance_status || 'cumple',
        events_participated: ambassador.events_participated || 0,
        completed_tasks: ambassador.completed_tasks || 0,
        failed_tasks: ambassador.failed_tasks || 0,
        follower_count: ambassador.follower_count || 0,
        total_reach: totalReach,
        avg_engagement: Number(avgEngagement.toFixed(1)),
        completion_rate: Number(completionRate.toFixed(1)),
        last_activity: lastActivity,
        monthly_performance: monthlyPerformance,
        recent_activities: recentActivities
      };

      setMetrics(metricsData);

    } catch (err) {
      console.error('Error fetching ambassador metrics:', err);
      setError('Error al cargar métricas del embajador');
      toast.error('Error al cargar métricas');
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyPerformance = (tasks: any[]) => {
    const monthlyData = new Map();
    const now = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toISOString().slice(0, 7); // YYYY-MM format
      monthlyData.set(key, { 
        month: date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
        points: 0,
        tasks: 0,
        reach: 0
      });
    }

    // Populate with task data
    tasks.forEach(task => {
      const taskDate = new Date(task.created_at);
      const key = taskDate.toISOString().slice(0, 7);
      
      if (monthlyData.has(key)) {
        const monthData = monthlyData.get(key);
        monthData.points += task.points_earned || 0;
        monthData.tasks += 1;
        monthData.reach += task.reach_count || 0;
      }
    });

    return Array.from(monthlyData.values());
  };

  const generateRecentActivities = (tasks: any[], ambassador: any) => {
    const activities = [];

    // Add task activities
    tasks.slice(0, 10).forEach(task => {
      activities.push({
        date: task.created_at,
        type: getTaskTypeLabel(task.task_type),
        description: `${getTaskTypeLabel(task.task_type)} para evento ${task.events?.name || 'N/A'}`,
        points: task.points_earned,
        status: task.status
      });
    });

    // Sort by date (most recent first)
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return activities.slice(0, 10);
  };

  const getTaskTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'story': 'Historia',
      'post': 'Publicación',
      'mention': 'Mención',
      'hashtag': 'Hashtag'
    };
    return labels[type] || type;
  };

  return {
    metrics,
    loading,
    error,
    refreshMetrics: fetchAmbassadorMetrics
  };
}
