# EVA System - Development Guide

> **Important**: This is a **Vite + React + TypeScript** project, NOT Next.js.

## Quick Reference

```bash
# Development
pnpm dev              # Start dev server on port 8080
pnpm build            # Production build
pnpm preview          # Preview production build

# Testing
pnpm test             # Run unit tests (watch mode)
pnpm test:run         # Run unit tests (single run)
pnpm test:coverage    # Run tests with coverage
pnpm test:e2e         # Run E2E tests with Playwright
pnpm test:e2e:ui      # Run E2E tests with UI

# Supabase
supabase start        # Start local Supabase
supabase db push      # Push migrations
supabase functions serve  # Run edge functions locally
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

---

## Project Overview

EVA System is an Instagram ambassador management SaaS platform with:
- Multi-organization support (tenant isolation)
- Instagram OAuth integration
- Real-time notifications
- Story mentions tracking
- Event/party management
- Analytics dashboards

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Vite + React)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Pages      │  │  Components  │  │     Hooks            │   │
│  │  (routes)    │──│  (UI + feat) │──│ (state + logic)      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │   React Query     │                        │
│                    │  (cache + fetch)  │                        │
│                    └─────────┬─────────┘                        │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                      Supabase Backend                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  PostgreSQL  │  │    Auth      │  │   Edge Functions     │   │
│  │  (database)  │  │  (sessions)  │  │   (Deno serverless)  │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │     Realtime      │                        │
│                    │  (subscriptions)  │                        │
│                    └───────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
evasystem/
├── src/
│   ├── components/           # React components
│   │   ├── ui/               # Base UI components (shadcn/Radix)
│   │   ├── Layout/           # Layout infrastructure
│   │   ├── Auth/             # Authentication components
│   │   ├── Dashboard/        # Dashboard variations
│   │   ├── Organizations/    # Multi-org management
│   │   ├── Ambassadors/      # Ambassador features
│   │   ├── Stories/          # Instagram stories
│   │   ├── Events/           # Event management
│   │   ├── Fiestas/          # Party management
│   │   ├── Analytics/        # Analytics dashboards
│   │   └── [feature]/        # Other feature components
│   │
│   ├── hooks/                # Custom React hooks
│   │   ├── useAuth.ts        # Authentication state
│   │   ├── useCurrentOrganization.ts  # Org context
│   │   ├── useFiestas.ts     # Party CRUD operations
│   │   └── [feature].ts      # Feature-specific hooks
│   │
│   ├── services/             # Service layer (NEW)
│   │   ├── base.ts           # Base service with CRUD operations
│   │   ├── ambassadors.ts    # Ambassador service
│   │   ├── fiestas.ts        # Fiesta service
│   │   ├── organizations.ts  # Organization service
│   │   ├── notifications.ts  # Notification service
│   │   └── mentions.ts       # Social mentions service
│   │
│   ├── pages/                # Route-level components
│   │   ├── Index.tsx         # Landing/home
│   │   ├── Auth.tsx          # Login/signup
│   │   ├── Dashboard.tsx     # Main dashboard
│   │   └── [feature].tsx     # Feature pages
│   │
│   ├── types/                # Shared TypeScript types
│   │   ├── index.ts          # Central export
│   │   ├── entities.ts       # Database entity types
│   │   ├── api.ts            # API request/response types
│   │   └── storyMentions.ts  # Story mention types
│   │
│   ├── lib/                  # Utility functions
│   │   ├── utils.ts          # General utilities
│   │   └── errors.ts         # Centralized error handling
│   │
│   ├── test/                 # Test utilities (NEW)
│   │   ├── setup.ts          # Test setup
│   │   ├── utils.tsx         # Test render utilities
│   │   └── mocks/            # Mock data and services
│   │
│   ├── i18n/                 # Internationalization (ES/EN)
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts     # Supabase client instance
│   │       └── types.ts      # Auto-generated DB types
│   │
│   ├── App.tsx               # Root component + providers
│   └── main.tsx              # Entry point
│
├── e2e/                      # E2E tests (Playwright) (NEW)
│   ├── auth.spec.ts          # Authentication tests
│   └── fixtures.ts           # Test fixtures
│
├── supabase/
│   ├── functions/            # Edge functions (Deno)
│   │   ├── shared/           # Shared utilities
│   │   │   ├── auth.ts       # Auth helpers
│   │   │   ├── types.ts      # Shared types
│   │   │   ├── responses.ts  # Response helpers
│   │   │   └── constants.ts  # CORS, etc.
│   │   ├── instagram-webhook/
│   │   ├── meta-oauth/
│   │   └── [function-name]/
│   │
│   └── migrations/           # SQL migrations (timestamped)
│
├── public/                   # Static assets
├── vitest.config.ts          # Vitest configuration (NEW)
├── playwright.config.ts      # Playwright configuration (NEW)
└── [config files]            # vite, tailwind, tsconfig, etc.
```

---

## Naming Conventions

### Files

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `AmbassadorCard.tsx` |
| Hooks | camelCase with `use` prefix | `useAmbassadors.ts` |
| Pages | PascalCase | `Dashboard.tsx` |
| Utils | camelCase | `utils.ts` |
| Types | camelCase | `storyMentions.ts` |
| Edge Functions | kebab-case directories | `instagram-webhook/` |
| Migrations | timestamp prefix | `20251228000001_add_field.sql` |

### Code

```typescript
// Functions: verb-based camelCase
function fetchAmbassadors() {}
function createFiesta() {}
function handleSubmit() {}

// Event handlers: handle prefix
const handleClick = () => {};
const handleFormSubmit = () => {};

// Boolean variables: is/has/should prefix
const isLoading = true;
const hasPermission = false;
const shouldRefetch = true;

// Types/Interfaces: PascalCase
interface Ambassador {}
type OrganizationRole = 'admin' | 'member';

// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRIES = 3;
const API_BASE_URL = 'https://...';
```

---

## Component Patterns

### Page Structure

Every page follows this pattern:

```tsx
// pages/FeaturePage.tsx
import { lazy } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import MainLayout from '@/components/Layout/MainLayout';

const FeatureComponent = lazy(() => import('@/components/Feature/FeatureComponent'));

export default function FeaturePage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <FeatureComponent />
      </MainLayout>
    </ProtectedRoute>
  );
}
```

### Feature Component

```tsx
// components/Feature/FeatureList.tsx
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { useFeatureData } from '@/hooks/useFeatureData';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export function FeatureList() {
  const { currentOrganization } = useCurrentOrganization();
  const { data, isLoading, error } = useFeatureData(currentOrganization?.id);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <FeatureCard key={item.id} item={item} />
      ))}
    </div>
  );
}
```

### Custom Hook Pattern

```tsx
// hooks/useFeature.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FeatureItem {
  id: string;
  name: string;
  organization_id: string;
  created_at: string;
}

export function useFeature(organizationId: string | undefined) {
  const [items, setItems] = useState<FeatureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!organizationId) return;

    async function fetchItems() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('feature_items')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setItems(data || []);
      } catch (err) {
        console.error('Failed to fetch items:', err);
        setError(err as Error);
        toast.error('Failed to load items');
      } finally {
        setIsLoading(false);
      }
    }

    fetchItems();
  }, [organizationId]);

  const createItem = async (newItem: Omit<FeatureItem, 'id' | 'created_at' | 'organization_id'>) => {
    try {
      const { data, error } = await supabase
        .from('feature_items')
        .insert({ ...newItem, organization_id: organizationId })
        .select()
        .single();

      if (error) throw error;
      setItems((prev) => [data, ...prev]);
      toast.success('Item created');
      return data;
    } catch (err) {
      console.error('Failed to create item:', err);
      toast.error('Failed to create item');
      throw err;
    }
  };

  return { items, isLoading, error, createItem };
}
```

---

## Supabase Patterns

### Database Queries

```typescript
// Always filter by organization_id for multi-tenant isolation
const { data, error } = await supabase
  .from('ambassadors')
  .select('*, organization:organizations(name)')
  .eq('organization_id', organizationId)
  .order('created_at', { ascending: false });

// Use .single() when expecting exactly one row
const { data: org } = await supabase
  .from('organizations')
  .select('*')
  .eq('id', orgId)
  .single();

// Use .maybeSingle() when row might not exist
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();

// Use RPC for complex operations
const { data } = await supabase.rpc('get_user_organizations', {
  user_auth_id: userId
});
```

### Realtime Subscriptions

```typescript
useEffect(() => {
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev]);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [userId]);
```

### Edge Functions

```typescript
// supabase/functions/my-function/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../shared/responses.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ error: 'Invalid token' }, 401);
    }

    // Business logic here
    const body = await req.json();

    return jsonResponse({ success: true, data: result });
  } catch (error) {
    console.error('Function error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});
```

---

## State Management

### Global State (Hooks)

```
useAuth()                    → User session, sign in/out
useCurrentOrganization()     → Current org, org switching
useUserProfile()             → User profile data
```

### Server State (React Query)

```typescript
// Use React Query for server data that needs caching
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useAmbassadors(orgId: string) {
  return useQuery({
    queryKey: ['ambassadors', orgId],
    queryFn: () => fetchAmbassadors(orgId),
    enabled: !!orgId,
  });
}

export function useCreateAmbassador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAmbassador,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ambassadors'] });
      toast.success('Ambassador created');
    },
  });
}
```

### Local State

```typescript
// Use useState for UI-only state
const [isModalOpen, setIsModalOpen] = useState(false);
const [searchQuery, setSearchQuery] = useState('');
```

---

## Styling Guide

### Tailwind Classes

```tsx
// Layout
<div className="flex items-center justify-between gap-4">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Spacing
<div className="p-4 m-2 space-y-4">

// Typography
<h1 className="text-2xl font-bold text-foreground">
<p className="text-sm text-muted-foreground">

// Colors (use semantic colors)
className="bg-background text-foreground"
className="bg-primary text-primary-foreground"
className="bg-muted text-muted-foreground"

// Dark mode (automatic via class)
className="bg-white dark:bg-gray-900"

// Responsive
className="hidden md:block"
className="w-full sm:w-auto"
```

### Component Variants (CVA)

```typescript
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-input bg-background hover:bg-accent',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

---

## Critical Rules

### Multi-Tenant Isolation

**ALWAYS filter by `organization_id`** in database queries:

```typescript
// CORRECT
.eq('organization_id', currentOrganization.id)

// WRONG - exposes all organizations' data
.eq('user_id', userId)  // Without org filter
```

### Error Handling

```typescript
try {
  // Operation
} catch (error) {
  console.error('Context for debugging:', error);
  toast.error('User-friendly message');
  // Don't expose internal errors to users
}
```

### Type Safety

```typescript
// Regenerate types after schema changes
supabase gen types typescript --local > src/integrations/supabase/types.ts

// Use generated types
import { Database } from '@/integrations/supabase/types';
type Ambassador = Database['public']['Tables']['ambassadors']['Row'];
```

### Performance

```typescript
// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Use React Query for caching
useQuery({ queryKey: ['key'], queryFn, staleTime: 10 * 60 * 1000 });

// Virtualize long lists
import { FixedSizeList } from 'react-window';
```

---

## Common Patterns

### Form with Validation

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

type FormData = z.infer<typeof schema>;

function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    // Handle submit
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### Modal/Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

function FeatureModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Open Modal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modal Title</DialogTitle>
        </DialogHeader>
        {/* Content */}
      </DialogContent>
    </Dialog>
  );
}
```

### Protected API Call

```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { organizationId, ...params },
});

if (error) {
  toast.error('Operation failed');
  throw error;
}
```

---

## Environment Variables

```bash
# .env.local (frontend - must be prefixed with VITE_)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx

# Supabase Edge Functions (set via dashboard or CLI)
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
TOKEN_ENCRYPTION_KEY
META_APP_ID
META_APP_SECRET
INSTAGRAM_APP_ID
INSTAGRAM_APP_SECRET
WEBHOOK_VERIFY_TOKEN
CRON_SECRET
```

---

## Debugging

### Common Issues

1. **"Organization not found"** - Check `useCurrentOrganization` is loaded before making queries
2. **"Unauthorized"** - Verify auth token in edge function calls
3. **Type errors after schema change** - Regenerate types with `supabase gen types`
4. **Realtime not working** - Check RLS policies allow subscriptions

### Useful Commands

```bash
# Check Supabase logs
supabase functions logs function-name

# Test edge function locally
curl -X POST http://localhost:54321/functions/v1/function-name \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'

# Database queries
supabase db reset  # Reset to migrations
supabase migration new feature_name  # Create migration
```

---

## Service Layer (NEW)

The service layer abstracts Supabase operations from hooks and components:

```typescript
// Import services
import { ambassadorService, fiestaService, organizationService } from '@/services';

// Use in components or hooks
const ambassadors = await ambassadorService.getAll(organizationId);
const fiesta = await fiestaService.getById(fiestaId);

// Create with proper typing
const newAmbassador = await ambassadorService.create({
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  instagram_user: 'johndoe',
  organization_id: orgId,
});

// Update with partial data
await ambassadorService.update(ambassadorId, { status: 'active' });

// Delete
await ambassadorService.delete(ambassadorId);
```

### Available Services

| Service | Description |
|---------|-------------|
| `ambassadorService` | Ambassador CRUD, search, token management |
| `fiestaService` | Party CRUD, metrics, hashtag management |
| `organizationService` | Org CRUD, members, Instagram connection |
| `notificationService` | Notifications, read status, subscriptions |
| `mentionService` | Social mentions, filtering, stats |

---

## Centralized Error Handling (NEW)

Use `handleError` for consistent error handling across the app:

```typescript
import { handleError, AppError, ValidationError, NotFoundError } from '@/lib/errors';

// Basic usage
try {
  await someOperation();
} catch (error) {
  handleError('ComponentName.methodName', error);
}

// With options
handleError('ComponentName.methodName', error, {
  showToast: true,           // Show toast notification (default: true)
  customMessage: 'Custom message',  // Override error message
  context: { userId },       // Extra logging context
  rethrow: false,            // Rethrow after handling (default: false)
});

// Custom error types
throw new ValidationError('Invalid email format');
throw new NotFoundError('Ambassador', ambassadorId);
throw new UnauthorizedError('Token expired');

// Result type for operations
import { Result, success, failure } from '@/lib/errors';

async function fetchData(): Promise<Result<Data>> {
  try {
    const data = await api.getData();
    return success(data);
  } catch (error) {
    return failure(error as Error);
  }
}

// Usage
const result = await fetchData();
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

---

## Type Definitions (NEW)

Types are now organized in dedicated files:

```typescript
// Import from central export
import { Ambassador, Fiesta, Organization, Notification } from '@/types';

// Or from specific files
import type { AmbassadorWithOrganization, FiestaWithMetrics } from '@/types/entities';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

// Database types are derived from Supabase
type Ambassador = Tables['embassadors']['Row'];
type AmbassadorInsert = Tables['embassadors']['Insert'];
type AmbassadorUpdate = Tables['embassadors']['Update'];
```

### Type Files

| File | Contents |
|------|----------|
| `types/entities.ts` | Database entity types, relations |
| `types/api.ts` | API request/response, pagination |
| `types/storyMentions.ts` | Story mention specific types |
| `types/index.ts` | Central re-export |

---

## Testing (NEW)

### Unit Tests (Vitest)

```typescript
// src/lib/errors.test.ts
import { describe, it, expect, vi } from 'vitest';
import { handleError, success, failure } from './errors';

describe('handleError', () => {
  it('should log error and show toast', () => {
    const error = new Error('Test');
    handleError('TestContext', error);
    expect(toast.error).toHaveBeenCalled();
  });
});

// Run tests
pnpm test              # Watch mode
pnpm test:run          # Single run
pnpm test:coverage     # With coverage
```

### E2E Tests (Playwright)

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('should display login page', async ({ page }) => {
  await page.goto('/');
  await page.waitForURL(/\/auth/);
  await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
});

// Run E2E tests
pnpm test:e2e          # Run all
pnpm test:e2e:ui       # With UI
```

### Test Utilities

```typescript
// Render with providers
import { render, screen } from '@/test/utils';

test('renders component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});

// Mock Supabase
import { mockSupabaseClient, mockAmbassador } from '@/test/mocks/supabase';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));
```

---

## TypeScript Configuration

The project now uses **strict TypeScript**:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

This catches more errors at compile time. Common fixes:

```typescript
// Handle nullable values
const org = organization ?? defaultOrg;
if (!organization) return null;

// Type function parameters
function handleClick(event: React.MouseEvent<HTMLButtonElement>) {}

// Type async returns
async function fetchData(): Promise<Data | null> {}
```

---

## Tech Stack Summary

| Category | Technology |
|----------|------------|
| Framework | Vite + React 18 |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui + Radix UI |
| State | React Query + React Hooks |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| Forms | React Hook Form + Zod |
| Routing | React Router v6 |
| Unit Testing | Vitest + Testing Library |
| E2E Testing | Playwright |
| i18n | i18next |
| Icons | Lucide React |
| Charts | Recharts |
