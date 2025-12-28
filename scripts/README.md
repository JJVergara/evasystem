# Test Scripts

## Party Selection Feature Tests

### Quick Start

1. **Set environment variables:**
```bash
export SUPABASE_URL="http://localhost:54321"  # or your production URL
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export TEST_ORGANIZATION_ID="your-org-uuid"
```

2. **Run tests:**

```bash
# Using shell script (simpler)
./scripts/test-party-selection.sh all

# Using TypeScript (more comprehensive)
npx ts-node scripts/test-party-selection.ts

# Interactive mode
npx ts-node scripts/test-party-selection.ts --interactive
```

### Shell Script Commands

```bash
./scripts/test-party-selection.sh parties   # List active parties
./scripts/test-party-selection.sh mention   # Simulate story mention
./scripts/test-party-selection.sh message   # Simulate message response
./scripts/test-party-selection.sh message "2"  # Select party #2
./scripts/test-party-selection.sh timeout   # Run timeout worker
./scripts/test-party-selection.sh status    # Check recent mentions
./scripts/test-party-selection.sh payload   # Print sample payloads
./scripts/test-party-selection.sh all       # Run all tests
```

### TypeScript Script Commands

```bash
# Run all tests
npx ts-node scripts/test-party-selection.ts

# Interactive mode (menu-driven)
npx ts-node scripts/test-party-selection.ts --interactive

# Just print payloads
npx ts-node scripts/test-party-selection.ts --payload
```

### Test Scenarios

#### Scenario 1: Single Active Party (Auto-match)
```bash
# 1. Set only 1 party as active in database
# 2. Run story mention test
./scripts/test-party-selection.sh mention

# 3. Check status - should show matched_fiesta_id set
./scripts/test-party-selection.sh status
```

#### Scenario 2: Multiple Active Parties (Quick Replies)
```bash
# 1. Set 2+ parties as active in database
# 2. Run story mention test
./scripts/test-party-selection.sh mention

# 3. Check status - should show party_selection_status = 'pending_response'
./scripts/test-party-selection.sh status

# 4. Simulate user selecting party #1
./scripts/test-party-selection.sh message "1"

# 5. Check status - should show party_selection_status = 'resolved'
./scripts/test-party-selection.sh status
```

#### Scenario 3: Timeout
```bash
# 1. Create a pending mention (via mention command)
# 2. Wait 4+ hours OR manually update the timestamp in DB
# 3. Run timeout worker
./scripts/test-party-selection.sh timeout

# 4. Check status - should show party_selection_status = 'timeout'
./scripts/test-party-selection.sh status
```

### Configuration

Edit the CONFIG section in the scripts to set your test values:

**Shell script (`test-party-selection.sh`):**
```bash
SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-your-key}"
ORGANIZATION_ID="${TEST_ORGANIZATION_ID:-your-org-id}"
INSTAGRAM_BUSINESS_ACCOUNT_ID="your-instagram-business-account-id"
```

**TypeScript (`test-party-selection.ts`):**
```typescript
const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL || 'http://localhost:54321',
  SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-key',
  TEST_ORGANIZATION_ID: process.env.TEST_ORGANIZATION_ID || 'your-org-id',
  // ...
};
```

### Debugging

**Check function logs:**
```bash
# Local
supabase functions logs instagram-webhook --local

# Production
supabase functions logs instagram-webhook
```

**Direct database queries:**
```sql
-- Check recent mentions
SELECT id, instagram_username, party_selection_status, matched_fiesta_id, created_at
FROM social_mentions
WHERE organization_id = 'your-org-id'
ORDER BY created_at DESC
LIMIT 10;

-- Check active parties
SELECT id, name, status FROM fiestas
WHERE organization_id = 'your-org-id' AND status = 'active';

-- Check notifications
SELECT type, message, created_at FROM notifications
WHERE type LIKE '%party%' OR type LIKE '%story_mention%'
ORDER BY created_at DESC
LIMIT 10;
```
