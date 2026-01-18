# Story Verification System

## Overview

The Story Verification System monitors Instagram stories that mention the organization to ensure ambassadors keep their stories up for the full 24-hour lifecycle. It detects early deletions, distinguishes between public and private accounts, and identifies opportunities to request additional permissions.

---

## Why This Feature Exists

Instagram stories expire after 24 hours. When ambassadors tag the organization in their stories, we need to:

1. **Verify compliance** - Ensure stories stay up for the full 24h period
2. **Detect cheating** - Flag ambassadors who delete stories early
3. **Track visibility** - Know if we can access story insights (public vs private accounts)
4. **Request permissions** - Prompt public accounts to connect Instagram for better metrics

---

## Architecture

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| State Worker | `supabase/functions/story-mentions-state-worker/` | Main verification logic |
| Instagram API | `supabase/functions/shared/instagram-api.ts` | `verifyStoryExists()` function |
| Constants | `supabase/functions/shared/constants.ts` | Verification intervals config |
| Types | `supabase/functions/shared/types.ts` | `AccountVisibility`, `MentionUpdateData` |

### Database Tables

| Table | Relevant Columns |
|-------|------------------|
| `social_mentions` | `state`, `checks_count`, `last_check_at`, `account_visibility`, `permission_requested_at` |
| `organization_instagram_tokens` | `access_token`, `token_expiry` |
| `ambassador_tokens` | `embassador_id` (for permission detection) |
| `notifications` | Stores alerts for early deletes, verification failures, permission requests |

---

## Verification Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STORY LIFECYCLE (24 hours)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  0h        4h        8h        12h       16h       20h       23h      24h   │
│  │         │         │         │         │         │         │         │   │
│  ▼         ▼         ▼         ▼         ▼         ▼         ▼         ▼   │
│  📸        ✓         ✓         ✓         ✓         ✓         ✓         🏁   │
│  Story   Check 1  Check 2  Check 3  Check 4  Check 5  Check 6    Expires  │
│  Posted                                                                     │
│                                                                             │
│  Window: ±30 minutes around each checkpoint                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Verification Intervals

```typescript
VERIFICATION_INTERVALS = [240, 480, 720, 960, 1200, 1380] // minutes
// Translates to: 4h, 8h, 12h, 16h, 20h, 23h after story posted
```

Each interval has a ±30 minute window to catch stories that fall within range.

---

## State Machine

```
                                    ┌──────────────┐
                                    │     new      │
                                    │   (initial)  │
                                    └──────┬───────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
         ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
         │ flagged_early_   │   │  expired_unknown │   │    completed     │
         │     delete       │   │                  │   │                  │
         └──────────────────┘   └──────────────────┘   └──────────────────┘
                 │                       │                      │
                 │                       │                      │
         Story deleted           Private account or      Story stayed up
         before 24h              no permissions          full 24h
```

### State Transitions

| From | To | Condition |
|------|-----|-----------|
| `new` | `flagged_early_delete` | Story deleted AND age < 24h |
| `new` | `expired_unknown` | Private/no permission AND age < 24h |
| `new` | `completed` | Story expires naturally (age >= 24h) |

---

## Verification Results

The `verifyStoryExists()` function returns one of these results:

| Result | Meaning | Action |
|--------|---------|--------|
| `exists` | Story is still accessible | Mark `account_visibility: public`, continue monitoring |
| `deleted` | Story was deleted (was public) | Mark `account_visibility: public`, flag if < 24h |
| `private_or_no_permission` | Can't access (private account or no permissions) | Mark `account_visibility: private`, mark as `expired_unknown` |
| `rate_limited` | Instagram API rate limit | Skip update, retry next interval |
| `token_invalid` | Organization token expired | Mark as `expired_unknown` |
| `network_error` | Temporary network issue | Skip update, retry next interval |

### API Response Mapping

```typescript
// Instagram Graph API responses → Verification results

HTTP 200 OK                          → 'exists'
HTTP 404                             → 'deleted'
HTTP 500 + error_code: 2             → 'deleted' (Instagram returns this for non-existent stories)
HTTP 429                             → 'rate_limited'
error_code: 190                      → 'token_invalid'
error_code: 100 + "does not exist"   → 'deleted'
error_code: 100 + "permissions"      → 'private_or_no_permission'
```

---

## Account Visibility Detection

```
┌─────────────────────────────────────────────────────────────────┐
│                    VISIBILITY DETECTION LOGIC                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   verifyStoryExists() result          account_visibility        │
│   ─────────────────────────           ──────────────────        │
│                                                                 │
│   'exists'                     →      'public'                  │
│   'deleted'                    →      'public'                  │
│   'private_or_no_permission'   →      'private'                 │
│   'rate_limited'               →      (unchanged)               │
│   'network_error'              →      (unchanged)               │
│   'token_invalid'              →      (unchanged)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key insight:** If we can detect a story was deleted, we know the account was public (we had access before deletion).

---

## Permission Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│               PERMISSION REQUEST DECISION TREE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Is account public?                                            │
│        │                                                        │
│        ├── NO → Do nothing (can't get permissions anyway)       │
│        │                                                        │
│        └── YES → Is story still 'exists'?                       │
│                       │                                         │
│                       ├── NO → Do nothing (story gone)          │
│                       │                                         │
│                       └── YES → Has matched_ambassador_id?      │
│                                      │                          │
│                                      ├── NO → Do nothing        │
│                                      │                          │
│                                      └── YES → Already requested?│
│                                                    │             │
│                                                    ├── YES → Skip│
│                                                    │             │
│                                                    └── NO → Has token?
│                                                              │   │
│                                                              │   │
│                                              YES → Skip      NO → CREATE
│                                              (already has)       NOTIFICATION
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Notifications Generated

| Type | Priority | Trigger | Message |
|------|----------|---------|---------|
| `story_early_delete` | medium | Story deleted before 24h | "Historia de @{username} fue eliminada antes de 24h" |
| `story_verification_failed` | low | Private account or no permissions | "No se pudo verificar la historia de @{username} (cuenta privada o sin permisos)" |
| `ambassador_permission_request` | normal | Public account without token | "@{username} tiene cuenta pública pero no ha conectado Instagram. Envíale el link de conexión para obtener más métricas." |
| `story_mention_completed` | low | Story completed 24h cycle | "Historia de @{username} completó su ciclo de 24h" |

---

## Cron Jobs

| Job | Schedule | Function | Payload |
|-----|----------|----------|---------|
| `verify-story-mentions` | `0 * * * *` (hourly) | `story-mentions-state-worker` | `{"type": "verification"}` |
| `story-mentions-expiry-worker` | `*/10 * * * *` (every 10 min) | `story-mentions-state-worker` | `{"type": "expiry"}` |

---

## Testing Scenarios

### Scenario 1: Happy Path (Story Completes 24h)

```
Timeline:
  T+0h   : Ambassador posts story → webhook creates mention (state: new)
  T+4h   : Verification check → exists, account_visibility: public
  T+8h   : Verification check → exists
  T+12h  : Verification check → exists
  T+16h  : Verification check → exists
  T+20h  : Verification check → exists
  T+23h  : Verification check → exists
  T+24h  : Expiry check → state: completed, final insights saved

Expected DB state:
  - state: 'completed'
  - processed: true
  - account_visibility: 'public'
  - checks_count: 6
```

### Scenario 2: Early Delete

```
Timeline:
  T+0h   : Ambassador posts story → mention created (state: new)
  T+4h   : Verification check → exists, account_visibility: public
  T+6h   : Ambassador deletes story
  T+8h   : Verification check → deleted → state: flagged_early_delete

Expected DB state:
  - state: 'flagged_early_delete'
  - processed: true
  - account_visibility: 'public'
  - checks_count: 2

Notification created: story_early_delete
```

### Scenario 3: Private Account

```
Timeline:
  T+0h   : Ambassador (private account) posts story → mention created
  T+4h   : Verification check → private_or_no_permission → state: expired_unknown

Expected DB state:
  - state: 'expired_unknown'
  - processed: true
  - account_visibility: 'private'
  - checks_count: 1

Notification created: story_verification_failed
```

### Scenario 4: Permission Request

```
Timeline:
  T+0h   : Ambassador (public, no token) posts story → mention created
  T+4h   : Verification check → exists → permission request created

Expected DB state:
  - state: 'new' (still monitoring)
  - account_visibility: 'public'
  - permission_requested_at: (timestamp)
  - checks_count: 1

Notification created: ambassador_permission_request
```

---

## Manual Testing Commands

### Trigger Verification Check

```bash
curl -X POST "https://awpfslcepylnipaolmvv.supabase.co/functions/v1/story-mentions-state-worker" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{"type": "verification"}'
```

### Trigger Expiry Check

```bash
curl -X POST "https://awpfslcepylnipaolmvv.supabase.co/functions/v1/story-mentions-state-worker" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{"type": "expiry"}'
```

### Check Mention State

```sql
SELECT
  id,
  instagram_username,
  state,
  checks_count,
  account_visibility,
  permission_requested_at,
  mentioned_at,
  expires_at
FROM social_mentions
WHERE mention_type = 'story_referral'
ORDER BY mentioned_at DESC
LIMIT 10;
```

### Check Recent Notifications

```sql
SELECT
  type,
  message,
  priority,
  created_at
FROM notifications
WHERE type IN ('story_early_delete', 'story_verification_failed', 'ambassador_permission_request', 'story_mention_completed')
ORDER BY created_at DESC
LIMIT 10;
```

---

## Configuration

### Constants (`supabase/functions/shared/constants.ts`)

```typescript
export const VERIFICATION_INTERVALS = [240, 480, 720, 960, 1200, 1380] as const;
export const MAX_VERIFICATION_CHECKS = VERIFICATION_INTERVALS.length;
```

### Database Columns

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `account_visibility` | TEXT | 'unknown' | 'unknown', 'public', 'private' |
| `permission_requested_at` | TIMESTAMPTZ | NULL | When permission request notification was sent |
| `checks_count` | INTEGER | 0 | Number of verification checks performed |
| `last_check_at` | TIMESTAMPTZ | NULL | Timestamp of last verification check |

---

## Edge Cases Handled

1. **No Instagram token for organization** - Verification defaults to `network_error`, skipped
2. **Expired organization token** - Detected via `token_invalid`, mention marked `expired_unknown`
3. **Rate limited by Instagram** - Skipped, retried at next interval
4. **Network failures** - Skipped, retried at next interval
5. **Story ID missing** - Verification skipped for that mention
6. **Ambassador already has token** - Permission request not created
7. **Permission already requested** - Not requested again (checks `permission_requested_at`)
8. **Instagram returns 500 error** - Treated as `deleted` (common for non-existent stories)
