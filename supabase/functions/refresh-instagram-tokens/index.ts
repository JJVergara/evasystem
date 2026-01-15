/**
 * Automated Instagram Token Refresh Function
 *
 * This function runs on a schedule (cron) to automatically refresh
 * Instagram long-lived tokens before they expire.
 *
 * Tokens are refreshed 7 days before expiry to ensure continuous service.
 */

import {
  corsHeaders,
  INSTAGRAM_TOKEN_REFRESH,
  DEFAULT_TOKEN_EXPIRY_MS,
} from '../shared/constants.ts';
import { corsPreflightResponse, jsonResponse } from '../shared/responses.ts';
import { createSupabaseClient } from '../shared/auth.ts';
import { encryptToken, safeDecryptToken } from '../shared/crypto.ts';

// Refresh tokens that expire within this many days
const TOKEN_REFRESH_THRESHOLD_DAYS = 7;

interface RefreshResult {
  type: 'organization' | 'ambassador';
  id: string;
  success: boolean;
  error?: string;
  newExpiry?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  console.log('=== INSTAGRAM TOKEN REFRESH CRON START ===');
  console.log('Timestamp:', new Date().toISOString());

  try {
    // Verify cron secret for security (prevent unauthorized calls)
    const cronSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization');

    // Allow both Bearer token and x-cron-secret header
    const providedSecret = authHeader?.replace('Bearer ', '') || req.headers.get('x-cron-secret');

    if (cronSecret && providedSecret !== cronSecret) {
      console.error('Unauthorized cron call - invalid secret');
      return jsonResponse(
        {
          error: 'unauthorized',
          message: 'Invalid cron secret',
        },
        { status: 401 }
      );
    }

    const supabase = createSupabaseClient();
    const results: RefreshResult[] = [];

    // Calculate threshold date (tokens expiring within 7 days)
    const thresholdDate = new Date(Date.now() + TOKEN_REFRESH_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();

    console.log('Checking for tokens expiring before:', thresholdDate.toISOString());

    // ===== REFRESH ORGANIZATION TOKENS =====
    const { data: expiringOrgTokens, error: orgQueryError } = await supabase
      .from('organization_instagram_tokens')
      .select('organization_id, access_token, token_expiry')
      .lt('token_expiry', thresholdDate.toISOString())
      .gt('token_expiry', now.toISOString());

    if (orgQueryError) {
      console.error('Error querying organization tokens:', orgQueryError);
    } else if (expiringOrgTokens && expiringOrgTokens.length > 0) {
      console.log(`Found ${expiringOrgTokens.length} organization tokens to refresh`);

      for (const tokenRecord of expiringOrgTokens) {
        const result = await refreshOrganizationToken(supabase, tokenRecord);
        results.push(result);
      }
    } else {
      console.log('No organization tokens need refreshing');
    }

    // ===== REFRESH AMBASSADOR TOKENS =====
    const { data: expiringAmbassadorTokens, error: ambassadorQueryError } = await supabase
      .from('ambassador_tokens')
      .select('embassador_id, access_token, token_expiry')
      .lt('token_expiry', thresholdDate.toISOString())
      .gt('token_expiry', now.toISOString());

    if (ambassadorQueryError) {
      console.error('Error querying ambassador tokens:', ambassadorQueryError);
    } else if (expiringAmbassadorTokens && expiringAmbassadorTokens.length > 0) {
      console.log(`Found ${expiringAmbassadorTokens.length} ambassador tokens to refresh`);

      for (const tokenRecord of expiringAmbassadorTokens) {
        const result = await refreshAmbassadorToken(supabase, tokenRecord);
        results.push(result);
      }
    } else {
      console.log('No ambassador tokens need refreshing');
    }

    // ===== CREATE NOTIFICATIONS FOR FAILURES =====
    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      console.log(`${failures.length} token refresh failures - creating notifications`);
      await createFailureNotifications(supabase, failures);
    }

    // ===== SUMMARY =====
    const summary = {
      timestamp: new Date().toISOString(),
      totalProcessed: results.length,
      successful: results.filter((r) => r.success).length,
      failed: failures.length,
      results: results.map((r) => ({
        type: r.type,
        id: r.id,
        success: r.success,
        error: r.error,
        newExpiry: r.newExpiry,
      })),
    };

    console.log('=== INSTAGRAM TOKEN REFRESH CRON COMPLETE ===');
    console.log('Summary:', JSON.stringify(summary, null, 2));

    return jsonResponse({
      success: true,
      message: 'Token refresh completed',
      summary,
    });
  } catch (error) {
    console.error('=== INSTAGRAM TOKEN REFRESH CRON ERROR ===');
    console.error('Error:', error);

    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

/**
 * Refresh a single organization token
 */
async function refreshOrganizationToken(
  supabase: ReturnType<typeof createSupabaseClient>,
  tokenRecord: { organization_id: string; access_token: string; token_expiry: string }
): Promise<RefreshResult> {
  const { organization_id, access_token, token_expiry } = tokenRecord;

  console.log(`Refreshing organization token: ${organization_id}`);
  console.log(`Current expiry: ${token_expiry}`);

  try {
    // Decrypt the current token
    const decryptedToken = await safeDecryptToken(access_token);

    // Call Instagram's refresh endpoint
    const newTokenData = await refreshInstagramToken(decryptedToken);

    // Encrypt the new token
    const encryptedNewToken = await encryptToken(newTokenData.access_token);

    // Calculate new expiry (use expires_in from response, default to 60 days)
    const newExpiryDate = new Date(
      Date.now() + (newTokenData.expires_in ?? DEFAULT_TOKEN_EXPIRY_MS / 1000) * 1000
    );

    // Update the token in database
    const { error: updateError } = await supabase
      .from('organization_instagram_tokens')
      .update({
        access_token: encryptedNewToken,
        token_expiry: newExpiryDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organization_id);

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    console.log(`Successfully refreshed organization token: ${organization_id}`);
    console.log(`New expiry: ${newExpiryDate.toISOString()}`);

    return {
      type: 'organization',
      id: organization_id,
      success: true,
      newExpiry: newExpiryDate.toISOString(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to refresh organization token ${organization_id}:`, errorMessage);

    return {
      type: 'organization',
      id: organization_id,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Refresh a single ambassador token
 */
async function refreshAmbassadorToken(
  supabase: ReturnType<typeof createSupabaseClient>,
  tokenRecord: { embassador_id: string; access_token: string; token_expiry: string }
): Promise<RefreshResult> {
  const { embassador_id, access_token, token_expiry } = tokenRecord;

  console.log(`Refreshing ambassador token: ${embassador_id}`);
  console.log(`Current expiry: ${token_expiry}`);

  try {
    // Decrypt the current token
    const decryptedToken = await safeDecryptToken(access_token);

    // Call Instagram's refresh endpoint
    const newTokenData = await refreshInstagramToken(decryptedToken);

    // Encrypt the new token
    const encryptedNewToken = await encryptToken(newTokenData.access_token);

    // Calculate new expiry
    const newExpiryDate = new Date(
      Date.now() + (newTokenData.expires_in ?? DEFAULT_TOKEN_EXPIRY_MS / 1000) * 1000
    );

    // Update the token in database
    const { error: updateError } = await supabase
      .from('ambassador_tokens')
      .update({
        access_token: encryptedNewToken,
        token_expiry: newExpiryDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('embassador_id', embassador_id);

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    console.log(`Successfully refreshed ambassador token: ${embassador_id}`);
    console.log(`New expiry: ${newExpiryDate.toISOString()}`);

    return {
      type: 'ambassador',
      id: embassador_id,
      success: true,
      newExpiry: newExpiryDate.toISOString(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to refresh ambassador token ${embassador_id}:`, errorMessage);

    return {
      type: 'ambassador',
      id: embassador_id,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Call Instagram's token refresh API
 */
async function refreshInstagramToken(accessToken: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const url =
    `${INSTAGRAM_TOKEN_REFRESH}?` +
    `grant_type=ig_refresh_token&` +
    `access_token=${encodeURIComponent(accessToken)}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.error) {
    console.error('Instagram token refresh error:', data.error || data);
    throw new Error(
      data.error?.message || data.error_message || 'Failed to refresh Instagram token'
    );
  }

  console.log('Instagram token refreshed successfully');
  return data;
}

/**
 * Create notifications for failed token refreshes
 */
async function createFailureNotifications(
  supabase: ReturnType<typeof createSupabaseClient>,
  failures: RefreshResult[]
): Promise<void> {
  for (const failure of failures) {
    try {
      let organizationId: string | null = null;

      if (failure.type === 'organization') {
        organizationId = failure.id;
      } else {
        // Get organization_id from ambassador
        const { data: ambassador } = await supabase
          .from('embassadors')
          .select('organization_id')
          .eq('id', failure.id)
          .single();

        organizationId = ambassador?.organization_id || null;
      }

      if (organizationId) {
        await supabase.from('notifications').insert({
          organization_id: organizationId,
          type: 'token_refresh_failed',
          title:
            failure.type === 'organization'
              ? 'Instagram Connection Needs Attention'
              : 'Ambassador Instagram Connection Needs Attention',
          message: `Failed to automatically refresh Instagram token. ${
            failure.type === 'ambassador'
              ? "Please reconnect the ambassador's Instagram account."
              : "Please reconnect your organization's Instagram account in Settings."
          } Error: ${failure.error}`,
          priority: 'high',
          metadata: {
            type: failure.type,
            entity_id: failure.id,
            error: failure.error,
          },
        });

        console.log(`Created failure notification for ${failure.type} ${failure.id}`);
      }
    } catch (notifError) {
      console.error(`Failed to create notification for ${failure.type} ${failure.id}:`, notifError);
    }
  }
}
