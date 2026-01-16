# EvaSystem - Codebase Documentation

## Overview

EvaSystem is an **Instagram Ambassador Management & Analytics Platform** that enables organizations to manage brand ambassadors, track Instagram engagement (stories, mentions, tags), and analyze performance metrics.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18.3, Vite 5.4, TypeScript 5.9 |
| **Styling** | Tailwind CSS 3.4, shadcn/ui (Radix-based) |
| **State Management** | TanStack React Query 5.56 |
| **Forms** | react-hook-form 7.53, Zod 3.23 |
| **Backend** | Supabase (PostgreSQL + Edge Functions + Auth) |
| **Edge Functions** | Deno runtime |
| **External APIs** | Instagram Graph API v24.0, Meta OAuth |
| **Automation** | N8n workflows |
| **Code Quality** | ESLint 9, Prettier 3, Vitest 4 |

---

## Directory Structure

```
evasystem/
├── src/
│   ├── components/               # React components (113 total)
│   │   ├── ui/                   # shadcn/ui primitives (48)
│   │   ├── Auth/                 # Authentication UI
│   │   ├── Dashboard/            # Dashboard widgets
│   │   ├── Layout/               # MainLayout, Sidebar, Header
│   │   ├── Ambassadors/          # Ambassador management
│   │   ├── Events/               # Event management
│   │   ├── Fiestas/              # Fiesta components
│   │   ├── Analytics/            # Charts and reports
│   │   ├── Instagram/            # Instagram connection UI
│   │   ├── Stories/              # Story management
│   │   ├── StoryMentions/        # Story mention components
│   │   ├── Organizations/        # Org management
│   │   ├── Settings/             # App settings
│   │   ├── ErrorBoundary/        # Error handling
│   │   ├── ImportExport/         # Data import/export
│   │   ├── Notifications/        # Notification center
│   │   └── Profile/              # User profile
│   │
│   ├── pages/                    # Route pages (18)
│   │   ├── Index.tsx             # Dashboard
│   │   ├── Ambassadors.tsx
│   │   ├── Events.tsx
│   │   ├── Analytics.tsx
│   │   ├── Settings.tsx
│   │   └── ...
│   │
│   ├── hooks/                    # Custom hooks (26)
│   │   ├── useAuth.ts
│   │   ├── useCurrentOrganization.ts
│   │   ├── useAmbassadors.ts     # Uses @/services/api
│   │   ├── useFiestas.ts         # Uses @/services/api
│   │   ├── useInstagramConnection.ts
│   │   └── ...
│   │
│   ├── constants/                # Centralized constants (~170 lines)
│   │   ├── queryKeys.ts          # React Query key factories
│   │   ├── ambassadorStatus.ts   # Status const objects & types
│   │   ├── categories.ts         # Category const & type
│   │   ├── entityStatus.ts       # Entity status const & types
│   │   └── index.ts              # Re-exports
│   │
│   ├── services/api/             # API abstraction (~220 lines)
│   │   ├── ambassadors.ts        # get, create, update, delete
│   │   ├── fiestas.ts            # get, create, update
│   │   └── index.ts              # Re-exports
│   │
│   ├── types/                    # Shared TypeScript types (~560 lines)
│   │   ├── ambassador.ts         # Ambassador, Request, Ranking types
│   │   ├── organization.ts       # Organization, Member types
│   │   ├── event.ts              # Event, Fiesta, Task types
│   │   ├── storyMentions.ts      # Story mention types
│   │   └── index.ts              # Re-exports
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts         # Supabase client instance
│   │       └── types.ts          # Generated DB types
│   │
│   ├── lib/
│   │   └── utils.ts              # cn() utility
│   │
│   ├── assets/                   # Static assets
│   │
│   ├── App.tsx                   # Route configuration
│   └── main.tsx                  # App entry point
│
├── supabase/
│   ├── config.toml               # Supabase project configuration
│   │
│   ├── functions/                # Edge Functions (22)
│   │   ├── meta-oauth/           # Instagram OAuth flow
│   │   ├── instagram-sync/       # Data synchronization
│   │   ├── instagram-webhook/    # Real-time webhooks
│   │   ├── instagram-profile/    # Profile data fetching
│   │   ├── collect-story-insights/
│   │   ├── resolve-story-mentions/
│   │   ├── create-ambassador/
│   │   ├── create-event/
│   │   ├── import-ambassadors/
│   │   ├── export-organization-data/
│   │   ├── backup-full-database/
│   │   └── shared/               # Shared utilities
│   │       ├── constants.ts      # API endpoints, scopes
│   │       ├── types.ts          # Shared types
│   │       ├── crypto.ts         # Token encryption
│   │       ├── auth.ts           # Supabase client helpers
│   │       ├── responses.ts      # Response formatting
│   │       ├── error-handler.ts  # Error utilities
│   │       └── instagram-api.ts  # Instagram API helpers
│   │
│   └── migrations/               # SQL migrations (80+)
│
├── n8n-workflows/                # N8n automation workflows
│   ├── 01-auth-user-registration.json
│   ├── 02-event-management.json
│   └── 03-ambassador-management.json
│
├── scripts/                      # Utility scripts
│
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── index.html
```

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                            │
│  (Components → Hooks → React Query → Supabase Client)           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase Platform                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │    Auth     │  │  Realtime   │  │    REST API (PostgREST) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                          │                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Edge Functions (Deno)                          ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  ││
│  │  │  meta-oauth  │  │instagram-sync│  │ instagram-webhook│  ││
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
│                          │                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    PostgreSQL Database                       ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Instagram Graph │  │   Meta OAuth    │  │       N8n       │  │
│  │    API v24.0    │  │                 │  │   Automation    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Frontend Architecture

- **Route-based code splitting** via React.lazy()
- **Protected routes** with `ProtectedRoute` component
- **MainLayout** wraps authenticated pages (Sidebar + Header + Content)
- **React Query** handles server state with 10-min stale time, 30-min GC

### Backend Architecture (Supabase)

- **Auth**: Email/password authentication with session management
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Edge Functions**: Deno-based serverless functions for external API calls
- **Realtime**: WebSocket subscriptions for live updates

---

## Core Features

### 1. Organization Management
- Multi-tenant architecture
- Organization members with role-based permissions
- Organization-specific Instagram credentials
- Settings and configuration per organization

### 2. Ambassador Management
- Ambassador CRUD operations
- Instagram account connection per ambassador
- Performance tracking (tasks, events, followers)
- Global ranking/category system
- Ambassador request/approval workflow
- Bulk import via CSV

### 3. Instagram Integration
- **OAuth Flow**: Connect organization and ambassador Instagram accounts
- **Token Management**: Encrypted storage, expiry tracking, auto-refresh
- **Story Sync**: Automated collection of stories with mention/tag detection
- **Insights Collection**: Story metrics (reach, impressions, replies, shares)
- **Webhooks**: Real-time notifications from Instagram
- **Auto Token Refresh**: Automatic refresh of tokens 7 days before expiry (see Token Lifecycle below)

### 4. Events & Fiestas
- Event creation and lifecycle management
- Fiesta (party) aggregation of events
- Ambassador task assignment per event
- Status tracking (active/inactive/completed)

### 5. Mentions & Tags Tracking
- Automatic detection of brand mentions in stories
- Tag tracking in posts and stories
- Ambassador matching for mentions
- Task creation for verified mentions

### 6. Analytics & Reporting
- Organization performance dashboards
- Ambassador metrics and rankings
- Story performance over time
- Date range filtering
- Export capabilities

### 7. Notifications
- Real-time notification system
- Types: token_expired, sync_completed, mention_detected, etc.
- Priority levels (high, normal, low)

---

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `users` | App users linked to Supabase Auth |
| `organizations` | Organization records |
| `organization_members` | Membership & permissions |
| `embassadors` | Brand ambassador profiles |
| `ambassador_tokens` | Encrypted Instagram tokens |
| `organization_instagram_tokens` | Org-level Instagram tokens |
| `events` | Event records |
| `fiestas` | Party/event aggregations |
| `tasks` | Ambassador tasks |
| `social_mentions` | Instagram mention records |
| `story_insights_snapshots` | Story metrics history |
| `notifications` | System notifications |
| `oauth_states` | OAuth CSRF protection |
| `ambassador_requests` | Ambassador applications |

---

## Edge Functions Reference

### OAuth & Connection
| Function | Purpose |
|----------|---------|
| `meta-oauth` | Handle OAuth authorization, token exchange, and manual refresh |
| `instagram-token-status` | Check token validity, expiration, and days remaining |
| `disconnect-instagram` | Revoke Instagram connections |
| `refresh-instagram-tokens` | Automated cron job to refresh expiring tokens |

### Data Synchronization
| Function | Purpose |
|----------|---------|
| `instagram-sync` | Main sync orchestrator (cron-triggered) |
| `instagram-profile` | Fetch Instagram profile data |
| `collect-story-insights` | Gather story performance metrics |
| `resolve-story-mentions` | Match mentions to ambassadors |
| `story-mentions-state-worker` | Track story mention states |

### Webhooks
| Function | Purpose |
|----------|---------|
| `instagram-webhook` | Handle real-time Instagram events |
| `secure-webhook-proxy` | Security layer for webhooks |

### Data Management
| Function | Purpose |
|----------|---------|
| `export-organization-data` | Export organization data |
| `restore-organization-data` | Restore from backup |
| `backup-full-database` | Full database backup |
| `facebook-data-deletion` | GDPR compliance endpoint |

### Entity Management
| Function | Purpose |
|----------|---------|
| `create-ambassador` | Create new ambassadors |
| `create-event` | Create events |
| `import-ambassadors` | Bulk import ambassadors |
| `instagram-send-message` | Send Instagram DMs |

### Utilities
| Function | Purpose |
|----------|---------|
| `handle-user-registration` | Post-signup processing |
| `cleanup-oauth-states` | Clean expired OAuth states |
| `instagram-diagnostics` | Connection health checks |

---

## Shared Utilities (`/supabase/functions/shared/`)

### `crypto.ts`
Token encryption/decryption using AES-GCM:
```typescript
encryptToken(token: string): Promise<string>
decryptToken(encryptedToken: string): Promise<string>
```

### `auth.ts`
Supabase client creation:
```typescript
createSupabaseClient(authHeader: string): SupabaseClient
createServiceClient(): SupabaseClient
```

### `constants.ts`
- `INSTAGRAM_API_BASE`: Graph API base URL
- `INSTAGRAM_SCOPES`: Required OAuth permissions
- `STORY_METRICS`: Metrics to collect from stories

### `responses.ts`
Standardized response formatting:
```typescript
jsonResponse(data: any, status?: number): Response
errorResponse(message: string, status?: number): Response
corsHeaders: Record<string, string>
```

---

## Security

### Token Security
- All Instagram tokens encrypted using AES-GCM before database storage
- Encryption key stored in environment variables
- Tokens decrypted only when needed for API calls

### OAuth Security
- State parameter validation for CSRF protection
- States stored in database with expiration
- Automatic cleanup of expired states

### API Security
- JWT verification on Edge Functions (configured in `config.toml`)
- Service role key used only server-side
- CORS headers properly configured

### Database Security
- Row Level Security (RLS) policies on all tables
- Organization-scoped data access
- User permissions checked at query level

---

## Instagram Token Lifecycle

### Token Types
Instagram uses a two-token system:
1. **Short-lived token** (1 hour): Obtained during OAuth callback
2. **Long-lived token** (60 days): Exchanged from short-lived token

### Token Flow
```
User clicks "Connect Instagram"
         ↓
OAuth redirect to Instagram
         ↓
User grants permissions
         ↓
Callback with authorization code
         ↓
Exchange code → Short-lived token (1 hour)
         ↓
Exchange short-lived → Long-lived token (60 days)
         ↓
Encrypt and store in database
         ↓
[Day 53] Auto-refresh cron detects token expiring within 7 days
         ↓
Refresh API call → New 60-day token
         ↓
(Cycle repeats indefinitely)
```

### Auto-Refresh System
The `refresh-instagram-tokens` edge function runs daily at 3 AM UTC via pg_cron:
- Queries tokens expiring within 7 days
- Calls Instagram's refresh endpoint: `GET https://graph.instagram.com/refresh_access_token`
- Re-encrypts and updates the token
- Creates notifications only on failures

### Key Constants (`/supabase/functions/shared/constants.ts`)
```typescript
TOKEN_REFRESH_THRESHOLD_DAYS = 7
DEFAULT_TOKEN_EXPIRY_MS = 60 * 24 * 60 * 60 * 1000
```

### Frontend Token Status
The `useInstagramConnection` hook provides:
- `daysUntilExpiry`: Days until token expires
- `needsRefresh`: True if within 7 days of expiry
- `showWarning`: True if within 14 days of expiry
- `refreshToken()`: Manual refresh function

### UI Components
- `TokenExpiryWarning`: Warning banner (yellow 7-14 days, red <7 days)
- Settings page shows expiry date and "Renovar (+60 días)" button

---

## Scheduled Jobs (pg_cron)

The following cron jobs are configured in the database:

| Job Name | Schedule | Function | Purpose |
|----------|----------|----------|---------|
| `instagram_sync_every_5_min` | `*/5 * * * *` | `instagram-sync` | Sync Instagram data |
| `verify-story-mentions` | `0 * * * *` | `story-mentions-state-worker` | Hourly verification |
| `story-mentions-expiry-worker` | `*/10 * * * *` | `story-mentions-state-worker` | Check story expiration |
| `collect-story-insights-every-2h` | `0 */2 * * *` | `collect-story-insights` | Gather story metrics |
| `daily-instagram-token-refresh` | `0 3 * * *` | `refresh-instagram-tokens` | Auto-refresh tokens |

### Managing Cron Jobs
```sql
SELECT * FROM cron.job;

SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

SELECT cron.schedule('job-name', '0 * * * *', $$ SELECT ... $$);

SELECT cron.unschedule('job-name');
```

---

## Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Instagram/Meta
INSTAGRAM_APP_ID=xxx
INSTAGRAM_APP_SECRET=xxx
WEBHOOK_VERIFY_TOKEN=xxx

# Security
TOKEN_ENCRYPTION_KEY=xxx
CRON_SECRET=xxx
```

---

## Development

### Commands
```bash
# Development
npm run dev          # Start Vite dev server
npm run preview      # Preview production build

# Build
npm run build        # Production build
npm run build:dev    # Development build

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format with Prettier
npm run format:check # Check formatting
npm run typecheck    # TypeScript type checking

# Testing
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage
```

### Supabase CLI
```bash
supabase start              # Start local Supabase
supabase functions serve    # Run Edge Functions locally
supabase db push            # Apply migrations
supabase gen types          # Generate TypeScript types
```

---

## Key Patterns

### React Query Configuration
Global configuration in `App.tsx`:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: (failureCount, error) => {
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      networkMode: 'online',
    },
    mutations: { retry: false },
  },
});
```

### Query Key Factories
Use `QUERY_KEYS` from `@/constants` instead of hardcoded arrays:
```typescript
import { QUERY_KEYS } from '@/constants';

const ambassadorsKey = QUERY_KEYS.ambassadors(organizationId);
const fiestasKey = QUERY_KEYS.fiestas(organizationId);
const tasksKey = QUERY_KEYS.tasks(organizationId);
const dashboardStatsKey = QUERY_KEYS.dashboardStats(userId);
```

### Service Layer Pattern
Use `@/services/api` for Supabase operations instead of direct calls:
```typescript
import { getAmbassadors, createAmbassador } from '@/services/api';

const { data } = useQuery({
  queryKey: QUERY_KEYS.ambassadors(orgId),
  queryFn: () => getAmbassadors(orgId),
});
```

### Hook Structure Pattern
All data hooks follow this consistent structure:
```typescript
import { QUERY_KEYS } from '@/constants';
import { getEntities, createEntity } from '@/services/api';
import type { Entity, CreateEntityInput } from '@/types';

export function useEntities() {
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const queryClient = useQueryClient();

  const organizationId = organization?.id;
  const queryKey = QUERY_KEYS.entities(organizationId || '');

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => getEntities(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateEntityInput) => createEntity(organizationId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Created successfully');
    },
    onError: () => toast.error('Error creating'),
  });

  const loading = orgLoading || (!!organizationId && isLoading);

  return { data, loading, error, create: createMutation.mutateAsync };
}
```

### Real-time Subscriptions Pattern
```typescript
useEffect(() => {
  if (!organization) return;

  const channel = supabase
    .channel(`entity_${organization.id}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'entity_table',
      filter: `organization_id=eq.${organization.id}`
    }, (payload) => {
      onNewItem?.(payload.new);
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [organization]);
```

### Supabase Client Access
```typescript
import { supabase } from '@/integrations/supabase/client';
```

### Edge Function Invocation
```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { param1, param2 },
});
```

### Path Aliases
Configured in `vite.config.ts` and `tsconfig.json`:
```typescript
import { Component } from '@/components/Component';
import { useHook } from '@/hooks/useHook';
```

---

## File Naming Conventions

- **Components**: PascalCase (`AmbassadorCard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useAuth.ts`)
- **Pages**: PascalCase (`Ambassadors.tsx`)
- **Utilities**: camelCase (`utils.ts`)
- **Edge Functions**: kebab-case directories (`meta-oauth/`)

---

## Coding Standards

### No Comments Policy

**This codebase follows a strict no-comments policy.** All code must be self-explanatory through:
- Clear, descriptive variable and function names
- Small, focused functions with single responsibilities
- Well-structured code that reveals intent
- Meaningful type definitions

**Rules:**
- Do NOT add inline comments (`//`)
- Do NOT add block comments (`/* */`)
- Do NOT add JSDoc comments (`/** */`)
- Do NOT add TODO comments
- Do NOT add commented-out code

**Exceptions:**
- Test files (`*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`) may contain comments for test documentation
- Type definitions may include brief JSDoc for IDE intellisense when absolutely necessary for complex types

**Why no comments?**
- Comments become outdated and misleading
- Good code is self-documenting
- Comments often explain "what" instead of the code showing "how"
- Forces developers to write clearer code
- Reduces noise and improves readability

**Instead of comments, use:**
```typescript
// BAD: Comment explaining what code does
// Check if user is admin
if (user.role === 'admin') { ... }

// GOOD: Self-explanatory code
const isAdmin = user.role === 'admin';
if (isAdmin) { ... }

// BAD: Comment explaining complex logic
// Calculate days until token expires
const days = Math.floor((expiry - now) / 86400000);

// GOOD: Extract to well-named function
const daysUntilExpiry = calculateDaysUntilExpiry(tokenExpiry);
```

---

## Code Quality Tools

### Prettier
Code formatting is enforced using Prettier with the following configuration (`.prettierrc`):
- Semi-colons: enabled
- Single quotes: enabled
- Tab width: 2 spaces
- Trailing commas: ES5
- Print width: 100 characters

Run `npm run format` to format all files, or `npm run format:check` to verify formatting.

### ESLint
ESLint is configured with:
- TypeScript support via `typescript-eslint`
- React Hooks rules
- Prettier integration (formatting errors as warnings)
- `@typescript-eslint/no-explicit-any`: warn
- `@typescript-eslint/consistent-type-imports`: prefer type imports
- `no-console`: warn (except `console.warn` and `console.error`)

---

## Git Commit Conventions

This project follows **Conventional Commits** format:

```
type(scope): short description
```

### Format
- **type**: The category of change
- **scope**: The area of the codebase affected (optional but recommended)
- **description**: Brief explanation in lowercase, imperative mood

### Types
| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `docs` | Documentation changes |
| `style` | Formatting, missing semicolons, etc. (no code change) |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks, dependencies, configs |
| `perf` | Performance improvements |

### Examples
```bash
feat(ambassadors): add bulk import functionality
fix(oauth): resolve token refresh loop issue
refactor(users): simplify authentication flow
docs(readme): update installation instructions
chore(deps): upgrade React to v18.3
perf(analytics): optimize dashboard queries
```

### Scope Examples
Common scopes in this project:
- `ambassadors`, `events`, `fiestas`, `mentions`
- `oauth`, `instagram`, `auth`
- `dashboard`, `analytics`, `settings`
- `db`, `migrations`, `functions`
- `ui`, `components`, `hooks`

---

## Testing Considerations

- Edge Functions can be tested locally with `supabase functions serve`
- Use `.env.local` for local environment variables
- Instagram API calls require valid tokens (use test accounts)

---

## Common Tasks

### Adding a New Page
1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation link in `src/components/Layout/Sidebar.tsx`

### Adding a New Edge Function
1. Create directory in `supabase/functions/`
2. Add `index.ts` with handler
3. Configure JWT verification in `supabase/config.toml`
4. Import shared utilities from `../shared/`

### Adding a Database Table
1. Create migration: `supabase migration new table_name`
2. Write SQL in migration file
3. Apply: `supabase db push`
4. Regenerate types: `supabase gen types typescript --local > src/integrations/supabase/types.ts`

---

## Architecture Decisions

### ADR-001: Organization Membership via `organization_members` Table
**Decision**: Use `organization_members` table for all membership checks, not `users.organization_id`.

**Context**: The app supports multi-tenant organizations where users can belong to multiple organizations.

**Consequence**: All Edge Functions must check membership via:
```typescript
const { data: membership } = await supabase
  .from('organization_members')
  .select('id')
  .eq('user_id', user.id)
  .eq('organization_id', organizationId)
  .eq('status', 'active')
  .single();
```

### ADR-002: Token Storage Separation
**Decision**: Store Instagram tokens in separate tables (`organization_instagram_tokens`, `ambassador_tokens`) with RLS, not in the main entity tables.

**Context**: Tokens are sensitive and should never be exposed to the frontend.

**Consequence**:
- Token tables have RLS enabled with NO client policies
- Only Edge Functions with `service_role` can access tokens
- Main tables (`organizations`, `embassadors`) store only public profile info

### ADR-003: Token Encryption at Rest
**Decision**: All Instagram tokens are encrypted using AES-GCM before database storage.

**Context**: Defense in depth - even if database is compromised, tokens are protected.

**Implementation**: `/supabase/functions/shared/crypto.ts`
```typescript
encryptToken(token: string): Promise<string>
safeDecryptToken(encrypted: string): Promise<string>
```

### ADR-004: Cron Jobs via pg_cron
**Decision**: Use PostgreSQL's pg_cron extension for scheduled tasks, not external schedulers.

**Context**: Keeps all infrastructure within Supabase, reduces external dependencies.

**Consequence**: Jobs are managed via SQL and call Edge Functions via `pg_net.http_post()`.

### ADR-005: Frontend State Management
**Decision**: Use React Query for server state, React useState for UI state.

**Context**: React Query provides caching, deduplication, and background refetching.

**Pattern**:
```typescript
const { data, isLoading } = useQuery({ queryKey: ['key'], queryFn: fetchData });

const [isOpen, setIsOpen] = useState(false);
```

### ADR-006: Edge Function Authentication
**Decision**: JWT verification configured per-function in `config.toml`.

**Context**: Some functions need auth (user actions), others don't (webhooks, cron).

**Configuration**:
```toml
[functions.meta-oauth]
verify_jwt = true

[functions.instagram-webhook]
verify_jwt = false

[functions.refresh-instagram-tokens]
verify_jwt = false
```

### ADR-007: React Query for Server State
**Decision**: Use TanStack React Query for all server state management.

**Context**: Server state (data from API) has different characteristics than UI state and benefits from caching, deduplication, and background refetching.

**Configuration**:
- 10-minute stale time prevents unnecessary refetches
- 30-minute garbage collection keeps inactive data available
- No retry on 4xx errors (client errors)
- Single retry on network errors
- Disabled refetch on window focus (explicit user action preferred)

**Pattern**: All hooks use `useQuery` for reads and `useMutation` for writes with automatic cache invalidation.

### ADR-008: Feature-Based Component Organization
**Decision**: Organize components by feature/domain rather than by type (atomic design).

**Context**: Feature-based organization makes it easier to understand domain boundaries and keeps related code together.

**Structure**:
```
components/
├── Ambassadors/     # All ambassador-related UI
├── Events/          # Event management UI
├── Fiestas/         # Fiesta/party UI
├── Instagram/       # Instagram integration UI
├── Settings/        # Settings page components
└── ui/              # Shared primitive components (shadcn/ui)
```

**Consequence**: Components in a feature folder should only be used within that feature. Cross-feature components belong in `ui/` or root `components/`.

### ADR-009: Organization-Scoped Data Access
**Decision**: All data queries are scoped to the current organization.

**Context**: Multi-tenant architecture requires data isolation between organizations.

**Pattern**:
```typescript
const { organization } = useCurrentOrganization();
const { data } = useQuery({
  queryKey: ['entity', organization?.id],
  queryFn: () => fetchData(organization!.id),
  enabled: !!organization?.id,
});
```

**Consequence**: Every data hook must depend on `useCurrentOrganization` and include organization ID in query keys for proper cache separation.

---

## Design Principles

### 1. Security First
- Never expose tokens to frontend
- Always validate organization membership
- Use encrypted storage for sensitive data
- Verify all external requests (webhooks, cron)

### 2. Fail Gracefully
- Create notifications on failures instead of silent errors
- Provide manual fallbacks for automated processes
- Log errors with context for debugging

### 3. User Visibility
- Show token expiry dates and days remaining
- Display sync status and last update times
- Provide diagnostic tools in Settings

### 4. Idempotent Operations
- Upsert instead of insert for token updates
- Cron jobs should be safe to run multiple times
- Use unique constraints to prevent duplicates

### 5. Separation of Concerns
- Edge Functions handle external API calls
- Frontend handles UI and user interactions
- Database handles data integrity (RLS, constraints)

---

## Troubleshooting Guide

### Token Refresh Failures
1. Check `cron.job_run_details` for job execution status
2. View Edge Function logs in Supabase Dashboard
3. Verify `CRON_SECRET` matches in secrets and cron job
4. Check token hasn't already expired (can't refresh expired tokens)

### OAuth Connection Issues
1. Run diagnostic: `meta-oauth?action=diagnose`
2. Verify Instagram App credentials in Supabase secrets
3. Check redirect URI matches in Meta Developer Console
4. Ensure user has Business/Creator Instagram account

### Missing Token Data
```sql
SELECT
  o.name,
  o.instagram_username,
  t.token_expiry,
  ROUND(EXTRACT(EPOCH FROM (t.token_expiry - NOW())) / 86400) as days_left
FROM organization_instagram_tokens t
JOIN organizations o ON o.id = t.organization_id
ORDER BY days_left ASC;
```

### Webhook Not Receiving Events
1. Verify webhook URL in Meta Developer Console
2. Check `WEBHOOK_VERIFY_TOKEN` matches
3. Test with: `instagram-webhook` function logs
4. Ensure Instagram account is subscribed to webhooks
