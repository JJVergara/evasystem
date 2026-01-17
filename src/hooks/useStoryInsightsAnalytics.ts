import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrganization } from './useCurrentOrganization';

interface StoryInsightsSnapshotRow {
  id: string;
  instagram_story_id: string;
  snapshot_at: string;
  story_age_hours: number | null;
  reach: number;
  views: number;
  profile_visits: number;
  total_interactions: number;
  shares: number;
  replies: number;
  navigation: Record<string, number>;
  organization_id: string;
}

export interface StoryInsightsSummary {
  total_stories: number;
  total_reach: number;
  total_views: number;
  total_profile_visits: number;
  total_interactions: number;
  total_shares: number;
  total_replies: number;
  avg_reach_per_story: number;
  avg_views_per_story: number;
}

export interface StorySnapshot {
  id: string;
  instagram_story_id: string;
  snapshot_at: string;
  story_age_hours: number | null;
  reach: number;
  views: number;
  profile_visits: number;
  total_interactions: number;
  shares: number;
  replies: number;
  navigation: Record<string, number>;
}

export interface DailyStoryMetrics {
  date: string;
  stories_count: number;
  total_reach: number;
  total_views: number;
  total_profile_visits: number;
  total_interactions: number;
  avg_reach: number;
}

export interface StoryByHour {
  instagram_story_id: string;
  reach: number;
  views: number;
  created_at: Date;
}

export interface HourlyMetrics {
  hour: number;
  avg_reach: number;
  avg_views: number;
  stories_count: number;
  stories: StoryByHour[];
  [key: string]: number | string | StoryByHour[] | undefined;
}

export interface StoryInsightsData {
  summary: StoryInsightsSummary;
  recent_snapshots: StorySnapshot[];
  daily_metrics: DailyStoryMetrics[];
  metrics_by_hour: HourlyMetrics[];
  max_stories_per_hour: number;
}

function getPeriodDays(period: string): number {
  switch (period) {
    case '24h':
      return 1;
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    default:
      return 7;
  }
}

async function fetchStoryInsightsData(
  organizationId: string,
  selectedPeriod: string
): Promise<StoryInsightsData> {
  const days = getPeriodDays(selectedPeriod);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: snapshots, error: snapshotsError } = await (
    supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (
            column: string,
            value: string
          ) => {
            gte: (
              column: string,
              value: string
            ) => {
              order: (
                column: string,
                options: { ascending: boolean }
              ) => Promise<{
                data: StoryInsightsSnapshotRow[] | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
    }
  )
    .from('story_insights_snapshots')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('snapshot_at', startDate.toISOString())
    .order('snapshot_at', { ascending: false });

  if (snapshotsError) {
    throw new Error(snapshotsError.message);
  }

  const uniqueStories = new Map<string, StoryInsightsSnapshotRow>();
  for (const snapshot of snapshots || []) {
    if (!uniqueStories.has(snapshot.instagram_story_id)) {
      uniqueStories.set(snapshot.instagram_story_id, snapshot);
    }
  }

  const latestSnapshots = Array.from(uniqueStories.values());

  const totals = latestSnapshots.reduce(
    (acc, s) => {
      acc.reach += s.reach || 0;
      acc.views += s.views || 0;
      acc.profile_visits += s.profile_visits || 0;
      acc.interactions += s.total_interactions || 0;
      acc.shares += s.shares || 0;
      acc.replies += s.replies || 0;
      return acc;
    },
    { reach: 0, views: 0, profile_visits: 0, interactions: 0, shares: 0, replies: 0 }
  );

  const storyCount = latestSnapshots.length;
  const summary: StoryInsightsSummary = {
    total_stories: storyCount,
    total_reach: totals.reach,
    total_views: totals.views,
    total_profile_visits: totals.profile_visits,
    total_interactions: totals.interactions,
    total_shares: totals.shares,
    total_replies: totals.replies,
    avg_reach_per_story: storyCount > 0 ? Math.round(totals.reach / storyCount) : 0,
    avg_views_per_story: storyCount > 0 ? Math.round(totals.views / storyCount) : 0,
  };

  const dailyMap = new Map<
    string,
    {
      stories: Set<string>;
      reach: number;
      views: number;
      profile_visits: number;
      interactions: number;
    }
  >();

  for (const snapshot of snapshots || []) {
    const date = new Date(snapshot.snapshot_at).toISOString().split('T')[0];
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        stories: new Set(),
        reach: 0,
        views: 0,
        profile_visits: 0,
        interactions: 0,
      });
    }
    const day = dailyMap.get(date)!;
    if (!day.stories.has(snapshot.instagram_story_id)) {
      day.stories.add(snapshot.instagram_story_id);
      day.reach += snapshot.reach || 0;
      day.views += snapshot.views || 0;
      day.profile_visits += snapshot.profile_visits || 0;
      day.interactions += snapshot.total_interactions || 0;
    }
  }

  const daily_metrics: DailyStoryMetrics[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayData = dailyMap.get(dateStr);

    daily_metrics.push({
      date: dateStr,
      stories_count: dayData?.stories.size || 0,
      total_reach: dayData?.reach || 0,
      total_views: dayData?.views || 0,
      total_profile_visits: dayData?.profile_visits || 0,
      total_interactions: dayData?.interactions || 0,
      avg_reach:
        dayData && dayData.stories.size > 0 ? Math.round(dayData.reach / dayData.stories.size) : 0,
    });
  }

  const hourMap = new Map<
    number,
    {
      reach: number;
      views: number;
      stories: StoryByHour[];
    }
  >();

  for (const snapshot of latestSnapshots) {
    const snapshotDate = new Date(snapshot.snapshot_at);
    const storyAgeMs = snapshot.story_age_hours ? snapshot.story_age_hours * 60 * 60 * 1000 : 0;
    const storyCreatedAt = new Date(snapshotDate.getTime() - storyAgeMs);
    const hour = storyCreatedAt.getHours();

    if (!hourMap.has(hour)) {
      hourMap.set(hour, { reach: 0, views: 0, stories: [] });
    }
    const h = hourMap.get(hour)!;
    h.reach += snapshot.reach || 0;
    h.views += snapshot.views || 0;
    h.stories.push({
      instagram_story_id: snapshot.instagram_story_id,
      reach: snapshot.reach || 0,
      views: snapshot.views || 0,
      created_at: storyCreatedAt,
    });
  }

  let max_stories_per_hour = 0;
  for (const [, hourData] of hourMap) {
    if (hourData.stories.length > max_stories_per_hour) {
      max_stories_per_hour = hourData.stories.length;
    }
  }

  const metrics_by_hour: HourlyMetrics[] = Array.from({ length: 24 }, (_, hour) => {
    const data = hourMap.get(hour) || { reach: 0, views: 0, stories: [] };
    const count = data.stories.length;
    const sortedStories = [...data.stories].sort(
      (a, b) => a.created_at.getTime() - b.created_at.getTime()
    );

    const metrics: HourlyMetrics = {
      hour,
      avg_reach: count > 0 ? Math.round(data.reach / count) : 0,
      avg_views: count > 0 ? Math.round(data.views / count) : 0,
      stories_count: count,
      stories: sortedStories,
    };

    for (let i = 0; i < max_stories_per_hour; i++) {
      const story = sortedStories[i];
      metrics[`story_${i}_reach`] = story?.reach || 0;
      metrics[`story_${i}_id`] = story?.instagram_story_id || '';
    }

    return metrics;
  });

  const recent_snapshots: StorySnapshot[] = [...latestSnapshots]
    .sort((a, b) => {
      const aSnapshotDate = new Date(a.snapshot_at).getTime();
      const bSnapshotDate = new Date(b.snapshot_at).getTime();
      const aCreatedAt = aSnapshotDate - (a.story_age_hours || 0) * 60 * 60 * 1000;
      const bCreatedAt = bSnapshotDate - (b.story_age_hours || 0) * 60 * 60 * 1000;
      return bCreatedAt - aCreatedAt;
    })
    .slice(0, 10)
    .map((s) => ({
      id: s.id,
      instagram_story_id: s.instagram_story_id,
      snapshot_at: s.snapshot_at,
      story_age_hours: s.story_age_hours,
      reach: s.reach || 0,
      views: s.views || 0,
      profile_visits: s.profile_visits || 0,
      total_interactions: s.total_interactions || 0,
      shares: s.shares || 0,
      replies: s.replies || 0,
      navigation: s.navigation || {},
    }));

  return {
    summary,
    recent_snapshots,
    daily_metrics,
    metrics_by_hour,
    max_stories_per_hour,
  };
}

export function useStoryInsightsAnalytics(selectedPeriod: string = '7d') {
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ['storyInsightsAnalytics', organization?.id, selectedPeriod],
    [organization?.id, selectedPeriod]
  );

  const {
    data,
    isLoading: insightsLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => fetchStoryInsightsData(organization!.id, selectedPeriod),
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const refresh = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const loading = orgLoading || (!!organization?.id && insightsLoading);

  return {
    data: data || null,
    loading,
    error: error
      ? error instanceof Error
        ? error.message
        : 'Error al cargar insights de Stories'
      : null,
    refresh,
  };
}
