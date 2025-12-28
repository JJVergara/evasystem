import type { Database } from '@/integrations/supabase/types';

/**
 * Database table types - directly from Supabase generated types
 */
type Tables = Database['public']['Tables'];

/**
 * Organization entity
 */
export type Organization = Tables['organizations']['Row'];
export type OrganizationInsert = Tables['organizations']['Insert'];
export type OrganizationUpdate = Tables['organizations']['Update'];

/**
 * Organization with computed fields
 */
export interface OrganizationWithStatus extends Organization {
  instagram_connected: boolean;
  member_count?: number;
}

/**
 * Ambassador entity (note: table is named 'embassadors' in DB)
 */
export type Ambassador = Tables['embassadors']['Row'];
export type AmbassadorInsert = Tables['embassadors']['Insert'];
export type AmbassadorUpdate = Tables['embassadors']['Update'];

/**
 * Ambassador with relations
 */
export interface AmbassadorWithOrganization extends Ambassador {
  organization?: Pick<Organization, 'id' | 'name'>;
}

/**
 * Ambassador performance status
 */
export type AmbassadorPerformanceStatus = 'excellent' | 'good' | 'average' | 'needs_improvement';

/**
 * Ambassador status
 */
export type AmbassadorStatus = 'active' | 'inactive' | 'pending' | 'suspended';

/**
 * Fiesta (Party/Event) entity
 */
export type Fiesta = Tables['fiestas']['Row'];
export type FiestaInsert = Tables['fiestas']['Insert'];
export type FiestaUpdate = Tables['fiestas']['Update'];

/**
 * Fiesta status
 */
export type FiestaStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';

/**
 * Fiesta with computed metrics
 */
export interface FiestaWithMetrics extends Fiesta {
  total_mentions?: number;
  total_reach?: number;
  ambassador_count?: number;
}

/**
 * Event entity
 */
export type Event = Tables['events']['Row'];
export type EventInsert = Tables['events']['Insert'];
export type EventUpdate = Tables['events']['Update'];

/**
 * Event with fiesta relation
 */
export interface EventWithFiesta extends Event {
  fiesta?: Pick<Fiesta, 'id' | 'name' | 'main_hashtag'>;
}

/**
 * Task entity
 */
export type Task = Tables['tasks']['Row'];
export type TaskInsert = Tables['tasks']['Insert'];
export type TaskUpdate = Tables['tasks']['Update'];

/**
 * Task status
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'expired';

/**
 * Task type
 */
export type TaskType = 'story' | 'post' | 'reel' | 'mention';

/**
 * Task with relations
 */
export interface TaskWithRelations extends Task {
  ambassador?: Pick<Ambassador, 'id' | 'first_name' | 'last_name' | 'instagram_user'>;
  event?: Pick<Event, 'id' | 'event_date'>;
}

/**
 * Social Mention entity
 */
export type SocialMention = Tables['social_mentions']['Row'];
export type SocialMentionInsert = Tables['social_mentions']['Insert'];
export type SocialMentionUpdate = Tables['social_mentions']['Update'];

/**
 * Social mention state
 */
export type SocialMentionState = 'new' | 'flagged_early_delete' | 'completed' | 'expired_unknown';

/**
 * Social mention type
 */
export type SocialMentionType = 'story_mention' | 'post_mention' | 'hashtag' | 'direct_message';

/**
 * Notification entity
 */
export type Notification = Tables['notifications']['Row'];
export type NotificationInsert = Tables['notifications']['Insert'];
export type NotificationUpdate = Tables['notifications']['Update'];

/**
 * Notification priority
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Notification type
 */
export type NotificationType =
  | 'mention'
  | 'task_completed'
  | 'task_failed'
  | 'ambassador_joined'
  | 'event_reminder'
  | 'system';

/**
 * User entity
 */
export type User = Tables['users']['Row'];
export type UserInsert = Tables['users']['Insert'];
export type UserUpdate = Tables['users']['Update'];

/**
 * User role
 */
export type UserRole = 'admin' | 'rrpp' | 'cliente_viewer';

/**
 * User with organization
 */
export interface UserWithOrganization extends User {
  organization?: Pick<Organization, 'id' | 'name' | 'logo_url'>;
}

/**
 * Organization Member entity
 */
export type OrganizationMember = Tables['organization_members']['Row'];
export type OrganizationMemberInsert = Tables['organization_members']['Insert'];
export type OrganizationMemberUpdate = Tables['organization_members']['Update'];

/**
 * Member role in organization
 */
export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * Member status
 */
export type MemberStatus = 'active' | 'invited' | 'suspended';

/**
 * Leaderboard entry
 */
export type LeaderboardEntry = Tables['leaderboards']['Row'];

/**
 * Leaderboard with ambassador info
 */
export interface LeaderboardWithAmbassador extends LeaderboardEntry {
  ambassador: Pick<Ambassador, 'id' | 'first_name' | 'last_name' | 'instagram_user' | 'profile_picture_url'>;
}

/**
 * Ambassador Request entity
 */
export type AmbassadorRequest = Tables['ambassador_requests']['Row'];
export type AmbassadorRequestInsert = Tables['ambassador_requests']['Insert'];
export type AmbassadorRequestUpdate = Tables['ambassador_requests']['Update'];

/**
 * Request status
 */
export type AmbassadorRequestStatus = 'pending' | 'approved' | 'rejected';

/**
 * Plan entity
 */
export type Plan = Tables['plans']['Row'];

/**
 * Plan features
 */
export interface PlanFeatures {
  analytics: boolean;
  custom_branding: boolean;
  api_access: boolean;
  priority_support: boolean;
  advanced_reports: boolean;
}

/**
 * Import/Export Log entity
 */
export type ImportLog = Tables['import_logs']['Row'];

/**
 * Organization Settings entity
 */
export type OrganizationSettings = Tables['organization_settings']['Row'];

/**
 * General settings structure
 */
export interface GeneralSettings {
  language: 'es' | 'en';
  timezone: string;
  date_format: string;
}

/**
 * Notification settings structure
 */
export interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  mention_alerts: boolean;
  weekly_reports: boolean;
}

/**
 * Instagram settings structure
 */
export interface InstagramSettings {
  auto_sync: boolean;
  sync_interval_hours: number;
  track_stories: boolean;
  track_posts: boolean;
  track_reels: boolean;
}

/**
 * Appearance settings structure
 */
export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  primary_color: string;
  sidebar_collapsed: boolean;
}
