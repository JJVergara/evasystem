import { INSTAGRAM_API_BASE, STORY_INSIGHTS_METRICS } from './constants.ts';
import type { StoryInsights, MediaItem } from './types.ts';

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

export function buildInstagramApiUrl(endpoint: string, params?: Record<string, string>): string {
  const url = new URL(`${INSTAGRAM_API_BASE}/${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return url.toString();
}

export async function fetchStoryInsights(
  storyId: string,
  accessToken: string
): Promise<StoryInsights | null> {
  try {
    const url = buildInstagramApiUrl(`${storyId}/insights`, {
      metric: STORY_INSIGHTS_METRICS,
      access_token: accessToken,
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
      navigation: undefined,
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
          if (typeof value === 'number') {
            insights.navigation = value;
          } else if (metric.total_value?.breakdowns?.[0]?.results) {
            const breakdown: Record<string, number> = {};
            for (const result of metric.total_value.breakdowns[0].results) {
              const key = result.dimension_values?.[0];
              if (key) {
                breakdown[key] = result.value || 0;
              }
            }
            insights.navigation = breakdown;
            insights.exits = breakdown.tap_exit || 0;
            insights.taps_forward = (breakdown.tap_forward || 0) + (breakdown.swipe_forward || 0);
            insights.taps_back = breakdown.tap_back || 0;
          }
          break;
        case 'impressions':
          insights.impressions = value || 0;
          break;
      }
    }

    return insights;
  } catch (error) {
    if (error instanceof InstagramApiError) throw error;
    return null;
  }
}

export async function fetchAccountMedia(
  accountId: string,
  accessToken: string,
  options: {
    fields?: string;
    limit?: number;
  } = {}
): Promise<MediaItem[]> {
  const { fields = 'id,media_type,media_product_type,timestamp', limit = 50 } = options;

  const url = buildInstagramApiUrl(`${accountId}/media`, {
    fields,
    limit: limit.toString(),
    access_token: accessToken,
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

export interface StoryItem {
  id: string;
  timestamp?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
}

export async function fetchAccountStories(
  accountId: string,
  accessToken: string,
  options: {
    fields?: string;
  } = {}
): Promise<StoryItem[]> {
  const { fields = 'id,timestamp,media_type' } = options;

  const url = buildInstagramApiUrl(`${accountId}/stories`, {
    fields,
    access_token: accessToken,
  });

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    if (error.error?.code === 100 || error.error?.code === 190) {
      return [];
    }
    throw new InstagramApiError(
      `Failed to fetch stories: ${error.error?.message || 'Unknown error'}`,
      response.status,
      error
    );
  }

  const data = await response.json();
  return data.data || [];
}

export async function checkStoryExists(storyId: string, accessToken: string): Promise<boolean> {
  try {
    const url = buildInstagramApiUrl(storyId, {
      fields: 'id',
      access_token: accessToken,
    });

    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

export type StoryVerificationResult =
  | 'exists'
  | 'deleted'
  | 'private_or_no_permission'
  | 'rate_limited'
  | 'token_invalid'
  | 'network_error';

export interface VerifyStoryResult {
  result: StoryVerificationResult;
  debug?: {
    status?: number;
    errorCode?: number;
    errorMessage?: string;
  };
}

export async function verifyStoryExists(
  storyId: string,
  accessToken: string,
  returnDebug = false
): Promise<StoryVerificationResult | VerifyStoryResult> {
  try {
    const url = buildInstagramApiUrl(storyId, {
      fields: 'id',
      access_token: accessToken,
    });

    const response = await fetch(url);

    if (response.ok) {
      return returnDebug ? { result: 'exists' } : 'exists';
    }

    if (response.status === 429) {
      return returnDebug ? { result: 'rate_limited', debug: { status: 429 } } : 'rate_limited';
    }

    const errorData = await response.json().catch(() => null);
    const errorCode = errorData?.error?.code;
    const errorMessage = (errorData?.error?.message || '').toLowerCase();
    const debug = { status: response.status, errorCode, errorMessage };

    if (errorCode === 190) {
      return returnDebug ? { result: 'token_invalid', debug } : 'token_invalid';
    }

    if (errorCode === 100) {
      if (errorMessage.includes('does not exist')) {
        return returnDebug ? { result: 'deleted', debug } : 'deleted';
      }
      if (
        errorMessage.includes('missing permissions') ||
        errorMessage.includes('cannot be loaded') ||
        errorMessage.includes('not authorized')
      ) {
        return returnDebug
          ? { result: 'private_or_no_permission', debug }
          : 'private_or_no_permission';
      }
      return returnDebug ? { result: 'deleted', debug } : 'deleted';
    }

    if (response.status === 404) {
      return returnDebug ? { result: 'deleted', debug } : 'deleted';
    }

    if (response.status >= 500 || errorCode === 2) {
      return returnDebug ? { result: 'deleted', debug } : 'deleted';
    }

    return returnDebug ? { result: 'network_error', debug } : 'network_error';
  } catch (err) {
    return returnDebug
      ? {
          result: 'network_error',
          debug: { errorMessage: err instanceof Error ? err.message : String(err) },
        }
      : 'network_error';
  }
}

export async function fetchAccountInfo(
  accountId: string,
  accessToken: string,
  fields = 'id,username,followers_count,media_count'
) {
  const url = buildInstagramApiUrl(accountId, {
    fields,
    access_token: accessToken,
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

export async function fetchMediaInsights(
  mediaId: string,
  accessToken: string,
  metrics = 'reach,impressions'
) {
  const url = buildInstagramApiUrl(`${mediaId}/insights`, {
    metric: metrics,
    access_token: accessToken,
  });

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
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

export async function fetchMentionedMedia(accountId: string, accessToken: string, limit = 50) {
  const url = buildInstagramApiUrl(`${accountId}/tags`, {
    fields: 'id,media_type,media_product_type,timestamp,username',
    limit: limit.toString(),
    access_token: accessToken,
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

export async function sendInstagramMessage(
  recipientId: string,
  messageText: string,
  accessToken: string
) {
  const url = buildInstagramApiUrl('me/messages', {
    access_token: accessToken,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: messageText },
    }),
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

interface QuickReply {
  content_type: 'text';
  title: string;
  payload: string;
}

export async function sendInstagramMessageWithQuickReplies(
  recipientId: string,
  messageText: string,
  quickReplies: QuickReply[],
  accessToken: string
) {
  const url = buildInstagramApiUrl('me/messages', {
    access_token: accessToken,
  });

  const limitedReplies = quickReplies.slice(0, 13).map((reply) => ({
    content_type: reply.content_type,
    title: reply.title.substring(0, 20),
    payload: reply.payload,
  }));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: {
        text: messageText,
        quick_replies: limitedReplies,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new InstagramApiError(
      `Failed to send message with quick replies: ${error.error?.message || 'Unknown error'}`,
      response.status,
      error
    );
  }

  return await response.json();
}
