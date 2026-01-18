import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  story_insights?: {
    total_stories: number;
    total_reach: number;
    total_impressions: number;
    total_engagement: number;
    avg_reach_per_story: number;
    avg_impressions_per_story: number;
    total_replies: number;
    total_shares: number;
  };
  insights_error?: boolean;
}

function getTaskTypeLabel(type: string) {
  const labels: Record<string, string> = {
    story: 'Historia',
    post: 'Publicacion',
    mention: 'Mencion',
    hashtag: 'Hashtag',
  };
  return labels[type] || type;
}

function generateMonthlyPerformance(
  tasks: Array<{
    created_at: string;
    points_earned?: number;
    reach_count?: number;
  }>
) {
  const monthlyData = new Map();
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = date.toISOString().slice(0, 7);
    monthlyData.set(key, {
      month: date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
      points: 0,
      tasks: 0,
      reach: 0,
    });
  }

  tasks.forEach((task) => {
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
}

function generateRecentActivities(
  tasks: Array<{
    created_at: string;
    task_type: string;
    points_earned?: number;
    status: string;
    events?: { name: string } | null;
  }>
) {
  const activities: Array<{
    date: string;
    type: string;
    description: string;
    points?: number;
    status?: string;
  }> = [];

  tasks.slice(0, 10).forEach((task) => {
    activities.push({
      date: task.created_at,
      type: getTaskTypeLabel(task.task_type),
      description: `${getTaskTypeLabel(task.task_type)} para evento ${task.events?.name || 'N/A'}`,
      points: task.points_earned,
      status: task.status,
    });
  });

  return [...activities]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);
}

async function fetchAmbassadorMetricsData(ambassadorId: string): Promise<AmbassadorMetrics> {
  const { data: ambassador, error: ambassadorError } = await supabase
    .from('embassadors')
    .select(
      'id, first_name, last_name, email, instagram_user, instagram_user_id, follower_count, profile_picture_url, date_of_birth, rut, global_points, global_category, performance_status, events_participated, completed_tasks, failed_tasks, organization_id, created_by_user_id, status, profile_public, last_instagram_sync, created_at'
    )
    .eq('id', ambassadorId)
    .single();

  if (ambassadorError) throw ambassadorError;

  const [tasksResult, socialMentionsResult] = await Promise.all([
    supabase
      .from('tasks')
      .select(
        `
        id,
        status,
        points_earned,
        reach_count,
        engagement_score,
        created_at,
        task_type,
        events (name)
      `
      )
      .eq('embassador_id', ambassadorId),
    supabase
      .from('social_mentions')
      .select('id, instagram_story_id')
      .eq('matched_ambassador_id', ambassadorId)
      .eq('mention_type', 'story_referral'),
  ]);

  const tasks = tasksResult.data;

  let storyInsights: AmbassadorMetrics['story_insights'] = undefined;
  let insightsErrorFlag = false;

  try {
    const { data: socialMentions, error: mentionsError } = socialMentionsResult;

    if (mentionsError) {
      insightsErrorFlag = true;
    } else if (socialMentions && socialMentions.length > 0) {
      const mentionIds = socialMentions.map((m) => m.id);

      interface StoryInsightSnapshot {
        id: string;
        social_mention_id: string;
        reach: number;
        impressions: number;
        replies: number;
        shares: number;
        snapshot_at: string;
      }

      const { data: storyInsightsData, error: insightsError } = await (
        supabase as unknown as {
          from: (table: string) => {
            select: (columns: string) => {
              in: (
                column: string,
                values: string[]
              ) => {
                order: (
                  column: string,
                  options: { ascending: boolean }
                ) => Promise<{
                  data: StoryInsightSnapshot[] | null;
                  error: Error | null;
                }>;
              };
            };
          };
        }
      )
        .from('story_insights_snapshots')
        .select(
          `
          id,
          social_mention_id,
          reach,
          impressions,
          replies,
          shares,
          snapshot_at
        `
        )
        .in('social_mention_id', mentionIds)
        .order('snapshot_at', { ascending: false });

      if (insightsError) {
        insightsErrorFlag = true;
      } else if (storyInsightsData && storyInsightsData.length > 0) {
        const mentionToStoryMap = new Map<string, string>();
        socialMentions.forEach((mention) => {
          if (mention.instagram_story_id) {
            mentionToStoryMap.set(mention.id, mention.instagram_story_id);
          }
        });

        const storyMap = new Map<string, (typeof storyInsightsData)[0]>();

        storyInsightsData.forEach((snapshot) => {
          const storyId =
            mentionToStoryMap.get(snapshot.social_mention_id) || snapshot.social_mention_id;
          if (!storyMap.has(storyId)) {
            storyMap.set(storyId, snapshot);
          } else {
            const existing = storyMap.get(storyId)!;
            if (new Date(snapshot.snapshot_at) > new Date(existing.snapshot_at)) {
              storyMap.set(storyId, snapshot);
            }
          }
        });

        const latestSnapshots = Array.from(storyMap.values());
        const insightsTotals = latestSnapshots.reduce(
          (acc, s) => {
            acc.reach += s.reach || 0;
            acc.impressions += s.impressions || 0;
            acc.replies += s.replies || 0;
            acc.shares += s.shares || 0;
            return acc;
          },
          { reach: 0, impressions: 0, replies: 0, shares: 0 }
        );
        const storyCount = latestSnapshots.length;

        storyInsights = {
          total_stories: storyCount,
          total_reach: insightsTotals.reach,
          total_impressions: insightsTotals.impressions,
          total_engagement: insightsTotals.replies + insightsTotals.shares,
          avg_reach_per_story: storyCount > 0 ? Math.round(insightsTotals.reach / storyCount) : 0,
          avg_impressions_per_story:
            storyCount > 0 ? Math.round(insightsTotals.impressions / storyCount) : 0,
          total_replies: insightsTotals.replies,
          total_shares: insightsTotals.shares,
        };
      }
    }
  } catch {
    insightsErrorFlag = true;
  }

  const tasksTotals = (tasks || []).reduce(
    (acc, t) => {
      acc.reach += t.reach_count || 0;
      acc.engagement += t.engagement_score || 0;
      return acc;
    },
    { reach: 0, engagement: 0 }
  );
  const totalReach = tasksTotals.reach;
  const avgEngagement = tasks?.length > 0 ? tasksTotals.engagement / tasks.length : 0;
  const completionRate =
    ambassador.completed_tasks + ambassador.failed_tasks > 0
      ? (ambassador.completed_tasks / (ambassador.completed_tasks + ambassador.failed_tasks)) * 100
      : 0;

  const monthlyPerformance = generateMonthlyPerformance(tasks || []);

  const tasksWithTypedEvents = (tasks || []).map((task) => {
    const taskEvents = task.events;
    let typedEvents: { name: string } | null = null;

    if (taskEvents && typeof taskEvents === 'object' && !Array.isArray(taskEvents)) {
      const eventsObj = taskEvents as Record<string, unknown>;
      if ('name' in eventsObj) {
        typedEvents = { name: String(eventsObj.name || 'N/A') };
      }
    }

    return {
      ...task,
      events: typedEvents,
    };
  });
  const recentActivities = generateRecentActivities(tasksWithTypedEvents);

  const lastActivity =
    tasks?.length > 0
      ? tasks.reduce((latest, task) => {
          const taskTime = new Date(task.created_at).getTime();
          const latestTime = new Date(latest.created_at).getTime();
          return taskTime > latestTime ? task : latest;
        }, tasks[0]).created_at
      : null;

  return {
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
    recent_activities: recentActivities,
    story_insights: storyInsights,
    insights_error: insightsErrorFlag,
  };
}

export function useAmbassadorMetrics(ambassadorId?: string) {
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => ['ambassadorMetrics', ambassadorId], [ambassadorId]);

  const {
    data: metrics,
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => fetchAmbassadorMetricsData(ambassadorId!),
    enabled: !!ambassadorId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const refreshMetrics = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    metrics: metrics || null,
    loading: isLoading,
    error: error ? 'Error al cargar metricas' : null,
    refreshMetrics,
  };
}
