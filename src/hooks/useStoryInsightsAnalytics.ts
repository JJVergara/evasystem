import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrganization } from "./useCurrentOrganization";
import { toast } from "sonner";

// Database row type (not in generated Supabase types yet)
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
  // Dynamic keys for stacked bars: story_0_reach, story_1_reach, story_0_id, etc.
  [key: string]: number | string | StoryByHour[] | undefined;
}

export interface StoryInsightsData {
  summary: StoryInsightsSummary;
  recent_snapshots: StorySnapshot[];
  daily_metrics: DailyStoryMetrics[];
  metrics_by_hour: HourlyMetrics[];
  max_stories_per_hour: number; // For generating dynamic bar keys
}

export function useStoryInsightsAnalytics(selectedPeriod: string = "7d") {
  const { organization } = useCurrentOrganization();
  const [data, setData] = useState<StoryInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getPeriodDays = (period: string): number => {
    switch (period) {
      case "24h": return 1;
      case "7d": return 7;
      case "30d": return 30;
      case "90d": return 90;
      default: return 7;
    }
  };

  const fetchStoryInsights = useCallback(async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      setError(null);

      const days = getPeriodDays(selectedPeriod);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch all snapshots for the period
      // Type assertion needed because story_insights_snapshots is not in generated Supabase types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: snapshots, error: snapshotsError } = await (supabase as any)
        .from("story_insights_snapshots")
        .select("*")
        .eq("organization_id", organization.id)
        .gte("snapshot_at", startDate.toISOString())
        .order("snapshot_at", { ascending: false }) as { 
          data: StoryInsightsSnapshotRow[] | null; 
          error: { message: string } | null 
        };

      if (snapshotsError) {
        throw new Error(snapshotsError.message);
      }

      // Get unique stories (latest snapshot per story)
      const uniqueStories = new Map<string, typeof snapshots[0]>();
      for (const snapshot of snapshots || []) {
        if (!uniqueStories.has(snapshot.instagram_story_id)) {
          uniqueStories.set(snapshot.instagram_story_id, snapshot);
        }
      }

      const latestSnapshots = Array.from(uniqueStories.values());

      // Calculate summary metrics from latest snapshots
      const summary: StoryInsightsSummary = {
        total_stories: latestSnapshots.length,
        total_reach: latestSnapshots.reduce((sum, s) => sum + (s.reach || 0), 0),
        total_views: latestSnapshots.reduce((sum, s) => sum + (s.views || 0), 0),
        total_profile_visits: latestSnapshots.reduce((sum, s) => sum + (s.profile_visits || 0), 0),
        total_interactions: latestSnapshots.reduce((sum, s) => sum + (s.total_interactions || 0), 0),
        total_shares: latestSnapshots.reduce((sum, s) => sum + (s.shares || 0), 0),
        total_replies: latestSnapshots.reduce((sum, s) => sum + (s.replies || 0), 0),
        avg_reach_per_story: latestSnapshots.length > 0 
          ? Math.round(latestSnapshots.reduce((sum, s) => sum + (s.reach || 0), 0) / latestSnapshots.length)
          : 0,
        avg_views_per_story: latestSnapshots.length > 0
          ? Math.round(latestSnapshots.reduce((sum, s) => sum + (s.views || 0), 0) / latestSnapshots.length)
          : 0,
      };

      // Group by date for daily metrics
      const dailyMap = new Map<string, {
        stories: Set<string>;
        reach: number;
        views: number;
        profile_visits: number;
        interactions: number;
      }>();

      for (const snapshot of snapshots || []) {
        const date = new Date(snapshot.snapshot_at).toISOString().split("T")[0];
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
        // Only count metrics from the latest snapshot per story per day
        // Since snapshots are ordered DESC, first occurrence is the latest
        if (!day.stories.has(snapshot.instagram_story_id)) {
          day.stories.add(snapshot.instagram_story_id);
          day.reach += snapshot.reach || 0;
          day.views += snapshot.views || 0;
          day.profile_visits += snapshot.profile_visits || 0;
          day.interactions += snapshot.total_interactions || 0;
        }
      }

      // Fill in missing days with zeros
      const daily_metrics: DailyStoryMetrics[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dayData = dailyMap.get(dateStr);
        
        daily_metrics.push({
          date: dateStr,
          stories_count: dayData?.stories.size || 0,
          total_reach: dayData?.reach || 0,
          total_views: dayData?.views || 0,
          total_profile_visits: dayData?.profile_visits || 0,
          total_interactions: dayData?.interactions || 0,
          avg_reach: dayData && dayData.stories.size > 0 
            ? Math.round(dayData.reach / dayData.stories.size) 
            : 0,
        });
      }

      // Group by hour for optimal posting time analysis
      // Use ONLY latest snapshot per story to avoid counting same story multiple times
      const hourMap = new Map<number, { 
        reach: number; 
        views: number; 
        stories: StoryByHour[];
      }>();
      
      for (const snapshot of latestSnapshots) {
        // Calculate story creation time from snapshot_at minus story_age_hours
        const snapshotDate = new Date(snapshot.snapshot_at);
        const storyAgeMs = snapshot.story_age_hours 
          ? snapshot.story_age_hours * 60 * 60 * 1000 
          : 0;
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

      // Find max stories in any hour for generating dynamic keys
      let max_stories_per_hour = 0;
      for (const [, hourData] of hourMap) {
        if (hourData.stories.length > max_stories_per_hour) {
          max_stories_per_hour = hourData.stories.length;
        }
      }

      const metrics_by_hour: HourlyMetrics[] = Array.from({ length: 24 }, (_, hour) => {
        const data = hourMap.get(hour) || { reach: 0, views: 0, stories: [] };
        const count = data.stories.length;
        const sortedStories = data.stories.sort((a, b) => b.reach - a.reach); // Sort by reach desc
        
        // Create base metrics
        const metrics: HourlyMetrics = {
          hour,
          avg_reach: count > 0 ? Math.round(data.reach / count) : 0,
          avg_views: count > 0 ? Math.round(data.views / count) : 0,
          stories_count: count,
          stories: sortedStories,
        };
        
        // Add dynamic keys for each story position (for stacked bars)
        for (let i = 0; i < max_stories_per_hour; i++) {
          const story = sortedStories[i];
          metrics[`story_${i}_reach`] = story?.reach || 0;
          metrics[`story_${i}_id`] = story?.instagram_story_id || '';
        }
        
        return metrics;
      });

      // Recent snapshots (top 10) - sorted by story creation date (newest first)
      const recent_snapshots: StorySnapshot[] = latestSnapshots
        .sort((a, b) => {
          // Calculate story creation time for sorting
          const aSnapshotDate = new Date(a.snapshot_at).getTime();
          const bSnapshotDate = new Date(b.snapshot_at).getTime();
          const aCreatedAt = aSnapshotDate - (a.story_age_hours || 0) * 60 * 60 * 1000;
          const bCreatedAt = bSnapshotDate - (b.story_age_hours || 0) * 60 * 60 * 1000;
          return bCreatedAt - aCreatedAt; // Newest first
        })
        .slice(0, 10)
        .map(s => ({
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

      setData({
        summary,
        recent_snapshots,
        daily_metrics,
        metrics_by_hour,
        max_stories_per_hour,
      });

    } catch (err) {
      console.error("Error fetching story insights:", err);
      setError(err instanceof Error ? err.message : "Error al cargar insights de Stories");
      toast.error("Error al cargar analytics de Stories");
    } finally {
      setLoading(false);
    }
  }, [organization?.id, selectedPeriod]);

  useEffect(() => {
    fetchStoryInsights();
  }, [fetchStoryInsights]);

  return {
    data,
    loading,
    error,
    refresh: fetchStoryInsights,
  };
}

