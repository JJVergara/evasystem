/**
 * Shared constants for Supabase Edge Functions
 * Centralized configuration to reduce duplication
 */

/**
 * CORS headers for all functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
} as const;

/**
 * Instagram API with Instagram Login - v24.0
 */
export const INSTAGRAM_API_VERSION = 'v24.0' as const;
export const INSTAGRAM_API_BASE = `https://graph.instagram.com/${INSTAGRAM_API_VERSION}` as const;

// Instagram OAuth endpoints
export const INSTAGRAM_OAUTH_AUTHORIZE = 'https://www.instagram.com/oauth/authorize';
export const INSTAGRAM_OAUTH_TOKEN = 'https://api.instagram.com/oauth/access_token';
export const INSTAGRAM_TOKEN_EXCHANGE = `https://graph.instagram.com/access_token`;
export const INSTAGRAM_TOKEN_REFRESH = `https://graph.instagram.com/refresh_access_token`;

// Instagram scopes (new format as of Jan 27, 2025)
export const INSTAGRAM_SCOPES = [
  'instagram_business_basic',           // Required for basic profile access
  'instagram_business_manage_insights', // Required for insights API
  'instagram_business_manage_messages', // For messaging features
  'instagram_business_content_publish'  // For content publishing features
].join(',');

/**
 * Story insights metrics to fetch from Instagram API
 * See: https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights
 * 
 * Available STORY metrics:
 * - reach: Unique accounts that viewed the story
 * - replies: Total replies on the story
 * - profile_visits: Number of profile visits from the story
 * - total_interactions: Likes, saves, comments, shares minus unlikes/unsaves/deleted
 * - shares: Number of shares
 * - navigation: Total navigation actions (with breakdown available)
 * - views: Total views (in development)
 * 
 * Note: 'impressions' was deprecated in v22.0+ for media created after July 2, 2024
 */
export const STORY_INSIGHTS_METRICS = [
  'reach',
  'replies',
  'profile_visits',
  'total_interactions',
  'shares',
  'navigation',
  'views'
].join(',');

/**
 * Verification intervals for story state worker (in minutes)
 */
export const VERIFICATION_INTERVALS = [60, 720, 1380] as const; // 1h, 12h, 23h

/**
 * Story expiration time (24 hours in milliseconds)
 */
export const STORY_EXPIRATION_MS = 24 * 60 * 60 * 1000;

/**
 * Default token expiry (60 days in milliseconds) when Meta doesn't provide it
 */
export const DEFAULT_TOKEN_EXPIRY_MS = 60 * 24 * 60 * 60 * 1000;
