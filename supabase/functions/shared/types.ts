import type { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type SupabaseClient = ReturnType<typeof createClient>;

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
  story_url?: string;
  conversation_id?: string;
  inbox_link?: string;
}

export interface StoryInsights {
  reach: number;
  replies: number;
  shares: number;

  profile_visits: number;
  total_interactions: number;
  views: number;

  navigation?:
    | number
    | {
        tap_forward?: number;
        tap_back?: number;
        tap_exit?: number;
        swipe_forward?: number;
      };

  impressions?: number;
  exits?: number;
  taps_forward?: number;
  taps_back?: number;
}

export interface InsightsData {
  media_id?: string;
  id?: string;
  metric_values?: Array<{
    name: string;
    value: number;
  }>;
  [key: string]: unknown;
}

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

export interface MediaItem {
  id: string;
  username?: string;
  timestamp?: string;
  media_type?: string;
  media_product_type?: string;
  media_url?: string;
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

export type TokenData = {
  access_token: string;
  expires_in: number;
};

export interface MentionUpdateData {
  checks_count: number;
  last_check_at: string;
  state?: string;
  processed?: boolean;
  processed_at?: string;
}

export interface Notification {
  created_at: string;
  type: string;
  organization_id?: string;
  message?: string;
  priority?: 'low' | 'normal' | 'high';
  target_type?: string;
  target_id?: string;
}

export interface ErrorWithMessage {
  name?: string;
  message?: string;
  stack?: string;
}

export interface InstagramData {
  instagram_user_id: string;
  instagram_user?: string;
  follower_count?: number;
  profile_picture_url?: string;
}

export interface OrganizationInstagramData {
  facebook_page_id: string;
  instagram_business_account_id?: string;
  instagram_username?: string;
  instagram_user_id?: string;
}

export interface Fiesta {
  id: string;
  organization_id?: string;
  name: string;
  event_date?: string;
  status?: string;
  created_at?: string;
}

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
  quick_reply?: {
    payload: string;
  };
  [key: string]: unknown;
}

export interface QuickReply {
  content_type: 'text';
  title: string;
  payload: string;
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
