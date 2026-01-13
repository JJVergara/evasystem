# BUG: Instagram OAuth saves wrong ID for webhook matching

## Status: FIXED (2026-01-13)

## Problem

When an organization connects their Instagram account via OAuth, the system saves an Instagram User ID that **does not match** the ID that Instagram sends in webhooks.

### What happens:
1. User connects Instagram via OAuth flow (`meta-oauth` edge function)
2. OAuth fetches profile from `/me` endpoint and saves `user_id` to database
3. Later, when someone tags the account in a story, Instagram sends a webhook
4. The webhook `entry.id` contains a **different ID** than what was saved during OAuth
5. Organization lookup fails: "Organization not found for Instagram user: XXXXX"

### Evidence:
- OAuth saves ID like: `25763909063205539`
- Webhook sends ID like: `17841480212503530`
- Both refer to the same Instagram account (`@pruebaevasystem`)

## Root Cause

Instagram has multiple ID types:
- **Instagram User ID** - returned by `/me?fields=user_id`
- **Instagram Business Account ID** - used in webhooks and some API calls
- **Instagram Scoped ID** - may vary based on API version or context

The OAuth flow in `supabase/functions/meta-oauth/index.ts` fetches:
```typescript
const userResponse = await fetch(
  `${INSTAGRAM_API_BASE}/me?fields=user_id,username,name,profile_picture_url,followers_count&access_token=${tokenData.access_token}`
);
const userData = await userResponse.json();

// Saves:
instagram_user_id: userData.user_id || userData.id,
instagram_business_account_id: userData.user_id || userData.id,
```

But the webhook sends a different ID in `entry.id`.

## Temporary Workaround

Manually update the organization after OAuth connection:

```sql
UPDATE organizations
SET instagram_user_id = '<WEBHOOK_ENTRY_ID>',
    instagram_business_account_id = '<WEBHOOK_ENTRY_ID>'
WHERE instagram_username = '<USERNAME>';
```

Get `<WEBHOOK_ENTRY_ID>` from the Supabase function logs when a webhook fires.

## Proposed Fix

### Option A: Fetch the correct ID during OAuth

After getting the user token, make an additional API call to get the Instagram Business Account ID:

```typescript
// Get the Instagram Business Account ID (used in webhooks)
const accountResponse = await fetch(
  `${INSTAGRAM_API_BASE}/me?fields=id,instagram_business_account&access_token=${tokenData.access_token}`
);
```

Or try different field combinations to get the webhook-compatible ID.

### Option B: Store both IDs and query with OR

Modify the webhook handler to query by multiple ID fields:

```typescript
const { data: organization } = await supabase
  .from('organizations')
  .select('*')
  .or(`instagram_user_id.eq.${instagramUserId},instagram_business_account_id.eq.${instagramUserId}`)
  .maybeSingle();
```

### Option C: Update ID on first webhook

When a webhook arrives and organization is not found:
1. Try to match by `instagram_username` instead
2. If found, update the `instagram_user_id` to match the webhook ID
3. Log this auto-correction for visibility

## Files to Modify

- `supabase/functions/meta-oauth/index.ts` - OAuth token exchange and ID storage
- `supabase/functions/instagram-webhook/index.ts` - Organization lookup logic
- `supabase/functions/shared/constants.ts` - API field configurations (if needed)

## Related

- Instagram Graph API docs: https://developers.facebook.com/docs/instagram-api/
- Instagram Business Account ID: Different from regular User ID for business accounts

## Priority

**HIGH** - This bug breaks the auto-response feature for any new organization that connects Instagram.

---

*Created: 2026-01-13*
*Last manual fix: Updated `pruebaevasystem` org with ID `17841480212503530`*

---

## FIX APPLIED (2026-01-13)

### Root Cause Identified

Instagram API returns TWO different IDs:
- `userData.id` = App-scoped User ID (varies per app, NOT for webhook matching)
- `userData.user_id` = Instagram User ID (this is what webhooks send in `entry.id`!)

Debug log showed:
```
id: "25763909063205539"      <- App-scoped ID (wrong for webhooks)
user_id: "17841480212503530" <- Instagram User ID (matches webhook entry.id)
```

The original code used:
```typescript
instagram_user_id: userData.id  // WRONG: uses app-scoped ID
```

### Fix Applied

Changed to:
```typescript
instagram_user_id: userData.user_id || userData.id  // CORRECT: prioritizes user_id for webhook matching
```

### File Modified
- `supabase/functions/meta-oauth/index.ts` (lines 560-565)

### Verification
After reconnecting Instagram, the debug log should show:
```
DEBUG: Instagram /me API response: { id: "25763909063205539", user_id: "17841480212503530", ... }
```

The `user_id` field should match what webhooks send in `entry.id`.
