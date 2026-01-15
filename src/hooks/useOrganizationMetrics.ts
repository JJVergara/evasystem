import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OrganizationMetrics {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  total_events: number;
  active_events: number;
  total_ambassadors: number;
  active_ambassadors: number;
  total_tasks: number;
  completed_tasks: number;
  total_reach: number;
  avg_engagement: number;
  completion_rate: number;
  instagram_username: string | null;
  last_instagram_sync: string | null;
  top_ambassadors: Array<{
    id: string;
    name: string;
    instagram_user: string;
    points: number;
    tasks_completed: number;
    performance_status: string;
  }>;
  recent_events: Array<{
    id: string;
    name: string;
    event_date: string;
    total_tasks: number;
    completed_tasks: number;
    total_reach: number;
  }>;
  monthly_performance: Array<{
    month: string;
    events: number;
    tasks: number;
    reach: number;
    ambassadors: number;
  }>;
}

interface EventData {
  event_date: string;
}

interface TaskData {
  created_at: string;
  reach_count?: number;
  embassador_id: string;
}

function generateMonthlyPerformance(events: EventData[], tasks: TaskData[]) {
  const monthlyData = new Map();
  const now = new Date();

  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = date.toISOString().slice(0, 7); // YYYY-MM format
    monthlyData.set(key, {
      month: date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
      events: 0,
      tasks: 0,
      reach: 0,
      ambassadors: 0
    });
  }

  // Populate with events data
  events.forEach(event => {
    const eventDate = new Date(event.event_date);
    const key = eventDate.toISOString().slice(0, 7);

    if (monthlyData.has(key)) {
      monthlyData.get(key).events += 1;
    }
  });

  // Populate with tasks data
  tasks.forEach(task => {
    const taskDate = new Date(task.created_at);
    const key = taskDate.toISOString().slice(0, 7);

    if (monthlyData.has(key)) {
      const monthData = monthlyData.get(key);
      monthData.tasks += 1;
      monthData.reach += task.reach_count || 0;
    }
  });

  // Populate with ambassador data (count unique ambassadors per month)
  const monthlyAmbassadors = new Map();
  tasks.forEach(task => {
    const taskDate = new Date(task.created_at);
    const key = taskDate.toISOString().slice(0, 7);

    if (monthlyData.has(key)) {
      if (!monthlyAmbassadors.has(key)) {
        monthlyAmbassadors.set(key, new Set());
      }
      monthlyAmbassadors.get(key).add(task.embassador_id);
    }
  });

  // Update ambassador counts
  monthlyAmbassadors.forEach((ambassadorSet, key) => {
    if (monthlyData.has(key)) {
      monthlyData.get(key).ambassadors = ambassadorSet.size;
    }
  });

  return Array.from(monthlyData.values());
}

async function fetchOrganizationMetricsData(organizationId: string): Promise<OrganizationMetrics> {
  // Fetch organization basic info
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, description, timezone, logo_url, plan_type, instagram_username, facebook_page_id, instagram_business_account_id, instagram_user_id, last_instagram_sync, created_by, created_at')
    .eq('id', organizationId)
    .single();

  if (orgError) throw orgError;

  // Fetch fiestas for this organization
  const { data: fiestas } = await supabase
    .from('fiestas')
    .select('id, organization_id, name, description, location, event_date, main_hashtag, secondary_hashtags, status, created_at, updated_at')
    .eq('organization_id', organizationId);

  // Get events for this organization
  const { data: events } = await supabase
    .from('events')
    .select('id, fiesta_id, event_date, end_date, start_date, active, created_at, created_by_user_id')
    .in('fiesta_id', fiestas?.map(f => f.id) || []);

  // Fetch ambassadors for this organization
  const { data: ambassadors } = await supabase
    .from('embassadors')
    .select('id, first_name, last_name, email, instagram_user, instagram_user_id, follower_count, global_points, global_category, performance_status, events_participated, completed_tasks, failed_tasks, organization_id, status, created_at')
    .eq('organization_id', organizationId);

  // Fetch tasks for this organization's ambassadors
  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      id,
      status,
      points_earned,
      reach_count,
      engagement_score,
      created_at,
      embassador_id,
      event_id,
      embassadors!inner (first_name, last_name, instagram_user, global_points, performance_status)
    `)
    .in('embassador_id', ambassadors?.map(a => a.id) || []);

  // Calculate metrics
  const totalReach = tasks?.reduce((sum, t) => sum + (t.reach_count || 0), 0) || 0;
  const avgEngagement = tasks?.length
    ? tasks.reduce((sum, t) => sum + (t.engagement_score || 0), 0) / tasks.length
    : 0;

  const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
  const totalTasks = tasks?.length || 0;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Generate top ambassadors
  const ambassadorMap = new Map();
  tasks?.forEach(task => {
    const ambassador = task.embassadors;
    if (ambassador) {
      const key = ambassador.instagram_user;
      if (!ambassadorMap.has(key)) {
        ambassadorMap.set(key, {
          id: task.embassador_id,
          name: `${ambassador.first_name} ${ambassador.last_name}`,
          instagram_user: ambassador.instagram_user,
          points: ambassador.global_points || 0,
          tasks_completed: 0,
          performance_status: ambassador.performance_status || 'cumple'
        });
      }
      if (task.status === 'completed') {
        ambassadorMap.get(key).tasks_completed += 1;
      }
    }
  });

  const topAmbassadors = Array.from(ambassadorMap.values())
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

  // Generate recent fiestas with metrics
  const recentEvents = fiestas?.slice(0, 5).map(fiesta => {
    const fiestaEvents = events?.filter(e => e.fiesta_id === fiesta.id) || [];
    const eventIds = fiestaEvents.map(e => e.id);
    const fiestaTasksFiltered = tasks?.filter(t => eventIds.includes(t.event_id)) || [];
    const fiestaCompletedTasks = fiestaTasksFiltered.filter(t => t.status === 'completed').length;
    const fiestaReach = fiestaTasksFiltered.reduce((sum, t) => sum + (t.reach_count || 0), 0);

    return {
      id: fiesta.id,
      name: fiesta.name,
      event_date: fiesta.event_date || fiesta.created_at,
      total_tasks: fiestaTasksFiltered.length,
      completed_tasks: fiestaCompletedTasks,
      total_reach: fiestaReach
    };
  }) || [];

  // Generate monthly performance (last 6 months)
  const monthlyPerformance = generateMonthlyPerformance(events || [], tasks || []);

  return {
    id: organization.id,
    name: organization.name,
    description: organization.description,
    created_at: organization.created_at,
    total_events: fiestas?.length || 0,
    active_events: fiestas?.filter(f => f.status === 'active').length || 0,
    total_ambassadors: ambassadors?.length || 0,
    active_ambassadors: ambassadors?.filter(a => a.status === 'active').length || 0,
    total_tasks: totalTasks,
    completed_tasks: completedTasks,
    total_reach: totalReach,
    avg_engagement: Number(avgEngagement.toFixed(1)),
    completion_rate: Number(completionRate.toFixed(1)),
    instagram_username: organization.instagram_username,
    last_instagram_sync: organization.last_instagram_sync,
    top_ambassadors: topAmbassadors,
    recent_events: recentEvents,
    monthly_performance: monthlyPerformance
  };
}

export function useOrganizationMetrics(organizationId?: string) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['organizationMetrics', organizationId], [organizationId]);

  const { data: metrics, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchOrganizationMetricsData(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes cache
  });

  const refreshMetrics = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    metrics: metrics || null,
    loading: isLoading,
    error: error ? 'Error al cargar métricas de la organización' : null,
    refreshMetrics
  };
}
