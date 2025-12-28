import { vi } from 'vitest';

/**
 * Mock Supabase client for testing
 */
export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  }),
  removeChannel: vi.fn(),
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
};

/**
 * Create a mock query builder that can be chained
 */
export function createMockQueryBuilder<T>(data: T | T[] | null, error: Error | null = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] : data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] : data, error }),
    then: vi.fn((resolve) => resolve({ data, error })),
  };

  // Make it thenable for await
  Object.defineProperty(builder, 'then', {
    value: (resolve: (value: { data: T | T[] | null; error: Error | null }) => void) => {
      resolve({ data, error });
    },
  });

  return builder;
}

/**
 * Mock authenticated session
 */
export const mockAuthenticatedSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  },
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
};

/**
 * Mock organization data
 */
export const mockOrganization = {
  id: 'test-org-id',
  name: 'Test Organization',
  description: 'A test organization',
  created_at: new Date().toISOString(),
  created_by: 'test-user-id',
  instagram_username: null,
  instagram_user_id: null,
  instagram_business_account_id: null,
  facebook_page_id: null,
  meta_token: null,
  token_expiry: null,
  last_instagram_sync: null,
  logo_url: null,
  plan_type: 'free',
  timezone: 'America/Santiago',
};

/**
 * Mock ambassador data
 */
export const mockAmbassador = {
  id: 'test-ambassador-id',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  instagram_user: 'johndoe',
  instagram_user_id: 'ig-123',
  organization_id: 'test-org-id',
  status: 'active',
  performance_status: 'good',
  global_points: 100,
  global_category: 'A',
  completed_tasks: 10,
  failed_tasks: 2,
  events_participated: 5,
  follower_count: 1000,
  profile_picture_url: null,
  profile_public: true,
  created_at: new Date().toISOString(),
  created_by_user_id: 'test-user-id',
  instagram_access_token: null,
  token_expires_at: null,
  last_instagram_sync: null,
  date_of_birth: null,
  rut: null,
};

/**
 * Mock fiesta data
 */
export const mockFiesta = {
  id: 'test-fiesta-id',
  name: 'Test Fiesta',
  description: 'A test party',
  organization_id: 'test-org-id',
  event_date: new Date().toISOString(),
  location: 'Test Location',
  main_hashtag: '#testfiesta',
  secondary_hashtags: ['#party', '#fun'],
  status: 'active',
  instagram_handle: '@testfiesta',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Mock notification data
 */
export const mockNotification = {
  id: 'test-notification-id',
  organization_id: 'test-org-id',
  type: 'mention',
  message: 'New mention from @johndoe',
  priority: 'normal',
  target_type: 'mention',
  target_id: 'test-mention-id',
  read_status: false,
  created_at: new Date().toISOString(),
};
