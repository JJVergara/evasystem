import {
  corsHeaders,
  INSTAGRAM_API_BASE,
  INSTAGRAM_OAUTH_AUTHORIZE,
  INSTAGRAM_OAUTH_TOKEN,
  INSTAGRAM_TOKEN_EXCHANGE,
  INSTAGRAM_TOKEN_REFRESH,
  INSTAGRAM_SCOPES,
} from '../shared/constants.ts';
import { corsPreflightResponse, jsonResponse } from '../shared/responses.ts';
import { createSupabaseClient } from '../shared/auth.ts';
import { encryptToken, safeDecryptToken } from '../shared/crypto.ts';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }
  try {
    const supabaseClient = createSupabaseClient();
    const url = new URL(req.url);
    let action = url.searchParams.get('action');
    if (!action) {
      try {
        const body = await req.clone().json();
        if (typeof body?.action === 'string') {
          action = body.action;
        }
      } catch {}
    }
    switch (action) {
      case 'authorize':
        return handleAuthorize(req, supabaseClient);
      case 'callback':
        return handleCallback(req, supabaseClient);
      case 'refresh':
        return handleTokenRefresh(req, supabaseClient);
      case 'diagnose':
        return handleDiagnose(req, supabaseClient);
      default:
        return new Response(
          JSON.stringify({
            error: 'invalid_action',
            error_description: 'Invalid or missing action parameter',
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return new Response(
      JSON.stringify({
        error: 'server_error',
        error_description: 'Internal server error',
        debug_info: errorMessage,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
async function handleAuthorize(req, supabaseClient) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
    if (!token) {
      return jsonResponse(
        {
          error: 'unauthorized',
          error_description: 'Missing auth token',
        },
        {
          status: 401,
        }
      );
    }
    const {
      data: { user: authUser },
    } = await supabaseClient.auth.getUser(token);
    if (!authUser) {
      return jsonResponse(
        {
          error: 'unauthorized',
          error_description: 'Invalid auth token',
        },
        {
          status: 401,
        }
      );
    }
    const body = await req.json();
    const { type, ambassador_id, organization_id, redirect_base } = body;
    if (!type || !organization_id) {
      return jsonResponse(
        {
          error: 'invalid_request',
          error_description: 'type and organization_id are required',
        },
        {
          status: 400,
        }
      );
    }
    if (type === 'ambassador' && !ambassador_id) {
      return jsonResponse(
        {
          error: 'invalid_request',
          error_description: 'ambassador_id is required for ambassador flow',
        },
        {
          status: 400,
        }
      );
    }
    const { data: membership, error: membershipError } = await supabaseClient
      .from('organization_members')
      .select('id, organization_id, status, permissions')
      .eq('user_id', authUser.id)
      .eq('organization_id', organization_id)
      .eq('status', 'active')
      .single();
    if (membershipError || !membership) {
      return jsonResponse(
        {
          error: 'forbidden',
          error_description: 'No access to this organization',
        },
        {
          status: 403,
        }
      );
    }
    const perms = membership.permissions || {};
    const canManageAmbassadors =
      perms.manage_ambassadors === true || perms.manage_instagram === true;
    if (!canManageAmbassadors && type === 'ambassador') {
      return jsonResponse(
        {
          error: 'forbidden',
          error_description:
            'You do not have permissions to manage ambassadors for this organization',
        },
        {
          status: 403,
        }
      );
    }
    const { data: appUser } = await supabaseClient
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single();
    const appId = Deno.env.get('INSTAGRAM_APP_ID');
    const appSecret = Deno.env.get('INSTAGRAM_APP_SECRET');
    const REDIRECT_URI = `https://evasystem-psi.vercel.app/meta-oauth`;
    if (!appId || !appSecret) {
      return jsonResponse(
        {
          error: 'configuration_error',
          error_description:
            'Instagram connection is not available. Instagram App credentials are not configured.',
        },
        {
          status: 500,
        }
      );
    }
    const statePayload =
      type === 'ambassador'
        ? {
            type: 'ambassador',
            ambassador_id,
            organization_id,
            auth_user_id: authUser.id,
            redirect_base: redirect_base || 'https://evasystem-psi.vercel.app/ambassadors',
            nonce: crypto.randomUUID(),
          }
        : {
            type: 'organization',
            organization_id,
            auth_user_id: authUser.id,
            redirect_base: redirect_base || 'https://evasystem-psi.vercel.app/settings',
            nonce: crypto.randomUUID(),
          };
    const state = btoa(JSON.stringify(statePayload));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: stateError } = await supabaseClient.from('oauth_states').insert({
      state,
      user_id: appUser?.id ?? null,
      ambassador_id: type === 'ambassador' ? ambassador_id : null,
      organization_id,
      type,
      redirect_base: redirect_base || null,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
    });
    if (stateError) {
      return jsonResponse(
        {
          error: 'database_error',
          error_description: `Failed to initialize Instagram connection: ${stateError.message || 'Database error'}`,
        },
        {
          status: 500,
        }
      );
    }
    const authUrl =
      `${INSTAGRAM_OAUTH_AUTHORIZE}?` +
      `client_id=${encodeURIComponent(appId)}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(INSTAGRAM_SCOPES)}&` +
      `state=${encodeURIComponent(state)}`;
    return jsonResponse({
      authUrl,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: 'authorization_failed',
        error_description: `Failed to create Instagram authorization: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      {
        status: 500,
      }
    );
  }
}
async function handleCallback(req, supabaseClient) {
  let code;
  let state;
  let metaError;
  let isProxyCall = false;
  try {
    const body = await req.json();
    if (body.action === 'callback') {
      code = body.code;
      state = body.state;
      metaError = body.error;
      isProxyCall = true;
    }
  } catch {
    isProxyCall = false;
  }
  if (!isProxyCall) {
    return jsonResponse(
      {
        success: false,
        error: 'unsupported_flow',
        error_description:
          'Direct callbacks are not supported. Use the frontend /meta-oauth proxy route.',
      },
      {
        status: 400,
      }
    );
  }
  if (metaError) {
    return jsonResponse(
      {
        success: false,
        error: 'meta_oauth_error',
        error_description: 'Authorization failed on Instagram side',
        debug_info: metaError,
      },
      {
        status: 200,
      }
    );
  }
  if (!code || !state) {
    const errorMsg = 'Missing authorization code or state';
    return jsonResponse(
      {
        success: false,
        error: 'invalid_request',
        error_description: errorMsg,
      },
      {
        status: 400,
      }
    );
  }
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
    if (!token) {
      return jsonResponse(
        {
          success: false,
          error: 'unauthorized',
          error_description: 'Missing auth token',
        },
        {
          status: 401,
        }
      );
    }
    const {
      data: { user: authUser },
    } = await supabaseClient.auth.getUser(token);
    if (!authUser) {
      return jsonResponse(
        {
          success: false,
          error: 'unauthorized',
          error_description: 'Invalid auth token',
        },
        {
          status: 401,
        }
      );
    }
    const { data: stateData, error: stateError } = await supabaseClient
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .single();
    if (stateError || !stateData) {
      const errorMsg = 'Invalid or expired authorization state';
      return jsonResponse(
        {
          success: false,
          error: 'invalid_state',
          error_description: errorMsg,
        },
        {
          status: 400,
        }
      );
    }
    let decoded;
    try {
      decoded = JSON.parse(atob(state));
    } catch (e) {
      return jsonResponse(
        {
          success: false,
          error: 'invalid_state',
          error_description: 'Malformed state payload',
        },
        {
          status: 400,
        }
      );
    }
    if (decoded.auth_user_id !== authUser.id) {
      return jsonResponse(
        {
          success: false,
          error: 'forbidden',
          error_description: 'State does not belong to this user',
        },
        {
          status: 403,
        }
      );
    }
    const tokenData = await exchangeCodeForToken(code);
    if (stateData.type === 'ambassador') {
      const ambassadorId = stateData.ambassador_id ?? decoded.ambassador_id ?? null;
      if (!ambassadorId) {
        return jsonResponse(
          {
            success: false,
            error: 'invalid_state',
            error_description: 'Missing ambassador_id in state for ambassador connection',
          },
          {
            status: 400,
          }
        );
      }
      await updateAmbassadorInstagramData(supabaseClient, ambassadorId, tokenData);
      await supabaseClient.from('oauth_states').delete().eq('state', state);
      return jsonResponse(
        {
          success: true,
          message: 'Instagram connected successfully',
          type: 'ambassador',
          timestamp: new Date().toISOString(),
        },
        {
          status: 200,
        }
      );
    }
    if (stateData.type === 'organization') {
      const organizationId = stateData.organization_id ?? decoded.organization_id ?? null;
      if (!organizationId) {
        return jsonResponse(
          {
            success: false,
            error: 'invalid_state',
            error_description: 'Missing organization_id in state for organization connection',
          },
          {
            status: 400,
          }
        );
      }
      const { data: isMember, error: memberError } = await supabaseClient.rpc(
        'is_organization_member',
        {
          user_auth_id: authUser.id,
          org_id: organizationId,
        }
      );
      if (memberError || !isMember) {
        return jsonResponse(
          {
            success: false,
            error: 'forbidden',
            error_description: 'No access to this organization',
          },
          {
            status: 403,
          }
        );
      }
      await updateOrganizationInstagramData(supabaseClient, organizationId, tokenData);
      await supabaseClient.from('oauth_states').delete().eq('state', state);
      return jsonResponse(
        {
          success: true,
          message: 'Instagram connected successfully',
          type: 'organization',
          timestamp: new Date().toISOString(),
        },
        {
          status: 200,
        }
      );
    }
    return jsonResponse(
      {
        success: false,
        error: 'unknown_type',
        error_description: `Unsupported connection type: ${stateData.type}`,
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    const err = error;
    let errorType = 'token_exchange_failed';
    let errorMsg = 'Failed to process Instagram authorization';
    let debugInfo = err?.message ?? String(error);
    if (err?.message?.includes('Short-lived token exchange failed')) {
      errorType = 'meta_api_error';
      errorMsg =
        'Instagram API rejected the authorization code. This could be due to expired state, mismatched redirect URI, or invalid App configuration.';
      debugInfo = `Instagram API Error: ${err.message}`;
    } else if (err?.message?.includes('Invalid time value')) {
      errorType = 'token_processing_error';
      errorMsg = 'Error processing token expiration data from Instagram API.';
      debugInfo = 'Token expiry calculation failed - Instagram API may have returned invalid data';
    } else if (err?.message?.includes('Failed to store')) {
      errorType = 'database_error';
      errorMsg = 'Error saving Instagram connection data.';
      debugInfo = `Database Error: ${err.message}`;
    }
    return jsonResponse(
      {
        success: false,
        error: errorType,
        error_description: errorMsg,
        debug_info: debugInfo,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
      }
    );
  }
}
async function exchangeCodeForToken(code) {
  const appId = Deno.env.get('INSTAGRAM_APP_ID');
  const appSecret = Deno.env.get('INSTAGRAM_APP_SECRET');
  const REDIRECT_URI = 'https://evasystem-psi.vercel.app/meta-oauth';
  const shortRes = await fetch(INSTAGRAM_OAUTH_TOKEN, {
    method: 'POST',
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
      code: code,
    }),
  });
  const shortData = await shortRes.json();
  if (!shortRes.ok || shortData.error) {
    throw new Error(
      `Short-lived token exchange failed: ${shortData.error?.message || shortData.error_description || 'Unknown error'}`
    );
  }
  const longUrl =
    `${INSTAGRAM_TOKEN_EXCHANGE}` +
    `?grant_type=ig_exchange_token` +
    `&client_secret=${encodeURIComponent(appSecret)}` +
    `&access_token=${encodeURIComponent(shortData.access_token)}`;
  const longRes = await fetch(longUrl);
  const longData = await longRes.json();
  if (!longRes.ok || longData.error) {
    throw new Error(
      `Long-lived token exchange failed: ${longData.error?.message || longData.error_description || 'Unknown error'}`
    );
  }
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + (longData.expires_in ?? 60 * 24 * 60 * 60));
  return {
    access_token: longData.access_token,
    token_type: longData.token_type || 'bearer',
    expires_in: longData.expires_in,
    expires_at: expiresAt.toISOString(),
  };
}
async function updateAmbassadorInstagramData(supabaseClient, ambassadorId, tokenData) {
  if (!tokenData.access_token) {
    throw new Error('No access token provided');
  }
  const userResponse = await fetch(
    `${INSTAGRAM_API_BASE}/me?fields=user_id,username,name,profile_picture_url,followers_count&access_token=${encodeURIComponent(tokenData.access_token)}`
  );
  const userData = await userResponse.json();
  if (!userResponse.ok || userData.error) {
    throw new Error(userData.error?.message || 'Failed to fetch Instagram user profile data');
  }
  const instagramData = {
    instagram_user_id: userData.user_id || userData.id,
    instagram_user: userData.username,
    follower_count: userData.followers_count || 0,
    profile_picture_url: userData.profile_picture_url,
  };
  const expiryDate = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const encryptedToken = await encryptToken(tokenData.access_token);
  const { error: tokenError } = await supabaseClient.from('ambassador_tokens').upsert(
    {
      embassador_id: ambassadorId,
      access_token: encryptedToken,
      token_expiry: expiryDate.toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'embassador_id',
    }
  );
  if (tokenError) {
    throw new Error('Failed to store ambassador token');
  }
  const { error: updateError } = await supabaseClient
    .from('embassadors')
    .update({
      last_instagram_sync: new Date().toISOString(),
      instagram_user: instagramData.instagram_user,
      instagram_user_id: instagramData.instagram_user_id,
      follower_count: instagramData.follower_count ?? 0,
      profile_picture_url: instagramData.profile_picture_url ?? null,
    })
    .eq('id', ambassadorId);
  if (updateError) {
    throw new Error('Failed to update ambassador data');
  }
}
async function updateOrganizationInstagramData(supabaseClient, organizationId, tokenData) {
  if (!tokenData.access_token) {
    throw new Error('No access token provided');
  }
  const userResponse = await fetch(
    `${INSTAGRAM_API_BASE}/me?fields=id,user_id,username,name,profile_picture_url,followers_count&access_token=${encodeURIComponent(tokenData.access_token)}`
  );
  const userData = await userResponse.json();
  if (!userResponse.ok || userData.error) {
    throw new Error(userData.error?.message || 'Failed to fetch Instagram user profile data');
  }
  const instagramData = {
    facebook_page_id: '',
    instagram_business_account_id: userData.user_id || userData.id,
    instagram_username: userData.username,
    instagram_user_id: userData.user_id || userData.id,
  };
  const expiryDate = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const encryptedToken = await encryptToken(tokenData.access_token);
  const { error: tokenError } = await supabaseClient.from('organization_instagram_tokens').upsert(
    {
      organization_id: organizationId,
      access_token: encryptedToken,
      token_expiry: expiryDate.toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'organization_id',
    }
  );
  if (tokenError) {
    throw new Error('Failed to store organization token');
  }
  const { error: updateError } = await supabaseClient
    .from('organizations')
    .update({
      last_instagram_sync: new Date().toISOString(),
      facebook_page_id: null,
      instagram_business_account_id: instagramData.instagram_business_account_id,
      instagram_username: instagramData.instagram_username,
      instagram_user_id: instagramData.instagram_user_id,
    })
    .eq('id', organizationId);
  if (updateError) {
    throw new Error('Failed to update organization data');
  }
  try {
    if (instagramData.instagram_business_account_id) {
      const igWebhookResponse = await fetch(
        `${INSTAGRAM_API_BASE}/${instagramData.instagram_business_account_id}/subscribed_apps`,
        {
          method: 'POST',
          body: new URLSearchParams({
            subscribed_fields: 'mentions,comments,story_insights',
            access_token: tokenData.access_token,
          }),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      const igWebhookData = await igWebhookResponse.json();
    }
  } catch {}
}
async function handleTokenRefresh(req, supabaseClient) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw new Error('Unauthorized');
    }
    const { organization_id, ambassador_id } = await req.json();
    if (organization_id) {
      const { data: membership, error: memberError } = await supabaseClient
        .from('organization_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', organization_id)
        .eq('status', 'active')
        .single();
      if (memberError || !membership) {
        throw new Error('Unauthorized to refresh this organization token');
      }
      const { data: tokenData, error: tokenError } = await supabaseClient
        .from('organization_instagram_tokens')
        .select('access_token')
        .eq('organization_id', organization_id)
        .single();
      if (tokenError || !tokenData?.access_token) {
        throw new Error('No token found for organization');
      }
      const decryptedToken = await safeDecryptToken(tokenData.access_token);
      const newTokenData = await exchangeTokenForLongLived(decryptedToken);
      const encryptedNewToken = await encryptToken(newTokenData.access_token);
      const expiresAt = new Date(
        Date.now() + (newTokenData.expires_in ?? 60 * 24 * 60 * 60) * 1000
      ).toISOString();
      const { error: updateError } = await supabaseClient
        .from('organization_instagram_tokens')
        .update({
          access_token: encryptedNewToken,
          token_expiry: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', organization_id);
      if (updateError) {
        throw new Error('Failed to update organization token');
      }
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Organization token refreshed successfully',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200,
        }
      );
    }
    if (ambassador_id) {
      const { data: ambassadorData, error: ambassadorError } = await supabaseClient
        .from('embassadors')
        .select('organization_id')
        .eq('id', ambassador_id)
        .single();
      if (ambassadorError || !ambassadorData) {
        throw new Error('Ambassador not found');
      }
      const { data: membership, error: memberError } = await supabaseClient
        .from('organization_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', ambassadorData.organization_id)
        .eq('status', 'active')
        .single();
      if (memberError || !membership) {
        throw new Error('Unauthorized to refresh this ambassador token');
      }
      const { data: tokenData, error: tokenError } = await supabaseClient
        .from('ambassador_tokens')
        .select('access_token')
        .eq('embassador_id', ambassador_id)
        .single();
      if (tokenError || !tokenData?.access_token) {
        throw new Error('No token found for ambassador');
      }
      const decryptedToken = await safeDecryptToken(tokenData.access_token);
      const newTokenData = await exchangeTokenForLongLived(decryptedToken);
      const encryptedNewToken = await encryptToken(newTokenData.access_token);
      const expiresAt = new Date(
        Date.now() + (newTokenData.expires_in ?? 60 * 24 * 60 * 60) * 1000
      ).toISOString();
      const { error: updateError } = await supabaseClient
        .from('ambassador_tokens')
        .update({
          access_token: encryptedNewToken,
          token_expiry: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('embassador_id', ambassador_id);
      if (updateError) {
        throw new Error('Failed to update ambassador token');
      }
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Ambassador token refreshed successfully',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200,
        }
      );
    }
    throw new Error('Missing organization_id or ambassador_id');
  } catch (err) {
    const error = err;
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    );
  }
}
async function exchangeTokenForLongLived(accessToken) {
  const url =
    `${INSTAGRAM_TOKEN_REFRESH}?` +
    `grant_type=ig_refresh_token&access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(
      data.error?.message || data.error_message || 'Failed to refresh Instagram token'
    );
  }
  return data;
}
async function handleDiagnose(req, supabaseClient) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
    if (!token) {
      return jsonResponse(
        {
          success: false,
          error: 'unauthorized',
          error_description: 'Missing auth token',
        },
        {
          status: 401,
        }
      );
    }
    const {
      data: { user: authUser },
    } = await supabaseClient.auth.getUser(token);
    if (!authUser) {
      return jsonResponse(
        {
          success: false,
          error: 'unauthorized',
          error_description: 'Invalid auth token',
        },
        {
          status: 401,
        }
      );
    }
    const { data: userOrgs } = await supabaseClient.rpc('get_user_organizations', {
      user_auth_id: authUser.id,
    });
    if (!userOrgs || userOrgs.length === 0) {
      return jsonResponse({
        success: false,
        error: 'no_organization',
        error_description: 'User has no organization',
      });
    }
    const organizationId = userOrgs[0].organization_id;
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('organization_instagram_tokens')
      .select('access_token, updated_at')
      .eq('organization_id', organizationId)
      .single();
    if (tokenError || !tokenData?.access_token) {
      return jsonResponse({
        success: false,
        error: 'no_token',
        error_description: 'No Instagram token found. Please connect Instagram first.',
      });
    }
    const accessToken = await safeDecryptToken(tokenData.access_token);
    const meResponse = await fetch(
      `${INSTAGRAM_API_BASE}/me?fields=id,username,account_type&access_token=${encodeURIComponent(accessToken)}`
    );
    const meData = await meResponse.json();
    if (!meResponse.ok || meData.error) {
      return jsonResponse({
        success: false,
        error: 'instagram_api_error',
        error_description: meData.error?.message || 'Failed to fetch Instagram user',
        token_updated_at: tokenData.updated_at,
      });
    }
    return jsonResponse({
      success: true,
      data: {
        instagram_account: {
          id: meData.id,
          username: meData.username,
          account_type: meData.account_type,
        },
        token_updated_at: tokenData.updated_at,
        message: 'Instagram connection is active and valid.',
      },
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'diagnose_error',
      error_description: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
