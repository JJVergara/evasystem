export type AccountVisibility = 'unknown' | 'public' | 'private';

export interface StoryMention {
  id: string;
  instagram_username: string;
  instagram_user_id: string;
  content: string;
  created_at: string;
  processed: boolean;
  ambassador_name?: string;
  raw_data?: any;
  recipient_page_id?: string;
  external_event_id?: string;
  story_url?: string;
  instagram_story_id?: string;
  mentioned_at: string;
  expires_at?: string;
  state: 'new' | 'flagged_early_delete' | 'completed' | 'expired_unknown';
  deep_link?: string;
  checks_count?: number;
  last_check_at?: string;
  conversation_id?: string;
  inbox_link?: string;
  account_visibility?: AccountVisibility;
  permission_requested_at?: string;
  matched_ambassador_id?: string;
}
