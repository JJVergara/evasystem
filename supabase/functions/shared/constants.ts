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
 * Meta/Instagram API configuration
 */
export const META_API_VERSION = 'v21.0' as const;
export const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}` as const;

/**
 * Story insights metrics to fetch from Instagram API
 */
export const STORY_INSIGHTS_METRICS = [
  'impressions',
  'reach',
  'replies',
  'exits',
  'taps_forward',
  'taps_back',
  'shares'
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

