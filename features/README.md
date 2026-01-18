# EvaSystem Features Documentation

This folder contains detailed documentation for all implemented features in EvaSystem. Each file explains the logic, architecture, flows, and testing procedures for a specific feature.

---

## Feature Index

### Instagram Integration

| Feature | File | Status | Description |
|---------|------|--------|-------------|
| Story Verification | [story-verification.md](./story-verification.md) | ✅ Documented | 4-hour interval verification of ambassador stories |
| Instagram OAuth | `instagram-oauth.md` | ⏳ Pending | Organization and ambassador Instagram connection |
| Token Auto-Refresh | `token-auto-refresh.md` | ⏳ Pending | Automatic refresh of expiring tokens |
| Webhook Processing | `instagram-webhook.md` | ⏳ Pending | Real-time story mention detection |
| Story Insights Collection | `story-insights.md` | ⏳ Pending | Periodic collection of story metrics |

### Ambassador Management

| Feature | File | Status | Description |
|---------|------|--------|-------------|
| Ambassador CRUD | `ambassador-crud.md` | ⏳ Pending | Create, update, delete ambassadors |
| Ambassador Import | `ambassador-import.md` | ⏳ Pending | Bulk CSV import functionality |
| Ambassador Matching | `ambassador-matching.md` | ⏳ Pending | Auto-matching mentions to ambassadors |
| Ambassador Requests | `ambassador-requests.md` | ⏳ Pending | Ambassador application workflow |

### Events & Fiestas

| Feature | File | Status | Description |
|---------|------|--------|-------------|
| Event Management | `event-management.md` | ⏳ Pending | Event creation and lifecycle |
| Fiesta System | `fiesta-system.md` | ⏳ Pending | Party aggregation and tracking |
| Task Assignment | `task-assignment.md` | ⏳ Pending | Ambassador task management |

### Notifications

| Feature | File | Status | Description |
|---------|------|--------|-------------|
| Notification System | `notification-system.md` | ⏳ Pending | Real-time notification delivery |
| Notification Types | `notification-types.md` | ⏳ Pending | All notification types and triggers |

### Data Management

| Feature | File | Status | Description |
|---------|------|--------|-------------|
| Organization Export | `organization-export.md` | ⏳ Pending | Export organization data |
| Database Backup | `database-backup.md` | ⏳ Pending | Full database backup system |
| Data Restoration | `data-restoration.md` | ⏳ Pending | Restore from backup |

### Authentication & Security

| Feature | File | Status | Description |
|---------|------|--------|-------------|
| User Authentication | `user-auth.md` | ⏳ Pending | Email/password authentication |
| Organization Membership | `organization-membership.md` | ⏳ Pending | Multi-tenant access control |
| Token Encryption | `token-encryption.md` | ⏳ Pending | AES-GCM token encryption |

---

## Document Structure

Each feature document follows this structure:

```markdown
# Feature Name

## Overview
Brief description of what the feature does and why it exists.

## Architecture
Components, database tables, and their relationships.

## Flow Diagrams
Visual representation of the feature's logic using ASCII diagrams.

## State Machine (if applicable)
State transitions and conditions.

## Configuration
Constants, environment variables, and settings.

## Testing Scenarios
Step-by-step scenarios with expected outcomes.

## Manual Testing Commands
Curl commands and SQL queries for verification.

## Edge Cases Handled
List of edge cases and how they're handled.
```

---

## How to Add New Documentation

1. Create a new `.md` file in this folder
2. Follow the document structure above
3. Add the feature to the index table in this README
4. Include flow diagrams using ASCII art for clarity
5. Add testing commands and SQL queries

---

## Quick Reference

### Trigger Functions Manually

```bash
# Story verification
curl -X POST "https://awpfslcepylnipaolmvv.supabase.co/functions/v1/story-mentions-state-worker" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -d '{"type": "verification"}'

# Instagram sync
curl -X POST "https://awpfslcepylnipaolmvv.supabase.co/functions/v1/instagram-sync" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY"

# Collect story insights
curl -X POST "https://awpfslcepylnipaolmvv.supabase.co/functions/v1/collect-story-insights" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY"
```

### View Cron Job Status

```sql
-- List all cron jobs
SELECT jobname, schedule, command FROM cron.job;

-- View recent job runs
SELECT
  jobname,
  status,
  start_time,
  end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

### Check System Health

```sql
-- Token status
SELECT
  o.name,
  t.token_expiry,
  ROUND(EXTRACT(EPOCH FROM (t.token_expiry - NOW())) / 86400) as days_left
FROM organization_instagram_tokens t
JOIN organizations o ON o.id = t.organization_id;

-- Pending mentions
SELECT state, COUNT(*)
FROM social_mentions
WHERE mention_type = 'story_referral'
GROUP BY state;

-- Recent notifications
SELECT type, COUNT(*), MAX(created_at) as last_sent
FROM notifications
GROUP BY type
ORDER BY last_sent DESC;
```
