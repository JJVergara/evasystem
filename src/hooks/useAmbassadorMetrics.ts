
import { useState, useEffect, useCallback } from "react";
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
  story_insights?: {
    total_stories: number;
    total_reach: number;
    total_impressions: number;
    total_engagement: number; // replies + shares
    avg_reach_per_story: number;
    avg_impressions_per_story: number;
    total_replies: number;
    total_shares: number;
  };
  insights_error?: boolean; // Flag to indicate if insights failed to load
}

export function useAmbassadorMetrics(ambassadorId?: string) {
  const [metrics, setMetrics] = useState<AmbassadorMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAmbassadorMetrics = useCallback(async () => {
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

      // Fetch story insights for this ambassador (wrapped in try-catch to not break main flow)
      let storyInsights: AmbassadorMetrics['story_insights'] = undefined;
      let insightsErrorFlag = false;

      try {
        // First get social mentions for this ambassador
        const { data: socialMentions, error: mentionsError } = await supabase
          .from('social_mentions')
          .select('id, instagram_story_id')
          .eq('matched_ambassador_id', ambassadorId)
          .eq('mention_type', 'story_referral');

        if (mentionsError) {
          insightsErrorFlag = true;
          console.warn('Error fetching social mentions for story insights:', mentionsError);
        } else if (socialMentions && socialMentions.length > 0) {
          // Then fetch story insights for those mentions
          const mentionIds = socialMentions.map(m => m.id);
          
          // Use type assertion since story_insights_snapshots may not be in generated types yet
          // We'll cast to any to bypass type checking for this table
          interface StoryInsightSnapshot {
            id: string;
            social_mention_id: string;
            reach: number;
            impressions: number;
            replies: number;
            shares: number;
            snapshot_at: string;
          }
          
          // Cast through unknown first to avoid type errors
          const { data: storyInsightsData, error: insightsError } = await (supabase as unknown as {
            from: (table: string) => {
              select: (columns: string) => {
                in: (column: string, values: string[]) => {
                  order: (column: string, options: { ascending: boolean }) => Promise<{
                    data: StoryInsightSnapshot[] | null;
                    error: Error | null;
                  }>;
                };
              };
            };
          })
            .from('story_insights_snapshots')
            .select(`
              id,
              social_mention_id,
              reach,
              impressions,
              replies,
              shares,
              snapshot_at
            `)
            .in('social_mention_id', mentionIds)
            .order('snapshot_at', { ascending: false });

          if (insightsError) {
            insightsErrorFlag = true;
            console.warn('Error fetching story insights:', insightsError);
          } else if (storyInsightsData && storyInsightsData.length > 0) {
            // Create a map of mention_id -> story_id
            const mentionToStoryMap = new Map<string, string>();
            socialMentions.forEach(mention => {
              if (mention.instagram_story_id) {
                mentionToStoryMap.set(mention.id, mention.instagram_story_id);
              }
            });

            // Group by story ID and get latest snapshot for each
            const storyMap = new Map<string, typeof storyInsightsData[0]>();
            
            storyInsightsData.forEach(snapshot => {
              const storyId = mentionToStoryMap.get(snapshot.social_mention_id) || snapshot.social_mention_id;
              if (!storyMap.has(storyId)) {
                storyMap.set(storyId, snapshot);
              } else {
                // Keep the latest snapshot
                const existing = storyMap.get(storyId)!;
                if (new Date(snapshot.snapshot_at) > new Date(existing.snapshot_at)) {
                  storyMap.set(storyId, snapshot);
                }
              }
            });

            // Aggregate metrics from latest snapshots
            const latestSnapshots = Array.from(storyMap.values());
            const totalReach = latestSnapshots.reduce((sum, s) => sum + (s.reach || 0), 0);
            const totalImpressions = latestSnapshots.reduce((sum, s) => sum + (s.impressions || 0), 0);
            const totalReplies = latestSnapshots.reduce((sum, s) => sum + (s.replies || 0), 0);
            const totalShares = latestSnapshots.reduce((sum, s) => sum + (s.shares || 0), 0);
            const totalEngagement = totalReplies + totalShares;
            const storyCount = latestSnapshots.length;

            storyInsights = {
              total_stories: storyCount,
              total_reach: totalReach,
              total_impressions: totalImpressions,
              total_engagement: totalEngagement,
              avg_reach_per_story: storyCount > 0 ? Math.round(totalReach / storyCount) : 0,
              avg_impressions_per_story: storyCount > 0 ? Math.round(totalImpressions / storyCount) : 0,
              total_replies: totalReplies,
              total_shares: totalShares
            };
          }
        }
      } catch (insightsErr) {
        // Story insights failed but don't break the main metrics
        insightsErrorFlag = true;
        console.warn('Error processing story insights:', insightsErr);
      }

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
      // Map tasks to ensure events type is correct
      const tasksWithTypedEvents = (tasks || []).map(task => {
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
          events: typedEvents
        };
      });
      const recentActivities = generateRecentActivities(tasksWithTypedEvents, ambassador);

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
        recent_activities: recentActivities,
        story_insights: storyInsights,
        insights_error: insightsErrorFlag
      };

      setMetrics(metricsData);

    } catch (err) {
      console.error('Error fetching ambassador metrics:', err);
       toast.error('Error al cargar métricas');
    } finally {
      setLoading(false);
    }
    // generateRecentActivities is a pure function, doesn't need to be in deps
  }, [ambassadorId]);

  useEffect(() => {
    if (ambassadorId) {
      fetchAmbassadorMetrics();
    }
  }, [ambassadorId, fetchAmbassadorMetrics]);

  const generateMonthlyPerformance = (tasks: Array<{
    created_at: string;
    points_earned?: number;
    reach_count?: number;
  }>) => {
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

  const generateRecentActivities = (tasks: Array<{
    created_at: string;
    task_type: string;
    points_earned?: number;
    status: string;
    events?: { name: string } | null;
  }>, ambassador: {
    first_name: string;
    last_name: string;
  }) => {
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
