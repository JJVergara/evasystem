/**
 * Ambassador type definitions
 *
 * These types represent the core ambassador data structures used throughout the application.
 * They align with the database schema but provide TypeScript-friendly interfaces.
 */

import type {
  AmbassadorCategory,
  PerformanceStatus,
  AmbassadorStatus,
  RequestStatus,
} from '@/constants';

/**
 * Core ambassador data
 * Represents a brand ambassador in the system
 */
export interface Ambassador {
  id: string;
  first_name: string;
  last_name: string;
  instagram_user: string;
  organization_id: string;
  status: AmbassadorStatus | string;
  global_points: number;
  global_category: AmbassadorCategory | string;
  performance_status: PerformanceStatus | string;
  events_participated: number;
  completed_tasks: number;
  failed_tasks: number;
  follower_count: number;
  created_at: string;

  // Optional fields (may require permissions to access)
  email?: string;
  rut?: string;
  date_of_birth?: string | null;
  profile_picture_url?: string | null;

  // Instagram-specific fields
  instagram_user_id?: string;
  last_instagram_sync?: string | null;
  profile_public?: boolean;
}

/**
 * Sensitive ambassador data
 * Requires manage_ambassadors permission to access
 */
export interface AmbassadorSensitiveData {
  email?: string;
  date_of_birth?: string | null;
  rut?: string;
  profile_picture_url?: string | null;
}

/**
 * Data for creating a new ambassador
 */
export interface CreateAmbassadorInput {
  first_name: string;
  last_name: string;
  email: string;
  instagram_user: string;
  date_of_birth?: string;
  rut?: string;
}

/**
 * Data for updating an ambassador
 */
export interface UpdateAmbassadorInput {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  instagram_user?: string;
  date_of_birth?: string | null;
  rut?: string;
  status?: AmbassadorStatus | string;
  performance_status?: PerformanceStatus | string;
  global_category?: AmbassadorCategory | string;
  global_points?: number;
  follower_count?: number;
}

/**
 * Ambassador metrics for dashboard/analytics
 */
export interface AmbassadorMetrics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  failedTasks: number;
  eventsParticipated: number;
  storiesCount: number;
  mentionsCount: number;
  followersGained: number;
  status: AmbassadorStatus | string;
}

/**
 * Ambassador ranking data
 */
export interface AmbassadorRanking {
  id: string;
  first_name: string;
  last_name: string;
  instagram_user: string;
  global_points: number;
  global_category: AmbassadorCategory | string;
  rank: number;
  profile_picture_url?: string | null;
}

/**
 * Ambassador request (application to become ambassador)
 */
export interface AmbassadorRequest {
  id: string;
  organization_id: string;
  instagram_user_id?: string;
  instagram_username: string;
  bio?: string;
  follower_count: number;
  profile_picture_url?: string | null;
  source_mention_ids: string[];
  total_mentions: number;
  last_mention_at: string;
  status: RequestStatus | string;
  notes?: string | null;
  processed_by_user_id?: string | null;
  processed_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at?: string;
}

/**
 * Data for approving an ambassador request
 */
export interface ApproveRequestInput {
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth?: string;
  rut?: string;
}

/**
 * Full name helper
 */
export function getAmbassadorFullName(
  ambassador: Pick<Ambassador, 'first_name' | 'last_name'>
): string {
  return `${ambassador.first_name} ${ambassador.last_name}`.trim();
}

/**
 * Get ambassador initials for avatar fallback
 */
export function getAmbassadorInitials(
  ambassador: Pick<Ambassador, 'first_name' | 'last_name'>
): string {
  const first = ambassador.first_name?.charAt(0) ?? '';
  const last = ambassador.last_name?.charAt(0) ?? '';
  return `${first}${last}`.toUpperCase();
}
