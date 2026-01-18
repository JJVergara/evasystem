import type {
  AmbassadorCategory,
  PerformanceStatus,
  AmbassadorStatus,
  RequestStatus,
} from '@/constants';

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

  email?: string;
  rut?: string;
  date_of_birth?: string | null;
  profile_picture_url?: string | null;

  instagram_user_id?: string;
  last_instagram_sync?: string | null;
  profile_public?: boolean;
}

export interface AmbassadorSensitiveData {
  email?: string;
  date_of_birth?: string | null;
  rut?: string;
  profile_picture_url?: string | null;
}

export interface CreateAmbassadorInput {
  first_name: string;
  last_name: string;
  email: string;
  instagram_user: string;
  date_of_birth?: string;
  rut?: string;
}

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

export interface ApproveRequestInput {
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth?: string;
  rut?: string;
}

export function getAmbassadorFullName(
  ambassador: Pick<Ambassador, 'first_name' | 'last_name'>
): string {
  return `${ambassador.first_name} ${ambassador.last_name}`.trim();
}

export function getAmbassadorInitials(
  ambassador: Pick<Ambassador, 'first_name' | 'last_name'>
): string {
  const first = ambassador.first_name?.charAt(0) ?? '';
  const last = ambassador.last_name?.charAt(0) ?? '';
  return `${first}${last}`.toUpperCase();
}
