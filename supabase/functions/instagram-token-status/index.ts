import { corsHeaders, TOKEN_REFRESH_THRESHOLD_DAYS } from '../shared/constants.ts';
import { corsPreflightResponse, jsonResponse } from '../shared/responses.ts';
import { createSupabaseClient } from '../shared/auth.ts';
import { handleError } from '../shared/error-handler.ts';

const TOKEN_WARNING_THRESHOLD_DAYS = 14;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    const supabaseClient = createSupabaseClient();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({
        success: true,
        data: {
          isConnected: false,
          isTokenExpired: false,
          lastSync: null,
          username: null,
          tokenExpiryDate: null,
        },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return jsonResponse({
        success: true,
        data: {
          isConnected: false,
          isTokenExpired: false,
          lastSync: null,
          username: null,
          tokenExpiryDate: null,
        },
      });
    }

    const { data: userOrgs, error: orgsError } = await supabaseClient.rpc(
      'get_user_organizations',
      { user_auth_id: user.id }
    );

    if (orgsError || !userOrgs || userOrgs.length === 0) {
      return jsonResponse({
        success: true,
        data: {
          isConnected: false,
          isTokenExpired: false,
          lastSync: null,
          username: null,
          tokenExpiryDate: null,
        },
      });
    }

    const organizationId = userOrgs[0].organization_id;

    const { data: orgData, error: orgError } = await supabaseClient
      .from('organizations')
      .select('instagram_username, last_instagram_sync')
      .eq('id', organizationId)
      .single();

    if (orgError) {
      return jsonResponse({
        success: false,
        error: 'Organization data not found',
        error_type: 'database_error',
      });
    }

    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('organization_instagram_tokens')
      .select('token_expiry')
      .eq('organization_id', organizationId)
      .single();

    const hasToken = !tokenError && tokenData;

    const isConnected = !!hasToken;
    const now = new Date();
    const tokenExpiryDate =
      hasToken && tokenData.token_expiry ? new Date(tokenData.token_expiry) : null;
    const isTokenExpired = tokenExpiryDate ? tokenExpiryDate < now : false;

    let daysUntilExpiry: number | null = null;
    if (tokenExpiryDate && !isTokenExpired) {
      const msUntilExpiry = tokenExpiryDate.getTime() - now.getTime();
      daysUntilExpiry = Math.ceil(msUntilExpiry / (1000 * 60 * 60 * 24));
    }

    const needsRefresh =
      daysUntilExpiry !== null && daysUntilExpiry <= TOKEN_REFRESH_THRESHOLD_DAYS;

    const showWarning = daysUntilExpiry !== null && daysUntilExpiry <= TOKEN_WARNING_THRESHOLD_DAYS;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          isConnected,
          isTokenExpired,
          lastSync: orgData.last_instagram_sync,
          username: orgData.instagram_username,
          tokenExpiryDate: hasToken ? tokenData.token_expiry : null,
          daysUntilExpiry,
          needsRefresh,
          showWarning,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return handleError(error);
  }
});
