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
| **i18n** | i18next |

---

## Directory Structure

```
evasystem/
├── src/
│   ├── components/               # React components (138 total)
│   │   ├── ui/                   # shadcn/ui components (51)
│   │   ├── Auth/                 # Authentication UI
│   │   ├── Dashboard/            # Dashboard widgets
│   │   ├── Layout/               # MainLayout, Sidebar, Header
│   │   ├── Ambassadors/          # Ambassador management
│   │   ├── Events/               # Event management
│   │   ├── Fiestas/              # Party/fiesta components
│   │   ├── Analytics/            # Charts and reports
│   │   ├── Instagram/            # Instagram connection UI
│   │   ├── Mentions/             # Social mention tracking
│   │   ├── Stories/              # Story management
│   │   ├── StoryMentions/        # Story mention components
│   │   ├── Organizations/        # Org management
│   │   ├── Settings/             # App settings
│   │   └── ...
│   │
│   ├── pages/                    # Route pages (20)
│   │   ├── Index.tsx             # Dashboard
│   │   ├── Ambassadors.tsx
│   │   ├── Events.tsx
│   │   ├── Analytics.tsx
│   │   ├── Settings.tsx
│   │   └── ...
│   │
│   ├── hooks/                    # Custom hooks (31)
│   │   ├── useAuth.ts
│   │   ├── useCurrentOrganization.ts
│   │   ├── useInstagramConnection.ts
│   │   ├── useInstagramSync.ts
│   │   ├── useFiestas.ts
│   │   ├── useAmbassadorMetrics.ts
│   │   ├── useRealNotifications.ts
│   │   └── ...
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts         # Supabase client instance
│   │       └── types.ts          # Generated DB types
│   │
│   ├── lib/
│   │   └── utils.ts              # Utility functions (cn, etc.)
│   │
│   ├── types/                    # TypeScript type definitions
│   │
│   ├── i18n/                     # Internationalization
│   │   └── locales/
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
| `meta-oauth` | Handle OAuth authorization and token exchange |
| `instagram-token-status` | Check token validity and expiration |
| `disconnect-instagram` | Revoke Instagram connections |

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
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run preview      # Preview production build
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

### React Query Usage
All data fetching uses React Query with consistent patterns:
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['entity', id],
  queryFn: () => supabase.from('table').select('*'),
  staleTime: 10 * 60 * 1000, // 10 minutes
});
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
