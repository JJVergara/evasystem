/**
 * Instagram API Utilities
 * Centralized Instagram Graph API interactions
 */

import { META_API_BASE, STORY_INSIGHTS_METRICS } from './constants.ts';
import { StoryInsights, MediaItem } from './types.ts';

export class InstagramApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public fbError?: unknown
  ) {
    super(message);
    this.name = 'InstagramApiError';
  }
}

/**
 * Build Instagram Graph API URL
 */
export function buildInstagramApiUrl(
  endpoint: string,
  params?: Record<string, string>
): string {
  const url = new URL(`${META_API_BASE}/${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return url.toString();
}

/**
 * Fetch story insights from Instagram API
 * See: https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights
 */
export async function fetchStoryInsights(
  storyId: string,
  accessToken: string
): Promise<StoryInsights | null> {
  try {
    const url = buildInstagramApiUrl(`${storyId}/insights`, {
      metric: STORY_INSIGHTS_METRICS,
      access_token: accessToken
    });
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json();
      throw new InstagramApiError(
        `Failed to fetch insights: ${error.error?.message || 'Unknown error'}`,
        response.status,
        error
      );
    }
    
    const data = await response.json();
    const insights: StoryInsights = {
      reach: 0,
      replies: 0,
      shares: 0,
      profile_visits: 0,
      total_interactions: 0,
      views: 0,
      navigation: undefined
    };
    
    for (const metric of data.data || []) {
      const value = metric.values?.[0]?.value;
      
      switch (metric.name) {
        case 'reach':
          insights.reach = value || 0;
          break;
        case 'replies':
          insights.replies = value || 0;
          break;
        case 'shares':
          insights.shares = value || 0;
          break;
        case 'profile_visits':
          insights.profile_visits = value || 0;
          break;
        case 'total_interactions':
          insights.total_interactions = value || 0;
          break;
        case 'views':
          insights.views = value || 0;
          break;
        case 'navigation':
          // Navigation can be a number or have breakdown data
          if (typeof value === 'number') {
            insights.navigation = value;
          } else if (metric.total_value?.breakdowns?.[0]?.results) {
            // Parse breakdown: tap_forward, tap_back, tap_exit, swipe_forward
            const breakdown: Record<string, number> = {};
            for (const result of metric.total_value.breakdowns[0].results) {
              const key = result.dimension_values?.[0];
              if (key) {
                breakdown[key] = result.value || 0;
              }
            }
            insights.navigation = breakdown;
            // Populate legacy fields for backwards compatibility
            insights.exits = breakdown.tap_exit || 0;
            insights.taps_forward = (breakdown.tap_forward || 0) + (breakdown.swipe_forward || 0);
            insights.taps_back = breakdown.tap_back || 0;
          }
          break;
        // Legacy metric (deprecated but might still be returned for old stories)
        case 'impressions':
          insights.impressions = value || 0;
          break;
      }
    }
    
    return insights;
  } catch (error) {
    if (error instanceof InstagramApiError) throw error;
    console.error('Error fetching story insights:', error);
    return null;
  }
}

/**
 * Fetch media items from Instagram account
 */
export async function fetchAccountMedia(
  accountId: string,
  accessToken: string,
  options: {
    fields?: string;
    limit?: number;
  } = {}
): Promise<MediaItem[]> {
  const {
    fields = 'id,media_type,media_product_type,timestamp',
    limit = 50
  } = options;
  
  const url = buildInstagramApiUrl(`${accountId}/media`, {
    fields,
    limit: limit.toString(),
    access_token: accessToken
  });
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new InstagramApiError(
      `Failed to fetch media: ${error.error?.message || 'Unknown error'}`,
      response.status,
      error
    );
  }
  
  const data = await response.json();
  return data.data || [];
}

/**
 * Story item from Instagram API
 */
export interface StoryItem {
  id: string;
  timestamp?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
}

/**
 * Fetch active stories from Instagram account
 * Uses the dedicated /stories endpoint which returns only currently active stories (<24h old)
 */
export async function fetchAccountStories(
  accountId: string,
  accessToken: string,
  options: {
    fields?: string;
  } = {}
): Promise<StoryItem[]> {
  const {
    fields = 'id,timestamp,media_type'
  } = options;
  
  const url = buildInstagramApiUrl(`${accountId}/stories`, {
    fields,
    access_token: accessToken
  });
  
  console.log(`Fetching stories from: ${accountId}/stories`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    // Don't throw if no stories found or permission issue
    if (error.error?.code === 100 || error.error?.code === 190) {
      console.log(`No stories accessible for account ${accountId}: ${error.error?.message}`);
      return [];
    }
    throw new InstagramApiError(
      `Failed to fetch stories: ${error.error?.message || 'Unknown error'}`,
      response.status,
      error
    );
  }
  
  const data = await response.json();
  console.log(`Found ${data.data?.length || 0} active stories`);
  return data.data || [];
}

/**
 * Check if story exists (is still accessible)
 */
export async function checkStoryExists(
  storyId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const url = buildInstagramApiUrl(storyId, {
      fields: 'id',
      access_token: accessToken
    });
    
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch Instagram account info
 */
export async function fetchAccountInfo(
  accountId: string,
  accessToken: string,
  fields = 'id,username,followers_count,media_count'
) {
  const url = buildInstagramApiUrl(accountId, {
    fields,
    access_token: accessToken
  });
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new InstagramApiError(
      `Failed to fetch account info: ${error.error?.message || 'Unknown error'}`,
      response.status,
      error
    );
  }
  
  return await response.json();
}

/**
 * Fetch Instagram media insights (for posts/reels)
 */
export async function fetchMediaInsights(
  mediaId: string,
  accessToken: string,
  metrics = 'reach,impressions'
) {
  const url = buildInstagramApiUrl(`${mediaId}/insights`, {
    metric: metrics,
    access_token: accessToken
  });
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    // Don't throw for insights that aren't available yet
    if (error.error?.code === 10 || error.error?.message?.includes('Insights')) {
      return null;
    }
    throw new InstagramApiError(
      `Failed to fetch media insights: ${error.error?.message || 'Unknown error'}`,
      response.status,
      error
    );
  }
  
  return await response.json();
}

/**
 * Fetch mentioned media (tags)
 */
export async function fetchMentionedMedia(
  accountId: string,
  accessToken: string,
  limit = 50
) {
  const url = buildInstagramApiUrl(`${accountId}/tags`, {
    fields: 'id,media_type,media_product_type,timestamp,username',
    limit: limit.toString(),
    access_token: accessToken
  });
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new InstagramApiError(
      `Failed to fetch mentioned media: ${error.error?.message || 'Unknown error'}`,
      response.status,
      error
    );
  }
  
  const data = await response.json();
  return data.data || [];
}

/**
 * Send Instagram direct message
 */
export async function sendInstagramMessage(
  recipientId: string,
  messageText: string,
  accessToken: string
) {
  const url = buildInstagramApiUrl('me/messages', {
    access_token: accessToken
  });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: messageText }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new InstagramApiError(
      `Failed to send message: ${error.error?.message || 'Unknown error'}`,
      response.status,
      error
    );
  }
  
  return await response.json();
}

