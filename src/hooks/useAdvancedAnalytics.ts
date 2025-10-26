
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrganization } from "./useCurrentOrganization";
import { toast } from "sonner";

interface AnalyticsData {
  summary: {
    total_reach: number;
    total_mentions: number;
    total_social_mentions: number;
    unassigned_mentions: number;
    completion_rate: number;
    active_ambassadors: number;
    events_completed: number;
    average_engagement: number;
  };
  performance_distribution: Array<{
    category: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  social_mention_types: Array<{
    type: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  event_comparison: Array<{
    name: string;
    completed: number;
    pending: number;
    failed: number;
    total_reach: number;
  }>;
  top_ambassadors: Array<{
    id: string;
    name: string;
    instagram_user: string;
    total_points: number;
    events_participated: number;
    category: string;
    completion_rate: number;
    total_reach: number;
    social_mentions_count: number;
  }>;
  trends: Array<{
    date: string;
    reach: number;
    mentions: number;
    social_mentions: number;
    engagement: number;
  }>;
}

export function useAdvancedAnalytics(selectedFiestaId?: string | null, selectedEvent?: string, selectedPeriod?: string) {
  const { organization } = useCurrentOrganization();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organization?.id) {
      fetchAnalyticsData();
    }
  }, [organization?.id, selectedFiestaId, selectedEvent, selectedPeriod]);

  const fetchAnalyticsData = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch summary metrics
      const summaryData = await fetchSummaryMetrics();
      
      // Fetch social mentions distribution
      const socialMentionsData = await fetchSocialMentionsDistribution();
      
      // Fetch performance distribution
      const performanceData = await fetchPerformanceDistribution();
      
      // Fetch event comparison - only if fiesta is selected
      const eventData = selectedFiestaId ? await fetchEventComparison() : [];
      
      // Fetch top ambassadors
      const ambassadorsData = await fetchTopAmbassadors();
      
      // Generate trends (últimos 30 días)
      const trendsData = await fetchTrends();

      setAnalyticsData({
        summary: summaryData,
        performance_distribution: performanceData,
        social_mention_types: socialMentionsData,
        event_comparison: eventData,
        top_ambassadors: ambassadorsData,
        trends: trendsData
      });

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Error al cargar datos analíticos');
      toast.error('Error al cargar analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaryMetrics = async () => {
    // Fetch active ambassadors count
    const { count: activeAmbassadors } = await supabase
      .from('embassadors')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization!.id)
      .eq('status', 'active');

    // Fetch ambassadors with task data
    const { data: ambassadors } = await supabase
      .from('embassadors')
      .select('id, completed_tasks, failed_tasks')
      .eq('organization_id', organization!.id);

    // Calculate task metrics from ambassador data
    const totalCompleted = ambassadors?.reduce((sum, amb) => sum + (amb.completed_tasks || 0), 0) || 0;
    const totalFailed = ambassadors?.reduce((sum, amb) => sum + (amb.failed_tasks || 0), 0) || 0;
    const totalTasks = totalCompleted + totalFailed;
    
    // For reach, we'll use a simple query without complex joins
    const { data: tasks } = await supabase
      .from('tasks')
      .select('reach_count, engagement_score, embassador_id')
      .in('embassador_id', ambassadors?.map(a => a.id) || []);

    // Fetch social mentions data
    const { data: socialMentions } = await supabase
      .from('social_mentions')
      .select('reach_count, engagement_score, matched_ambassador_id')
      .eq('organization_id', organization!.id);

    const totalReach = (tasks?.reduce((sum, t) => sum + (t.reach_count || 0), 0) || 0) +
                      (socialMentions?.reduce((sum, t) => sum + (t.reach_count || 0), 0) || 0);
    const totalEngagement = (tasks?.reduce((sum, t) => sum + (t.engagement_score || 0), 0) || 0) +
                           (socialMentions?.reduce((sum, t) => sum + (t.engagement_score || 0), 0) || 0);
    const totalEngagementCount = (tasks?.length || 0) + (socialMentions?.length || 0);
    
    const totalSocialMentions = socialMentions?.length || 0;
    const unassignedMentions = socialMentions?.filter(m => !m.matched_ambassador_id).length || 0;
    
    // Fetch completed fiestas
    const { count: completedEvents } = await supabase
      .from('fiestas')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization!.id)
      .eq('status', 'completed');

    return {
      total_reach: totalReach,
      total_mentions: totalTasks,
      total_social_mentions: totalSocialMentions,
      unassigned_mentions: unassignedMentions,
      completion_rate: totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0,
      active_ambassadors: activeAmbassadors || 0,
      events_completed: completedEvents || 0,
      average_engagement: totalEngagementCount > 0 ? Number((totalEngagement / totalEngagementCount).toFixed(1)) : 0
    };
  };

  const fetchSocialMentionsDistribution = async () => {
    const { data: socialMentions } = await supabase
      .from('social_mentions')
      .select('mention_type')
      .eq('organization_id', organization!.id);

    const distribution = {
      story: 0,
      mention: 0,
      hashtag: 0,
      comment: 0
    };

    socialMentions?.forEach(mention => {
      const type = mention.mention_type || 'mention';
      if (type in distribution) {
        distribution[type as keyof typeof distribution]++;
      }
    });

    const total = socialMentions?.length || 1;
    
    return [
      {
        type: "Historias",
        count: distribution.story,
        percentage: Math.round((distribution.story / total) * 100),
        color: "#8b5cf6"
      },
      {
        type: "Menciones",
        count: distribution.mention,
        percentage: Math.round((distribution.mention / total) * 100),
        color: "#06b6d4"
      },
      {
        type: "Hashtags",
        count: distribution.hashtag,
        percentage: Math.round((distribution.hashtag / total) * 100),
        color: "#10b981"
      },
      {
        type: "Comentarios",
        count: distribution.comment,
        percentage: Math.round((distribution.comment / total) * 100),
        color: "#f59e0b"
      }
    ];
  };

  const fetchPerformanceDistribution = async () => {
    const { data: ambassadors } = await supabase
      .from('embassadors')
      .select('performance_status')
      .eq('organization_id', organization!.id)
      .eq('status', 'active');

    const distribution = {
      cumple: 0,
      advertencia: 0,
      no_cumple: 0,
      exclusivo: 0
    };

    ambassadors?.forEach(amb => {
      const status = amb.performance_status || 'cumple';
      if (status in distribution) {
        distribution[status as keyof typeof distribution]++;
      }
    });

    const total = ambassadors?.length || 1;
    
    return [
      {
        category: "Cumple",
        count: distribution.cumple,
        percentage: Math.round((distribution.cumple / total) * 100),
        color: "#10b981"
      },
      {
        category: "Advertencia",
        count: distribution.advertencia,
        percentage: Math.round((distribution.advertencia / total) * 100),
        color: "#f59e0b"
      },
      {
        category: "No Cumple",
        count: distribution.no_cumple,
        percentage: Math.round((distribution.no_cumple / total) * 100),
        color: "#ef4444"
      },
      {
        category: "Exclusivo",
        count: distribution.exclusivo,
        percentage: Math.round((distribution.exclusivo / total) * 100),
        color: "#8b5cf6"
      }
    ];
  };

  const fetchEventComparison = async () => {
    if (!selectedFiestaId) return [];

    // Get events for the selected fiesta
    const { data: events } = await supabase
      .from('events')
      .select('id')
      .eq('fiesta_id', selectedFiestaId);

    if (!events || events.length === 0) return [];

    // For each event, get task statistics
    const eventComparison = [];
    for (const event of events.slice(0, 4)) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('status, reach_count')
        .eq('event_id', event.id);

      const completed = tasks?.filter(t => t.status === 'completed').length || 0;
      const pending = tasks?.filter(t => ['pending', 'uploaded', 'in_progress'].includes(t.status)).length || 0;
      const failed = tasks?.filter(t => ['invalid', 'expired'].includes(t.status)).length || 0;
      const totalReach = tasks?.reduce((sum, t) => sum + (t.reach_count || 0), 0) || 0;

      eventComparison.push({
        name: `Evento ${event.id.slice(0, 8)}`,
        completed,
        pending,
        failed,
        total_reach: totalReach
      });
    }

    return eventComparison;
  };

  const fetchTopAmbassadors = async () => {
    const { data: ambassadors } = await supabase
      .from('embassadors')
      .select('id, first_name, last_name, instagram_user, global_points, events_participated, global_category, completed_tasks, failed_tasks')
      .eq('organization_id', organization!.id)
      .eq('status', 'active')
      .order('global_points', { ascending: false })
      .limit(25);

    // For each ambassador, get their reach data and social mentions separately to avoid complex joins
    const ambassadorsWithReach = await Promise.all(
      (ambassadors || []).map(async (amb) => {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('reach_count')
          .eq('embassador_id', amb.id);

        // Get social mentions count for this ambassador
        const { count: socialMentionsCount } = await supabase
          .from('social_mentions')
          .select('*', { count: 'exact', head: true })
          .eq('matched_ambassador_id', amb.id);

        const totalReach = tasks?.reduce((sum, t) => sum + (t.reach_count || 0), 0) || 0;
        const totalTasks = (amb.completed_tasks || 0) + (amb.failed_tasks || 0);
        
        return {
          id: amb.id,
          name: `${amb.first_name} ${amb.last_name}`,
          instagram_user: amb.instagram_user,
          total_points: amb.global_points || 0,
          events_participated: amb.events_participated || 0,
          category: amb.global_category || 'bronze',
          completion_rate: totalTasks > 0 ? Math.round(((amb.completed_tasks || 0) / totalTasks) * 100) : 0,
          total_reach: totalReach,
          social_mentions_count: socialMentionsCount || 0
        };
      })
    );

    return ambassadorsWithReach;
  };

  const fetchTrends = async () => {
    // Generate last 30 days
    const trends = [];
    const now = new Date();
    
    // Get all ambassadors for this organization first
    const { data: ambassadors } = await supabase
      .from('embassadors')
      .select('id')
      .eq('organization_id', organization!.id);

    const ambassadorIds = ambassadors?.map(a => a.id) || [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Fetch tasks created on this date for our ambassadors
      const { data: dailyTasks } = await supabase
        .from('tasks')
        .select('reach_count, engagement_score')
        .in('embassador_id', ambassadorIds)
        .gte('created_at', `${dateStr}T00:00:00`)
        .lt('created_at', `${dateStr}T23:59:59`);

      // Fetch social mentions created on this date
      const { data: dailySocialMentions } = await supabase
        .from('social_mentions')
        .select('reach_count, engagement_score')
        .eq('organization_id', organization!.id)
        .gte('created_at', `${dateStr}T00:00:00`)
        .lt('created_at', `${dateStr}T23:59:59`);

      const dailyReach = (dailyTasks?.reduce((sum, t) => sum + (t.reach_count || 0), 0) || 0) +
                        (dailySocialMentions?.reduce((sum, t) => sum + (t.reach_count || 0), 0) || 0);
      const dailyMentions = dailyTasks?.length || 0;
      const dailySocialMentionsCount = dailySocialMentions?.length || 0;
      const allDailyItems = [...(dailyTasks || []), ...(dailySocialMentions || [])];
      const dailyEngagement = allDailyItems.length > 0 
        ? allDailyItems.reduce((sum, t) => sum + (t.engagement_score || 0), 0) / allDailyItems.length 
        : 0;

      trends.push({
        date: dateStr,
        reach: dailyReach,
        mentions: dailyMentions,
        social_mentions: dailySocialMentionsCount,
        engagement: Number(dailyEngagement.toFixed(1))
      });
    }
    
    return trends;
  };

  return {
    analyticsData,
    loading,
    error,
    refreshAnalytics: fetchAnalyticsData
  };
}
