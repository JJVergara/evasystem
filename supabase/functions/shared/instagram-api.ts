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
      impressions: 0,
      reach: 0,
      replies: 0,
      exits: 0,
      taps_forward: 0,
      taps_back: 0,
      shares: 0
    };
    
    for (const metric of data.data || []) {
      if (metric.name in insights) {
        insights[metric.name as keyof StoryInsights] = metric.values?.[0]?.value || 0;
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

