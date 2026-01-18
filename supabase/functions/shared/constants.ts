export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
} as const;

export const INSTAGRAM_API_VERSION = 'v24.0' as const;
export const INSTAGRAM_API_BASE = `https://graph.instagram.com/${INSTAGRAM_API_VERSION}` as const;

export const INSTAGRAM_OAUTH_AUTHORIZE = 'https://www.instagram.com/oauth/authorize';
export const INSTAGRAM_OAUTH_TOKEN = 'https://api.instagram.com/oauth/access_token';
export const INSTAGRAM_TOKEN_EXCHANGE = `https://graph.instagram.com/access_token`;
export const INSTAGRAM_TOKEN_REFRESH = `https://graph.instagram.com/refresh_access_token`;

export const INSTAGRAM_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_insights',
  'instagram_business_manage_messages',
  'instagram_business_content_publish',
].join(',');

export const STORY_INSIGHTS_METRICS = [
  'reach',
  'replies',
  'profile_visits',
  'total_interactions',
  'shares',
  'navigation',
  'views',
].join(',');

export const VERIFICATION_INTERVALS = [240, 480, 720, 960, 1200, 1380] as const;

export const MAX_VERIFICATION_CHECKS = VERIFICATION_INTERVALS.length;

export const STORY_EXPIRATION_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_TOKEN_EXPIRY_MS = 60 * 24 * 60 * 60 * 1000;

export const TOKEN_REFRESH_THRESHOLD_DAYS = 7;
