import {
  corsHeaders,
  INSTAGRAM_TOKEN_REFRESH,
  DEFAULT_TOKEN_EXPIRY_MS,
} from '../shared/constants.ts';
import { corsPreflightResponse, jsonResponse } from '../shared/responses.ts';
import { createSupabaseClient } from '../shared/auth.ts';
import { encryptToken, safeDecryptToken } from '../shared/crypto.ts';

const TOKEN_REFRESH_THRESHOLD_DAYS = 7;

interface RefreshResult {
  type: 'organization' | 'ambassador';
  id: string;
  success: boolean;
  error?: string;
  newExpiry?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    const cronSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization');

    const providedSecret = authHeader?.replace('Bearer ', '') || req.headers.get('x-cron-secret');

    if (cronSecret && providedSecret !== cronSecret) {
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

    const thresholdDate = new Date(Date.now() + TOKEN_REFRESH_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();

    const { data: expiringOrgTokens, error: orgQueryError } = await supabase
      .from('organization_instagram_tokens')
      .select('organization_id, access_token, token_expiry')
      .lt('token_expiry', thresholdDate.toISOString())
      .gt('token_expiry', now.toISOString());

    if (!orgQueryError && expiringOrgTokens && expiringOrgTokens.length > 0) {
      for (const tokenRecord of expiringOrgTokens) {
        const result = await refreshOrganizationToken(supabase, tokenRecord);
        results.push(result);
      }
    }

    const { data: expiringAmbassadorTokens, error: ambassadorQueryError } = await supabase
      .from('ambassador_tokens')
      .select('embassador_id, access_token, token_expiry')
      .lt('token_expiry', thresholdDate.toISOString())
      .gt('token_expiry', now.toISOString());

    if (!ambassadorQueryError && expiringAmbassadorTokens && expiringAmbassadorTokens.length > 0) {
      for (const tokenRecord of expiringAmbassadorTokens) {
        const result = await refreshAmbassadorToken(supabase, tokenRecord);
        results.push(result);
      }
    }

    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      await createFailureNotifications(supabase, failures);
    }

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

    return jsonResponse({
      success: true,
      message: 'Token refresh completed',
      summary,
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

async function refreshOrganizationToken(
  supabase: ReturnType<typeof createSupabaseClient>,
  tokenRecord: { organization_id: string; access_token: string; token_expiry: string }
): Promise<RefreshResult> {
  const { organization_id, access_token } = tokenRecord;

  try {
    const decryptedToken = await safeDecryptToken(access_token);

    const newTokenData = await refreshInstagramToken(decryptedToken);

    const encryptedNewToken = await encryptToken(newTokenData.access_token);

    const newExpiryDate = new Date(
      Date.now() + (newTokenData.expires_in ?? DEFAULT_TOKEN_EXPIRY_MS / 1000) * 1000
    );

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

    return {
      type: 'organization',
      id: organization_id,
      success: true,
      newExpiry: newExpiryDate.toISOString(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      type: 'organization',
      id: organization_id,
      success: false,
      error: errorMessage,
    };
  }
}

async function refreshAmbassadorToken(
  supabase: ReturnType<typeof createSupabaseClient>,
  tokenRecord: { embassador_id: string; access_token: string; token_expiry: string }
): Promise<RefreshResult> {
  const { embassador_id, access_token } = tokenRecord;

  try {
    const decryptedToken = await safeDecryptToken(access_token);

    const newTokenData = await refreshInstagramToken(decryptedToken);

    const encryptedNewToken = await encryptToken(newTokenData.access_token);

    const newExpiryDate = new Date(
      Date.now() + (newTokenData.expires_in ?? DEFAULT_TOKEN_EXPIRY_MS / 1000) * 1000
    );

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

    return {
      type: 'ambassador',
      id: embassador_id,
      success: true,
      newExpiry: newExpiryDate.toISOString(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      type: 'ambassador',
      id: embassador_id,
      success: false,
      error: errorMessage,
    };
  }
}

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
    throw new Error(
      data.error?.message || data.error_message || 'Failed to refresh Instagram token'
    );
  }

  return data;
}

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
      }
    } catch (notifError) {}
  }
}
