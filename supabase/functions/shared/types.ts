/**
 * Shared TypeScript interfaces for Supabase Edge Functions
 * Single source of truth for data structures
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Supabase client type
 */
export type SupabaseClient = ReturnType<typeof createClient>;

/**
 * Organization data structure
 */
export interface Organization {
  id: string;
  name: string;
  meta_token?: string;
  token_expiry?: string;
  instagram_business_account_id?: string;
  instagram_username?: string;
  instagram_user_id?: string;
  instagram_handle?: string;
  facebook_page_id?: string;
  created_by?: string;
}

/**
 * Ambassador/Embassador data structure
 */
export interface Ambassador {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  instagram_user?: string;
  instagram_user_id?: string;
  follower_count?: number;
  profile_picture_url?: string;
}

/**
 * Social mention data structure
 */
export interface SocialMention {
  id: string;
  organization_id: string;
  instagram_user_id?: string;
  instagram_username?: string;
  instagram_story_id?: string;
  instagram_media_id?: string;
  content: string;
  mention_type: 'story' | 'story_referral' | 'comment' | 'mention' | 'tag';
  mentioned_at: string;
  expires_at?: string;
  state?: string;
  processed?: boolean;
  checks_count?: number;
  last_check_at?: string;
  matched_ambassador_id?: string;
  matched_fiesta_id?: string;
  story_url?: string;
  conversation_id?: string;
  inbox_link?: string;
  // Party selection fields
  party_selection_status?: 'not_required' | 'pending_response' | 'resolved' | 'timeout';
  party_selection_message_sent_at?: string;
  party_options_sent?: Array<{ id: string; name: string; payload: string }>;
  party_selection_message_id?: string;
}

/**
 * Story insights metrics
 * See: https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights
 * 
 * Available STORY metrics:
 * - reach: Unique accounts that viewed the story
 * - replies: Total replies on the story
 * - shares: Number of shares
 * - profile_visits: Number of profile visits from the story
 * - total_interactions: Likes, saves, comments, shares (minus unlikes/unsaves/deleted)
 * - views: Total views (metric in development)
 * - navigation: Total navigation actions with breakdown (tap_forward, tap_back, tap_exit, swipe_forward)
 * 
 * Note: 'impressions' was deprecated in v22.0+ for media created after July 2, 2024
 */
export interface StoryInsights {
  // Core metrics
  reach: number;
  replies: number;
  shares: number;
  
  // Engagement metrics
  profile_visits: number;
  total_interactions: number;
  views: number;
  
  // Navigation breakdown (tap_forward, tap_back, tap_exit, swipe_forward)
  navigation?: number | {
    tap_forward?: number;
    tap_back?: number;
    tap_exit?: number;
    swipe_forward?: number;
  };
  
  // Legacy fields (kept for DB compatibility)
  impressions?: number;
  exits?: number;
  taps_forward?: number;
  taps_back?: number;
}

/**
 * Instagram insights data
 */
export interface InsightsData {
  media_id?: string;
  id?: string;
  metric_values?: Array<{
    name: string;
    value: number;
  }>;
  [key: string]: unknown;
}
/**
 * Dynamic insights map (allows additional metrics)
 */
export interface InsightsMap {
  impressions?: number;
  reach?: number;
  replies?: number;
  exits?: number;
  taps_forward?: number;
  taps_back?: number;
  shares?: number;
  [key: string]: number | undefined;
}

/**
 * Instagram media item
 */
export interface MediaItem {
  id: string;
  username?: string;
  timestamp?: string;
  media_type?: string;
  media_product_type?: string;
  media_url?: string;
  [key: string]: unknown;
}

/**
 * Instagram comment data
 */
export interface CommentData {
  id: string;
  text?: string;
  from?: {
    id: string;
    username?: string;
  };
  media?: {
    id: string;
  };
  [key: string]: unknown;
}

/**
 * Instagram message data
 */
export interface MessageData {
  mid?: string;
  id?: string;
  text?: string;
  sender?: {
    id: string;
    username?: string;
  };
  referral?: {
    source?: string;
    type?: string;
    ref?: string;
    referer_uri?: string;
  };
  timestamp?: number;
  [key: string]: unknown;
}

/**
 * Meta OAuth token data
 */
export type TokenData = {
  access_token: string;
  expires_in: number;   // seconds
};


/**
 * Social mention update data
 */
export interface MentionUpdateData {
  checks_count: number;
  last_check_at: string;
  state?: string;
  processed?: boolean;
  processed_at?: string;
}

/**
 * Notification data structure
 */
export interface Notification {
  created_at: string;
  type: string;
  organization_id?: string;
  message?: string;
  priority?: 'low' | 'normal' | 'high';
  target_type?: string;
  target_id?: string;
}

/**
 * Error with structured message
 */
export interface ErrorWithMessage {
  name?: string;
  message?: string;
  stack?: string;
}

/**
 * Instagram data for ambassadors
 */
export interface InstagramData {
  instagram_user_id: string;
  instagram_user?: string;
  follower_count?: number;
  profile_picture_url?: string;
}

/**
 * Instagram data for organizations
 */
export interface OrganizationInstagramData {
  facebook_page_id: string;
  instagram_business_account_id?: string;
  instagram_username?: string;
  instagram_user_id?: string;
}

/**
 * Fiesta (event/party) data structure
 */
export interface Fiesta {
  id: string;
  organization_id?: string;
  name?: string;
  description?: string;
  location?: string;
  event_date?: string;
  instagram_handle?: string;
  status?: 'active' | 'inactive' | 'completed';
  created_at?: string;
}

/**
 * Party selection status for social mentions
 */
export type PartySelectionStatus = 'not_required' | 'pending_response' | 'resolved' | 'timeout';


export interface MediaData {
  id: string;
  username?: string;
  media_type?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface CommentData {
  id: string;
  text?: string;
  from?: {
    id: string;
    username?: string;
  };
  media?: {
    id: string;
  };
  [key: string]: unknown;
}

export interface MessageData {
  mid?: string;
  id?: string;
  text?: string;
  sender?: {
    id: string;
    username?: string;
  };
  referral?: {
    source?: string;
    type?: string;
    ref?: string;
    referer_uri?: string;
  };
  timestamp?: number;
  [key: string]: unknown;
}


export interface SyncResult {
  organization_id: string;
  organization_name: string;
  success: boolean;
  totalFollowers?: number;
  totalPosts?: number;
  totalReach?: number;
  totalImpressions?: number;
  newMentions?: number;
  newTags?: number;
  error?: string;
}
