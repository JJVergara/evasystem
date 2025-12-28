/**
 * API and request/response types
 */

/**
 * Generic paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Pagination params
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Date range filter
 */
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

/**
 * Generic filter params
 */
export interface FilterParams extends PaginationParams, DateRangeFilter {
  search?: string;
  status?: string;
}

/**
 * API error response
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * API success response
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * Instagram OAuth response
 */
export interface InstagramOAuthResponse {
  access_token: string;
  user_id: string;
  expires_in?: number;
}

/**
 * Instagram user info
 */
export interface InstagramUserInfo {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
}

/**
 * Instagram story insight
 */
export interface InstagramStoryInsight {
  id: string;
  media_type: 'IMAGE' | 'VIDEO';
  timestamp: string;
  caption?: string;
  media_url?: string;
  thumbnail_url?: string;
  impressions?: number;
  reach?: number;
  replies?: number;
  exits?: number;
  taps_forward?: number;
  taps_back?: number;
}

/**
 * Metrics summary
 */
export interface MetricsSummary {
  total_mentions: number;
  total_reach: number;
  total_engagement: number;
  active_ambassadors: number;
  completed_tasks: number;
  failed_tasks: number;
  pending_tasks: number;
}

/**
 * Time-series data point
 */
export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

/**
 * Chart data
 */
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
}

/**
 * Export options
 */
export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  includeHeaders?: boolean;
  dateRange?: DateRangeFilter;
  fields?: string[];
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: {
    row: number;
    message: string;
  }[];
}

/**
 * Webhook payload from Instagram
 */
export interface InstagramWebhookPayload {
  object: 'instagram' | 'page';
  entry: {
    id: string;
    time: number;
    messaging?: InstagramMessagingEvent[];
    changes?: InstagramChangeEvent[];
  }[];
}

/**
 * Instagram messaging event
 */
export interface InstagramMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: {
      type: string;
      payload: {
        url: string;
      };
    }[];
    reply_to?: {
      story?: {
        id: string;
        url: string;
      };
    };
  };
}

/**
 * Instagram change event
 */
export interface InstagramChangeEvent {
  field: string;
  value: {
    media_id?: string;
    comment_id?: string;
    text?: string;
    from?: {
      id: string;
      username: string;
    };
  };
}

/**
 * RPC function return types
 */
export interface UserOrganization {
  organization_id: string;
  role: string;
  is_owner: boolean;
}

export interface OrganizationSafeInfo {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  instagram_username: string | null;
  instagram_connected: boolean;
  plan_type: string | null;
  timezone: string | null;
  created_at: string | null;
  last_instagram_sync: string | null;
}

export interface AmbassadorSafeInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  instagram_user: string;
  profile_picture_url: string | null;
  follower_count: number | null;
  status: string | null;
  performance_status: string | null;
  global_points: number | null;
  global_category: string | null;
  completed_tasks: number | null;
  failed_tasks: number | null;
  events_participated: number | null;
  profile_public: boolean | null;
  organization_id: string;
  created_at: string | null;
  last_instagram_sync: string | null;
}

/**
 * Session info
 */
export interface SessionInfo {
  user_id: string;
  email: string;
  organizations: UserOrganization[];
  current_organization_id: string | null;
}
