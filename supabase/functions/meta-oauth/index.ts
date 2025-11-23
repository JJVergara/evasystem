import { corsHeaders, META_API_BASE } from '../shared/constants.ts';
import { 
  SupabaseClient, 
  TokenData, 
  ErrorWithMessage, 
  InstagramData, 
  OrganizationInstagramData 
} from '../shared/types.ts';
import { corsPreflightResponse, jsonResponse } from '../shared/responses.ts';
import { createSupabaseClient } from '../shared/auth.ts';
import { handleError } from '../shared/error-handler.ts';
import { encryptToken, safeDecryptToken } from '../shared/crypto.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  console.log('=== META OAUTH REQUEST DEBUG ===')
  console.log('Request method:', req.method)
  console.log('Request URL:', req.url)
  
  try {
    const supabaseClient = createSupabaseClient()

    const url = new URL(req.url)
    let action = url.searchParams.get('action')
    
    // Fallback: try to read action from JSON body when missing (proxy calls)
    if (!action) {
      try {
        const body = await req.clone().json()
        if (typeof body?.action === 'string') {
          action = body.action
        }
      } catch (_err) {
        // ignore JSON parse errors
      }
    }
    
    console.log('Action parameter:', action)

    switch (action) {
      case 'authorize':
        return handleAuthorize(req, supabaseClient)
      case 'callback':
        return handleCallback(req, supabaseClient)
      case 'refresh':
        return handleTokenRefresh(req, supabaseClient)
      default:
        console.log('Invalid action or no action specified:', action)
        return new Response(
          JSON.stringify({ 
            error: 'invalid_action', 
            error_description: 'Invalid or missing action parameter' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('=== META OAUTH MAIN ERROR ===')
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', {
      name: errorName,
      message: errorMessage,
      stack: errorStack
    })
    return new Response(
      JSON.stringify({ 
        error: 'server_error', 
        error_description: 'Internal server error',
        debug_info: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getOrganizationCredentials(supabaseClient: SupabaseClient, organizationId: string) {
  // Try to get organization-specific credentials using secure function
  const { data: orgCreds, error: orgError } = await supabaseClient
    .rpc('get_organization_credentials_secure', {
      p_organization_id: organizationId
    });

  if (!orgError && orgCreds && orgCreds.length > 0) {
    const creds = orgCreds[0];
    console.log('Using organization-specific Meta credentials');
    return {
      app_id: creds.meta_app_id,
      app_secret: creds.meta_app_secret,
      webhook_verify_token: creds.webhook_verify_token
    };
  }

  console.log('Using global Meta credentials as fallback');
  return {
    app_id: Deno.env.get('META_APP_ID'),
    app_secret: Deno.env.get('META_APP_SECRET'),
    webhook_verify_token: Deno.env.get('WEBHOOK_VERIFY_TOKEN')
  };
}

async function handleAuthorize(req: Request, supabaseClient: SupabaseClient) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;

    if (!token) {
      return jsonResponse(
        { error: 'unauthorized', error_description: 'Missing auth token' },
        { status: 401 }
      );
    }

    const { data: { user: authUser } } = await supabaseClient.auth.getUser(token);
    if (!authUser) {
      return jsonResponse(
        { error: 'unauthorized', error_description: 'Invalid auth token' },
        { status: 401 }
      );
    }

    type AuthorizeBody =
      | {
          type: 'ambassador';
          ambassador_id: string;
          organization_id: string;
          redirect_base?: string;
        }
      | {
          type: 'organization';
          organization_id: string;
          redirect_base?: string;
        };

    const body = await req.json();
    const { type, ambassador_id, organization_id, redirect_base } = body as AuthorizeBody & {
      ambassador_id?: string;
    };

    if (!type || !organization_id) {
      return jsonResponse(
        {
          error: 'invalid_request',
          error_description: 'type and organization_id are required',
        },
        { status: 400 }
      );
    }

    if (type === 'ambassador' && !ambassador_id) {
      return jsonResponse(
        {
          error: 'invalid_request',
          error_description: 'ambassador_id is required for ambassador flow',
        },
        { status: 400 }
      );
    }

    // ----- NEW: organization_members-based membership check -----
    const { data: membership, error: membershipError } = await supabaseClient
      .from('organization_members')
      .select('id, organization_id, status, permissions')
      .eq('user_id', authUser.id)              // auth.users.id
      .eq('organization_id', organization_id)
      .eq('status', 'active')
      .single();

    if (membershipError || !membership) {
      return jsonResponse(
        {
          error: 'forbidden',
          error_description: 'No access to this organization',
        },
        { status: 403 }
      );
    }

    // Optional: enforce permissions
    const perms = (membership as any).permissions || {};
    const canManageAmbassadors =
      perms.manage_ambassadors === true || perms.manage_instagram === true;

    if (!canManageAmbassadors && type === 'ambassador') {
      return jsonResponse(
        {
          error: 'forbidden',
          error_description:
            'You do not have permissions to manage ambassadors for this organization',
        },
        { status: 403 }
      );
    }

    // Still get the internal app user row, but only for storing oauth_states.user_id
    const { data: appUser } = await supabaseClient
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single();

    // Use global Meta App credentials for all users
    const appId = Deno.env.get('META_APP_ID');
    const appSecret = Deno.env.get('META_APP_SECRET');

    const REDIRECT_URI = `https://app.evasystem.cl/api/meta-oauth?action=callback`;

    if (!appId || !appSecret) {
      console.error('Missing Meta credentials');
      return jsonResponse(
        {
          error: 'configuration_error',
          error_description:
            'Instagram connection is not available. Meta App credentials are not configured.',
        },
        { status: 500 }
      );
    }

    // Build state payload
    const statePayload =
      type === 'ambassador'
        ? {
            type: 'ambassador' as const,
            ambassador_id,
            organization_id,
            auth_user_id: authUser.id,
            redirect_base: redirect_base || 'https://app.evasystem.cl/ambassadors',
            nonce: crypto.randomUUID(),
          }
        : {
            type: 'organization' as const,
            organization_id,
            auth_user_id: authUser.id,
            redirect_base: redirect_base || 'https://app.evasystem.cl/settings',
            nonce: crypto.randomUUID(),
          };

    const state = btoa(JSON.stringify(statePayload));

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: stateError } = await supabaseClient.from('oauth_states').insert({
      state,
      user_id: appUser?.id ?? null, // internal app user (can be null if not found)
      ambassador_id: type === 'ambassador' ? ambassador_id : null,
      organization_id,
      type,
      redirect_base: redirect_base || null,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
    });

    if (stateError) {
      console.error('Error storing OAuth state:', stateError);
      return jsonResponse(
        {
          error: 'database_error',
          error_description: `Failed to initialize Instagram connection: ${
            stateError.message || 'Database error'
          }`,
        },
        { status: 500 }
      );
    }

    const scopes = [
      'instagram_business_basic',
      'instagram_business_manage_insights',
      'instagram_business_manage_messages',
      'instagram_business_content_publish'
    ].join(',');

    const authUrl =
      'https://api.instagram.com/oauth/authorize?' +
      `client_id=${encodeURIComponent(appId)}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `response_type=code&` +
      `state=${encodeURIComponent(state)}`;

    return jsonResponse({ authUrl });
  } catch (error) {
    console.error('Error in handleAuthorize:', error);
    return jsonResponse(
      {
        error: 'authorization_failed',
        error_description: `Failed to create Instagram authorization: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      },
      { status: 500 }
    );
  }
}



async function handleCallback(req: Request, supabaseClient: SupabaseClient) {
  // Try to get data from body (proxy call from frontend)
  let code: string | undefined;
  let state: string | undefined;
  let metaError: string | undefined;
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
    // We no longer support direct Meta -> Edge callbacks
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
      { status: 400 },
    );
  }

  if (metaError) {
    console.error('Meta OAuth error received from frontend:', metaError);
    return jsonResponse(
      {
        success: false,
        error: 'meta_oauth_error',
        error_description: 'Authorization failed on Meta side',
        debug_info: metaError,
      },
      { status: 200 },
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
      { status: 400 },
    );
  }

  try {
    // Require that caller is authenticated (the admin or user who initiated the flow)
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '')
      : null;

    if (!token) {
      return jsonResponse(
        {
          success: false,
          error: 'unauthorized',
          error_description: 'Missing auth token',
        },
        { status: 401 },
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
        { status: 401 },
      );
    }

    // Look up state in DB
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
        { status: 400 },
      );
    }

    // Decode JSON payload stored in state text
    type StatePayload = {
      type: 'ambassador' | 'organization';
      ambassador_id?: string;
      organization_id?: string;
      auth_user_id: string;
      redirect_base?: string;
      nonce: string;
    };

    let decoded: StatePayload;
    try {
      decoded = JSON.parse(atob(state)) as StatePayload;
    } catch (e) {
      console.error('Failed to decode state payload:', e);
      return jsonResponse(
        {
          success: false,
          error: 'invalid_state',
          error_description: 'Malformed state payload',
        },
        { status: 400 },
      );
    }

    if (decoded.auth_user_id !== authUser.id) {
      return jsonResponse(
        {
          success: false,
          error: 'forbidden',
          error_description: 'State does not belong to this user',
        },
        { status: 403 },
      );
    }

    console.log('=== CALLBACK PROCESSING ===');
    console.log('DB state row:', {
      db_type: stateData.type,
      db_user_id: stateData.user_id,
      db_ambassador_id: stateData.ambassador_id,
      db_organization_id: stateData.organization_id,
    });
    console.log('Decoded state payload:', decoded);
    console.log('Starting token exchange...');

    const tokenData = await exchangeCodeForToken(
      code
    );

    console.log('Token exchange successful, updating database...');

    if (stateData.type === 'ambassador') {
      const ambassadorId =
        stateData.ambassador_id ?? decoded.ambassador_id ?? null;

      if (!ambassadorId) {
        return jsonResponse(
          {
            success: false,
            error: 'invalid_state',
            error_description:
              'Missing ambassador_id in state for ambassador connection',
          },
          { status: 400 },
        );
      }

      // Link the Instagram token & profile to the ambassador
      await updateAmbassadorInstagramData(
        supabaseClient,
        ambassadorId,
        tokenData,
      );

      // Clean up state
      await supabaseClient.from('oauth_states').delete().eq('state', state);

      return jsonResponse(
        {
          success: true,
          message: 'Instagram connected successfully',
          type: 'ambassador',
          timestamp: new Date().toISOString(),
        },
        { status: 200 },
      );
    }

    if (stateData.type === 'organization') {
      const organizationId =
        stateData.organization_id ?? decoded.organization_id ?? null;

      if (!organizationId) {
        return jsonResponse(
          {
            success: false,
            error: 'invalid_state',
            error_description:
              'Missing organization_id in state for organization connection',
          },
          { status: 400 },
        );
      }

      // Verify organization membership (same RPC you used before)
      const { data: isMember, error: memberError } = await supabaseClient.rpc(
        'is_organization_member',
        {
          user_auth_id: authUser.id,
          org_id: organizationId,
        },
      );

      if (memberError || !isMember) {
        return jsonResponse(
          {
            success: false,
            error: 'forbidden',
            error_description: 'No access to this organization',
          },
          { status: 403 },
        );
      }

      // Link the Instagram Business account to the organization
      await updateOrganizationInstagramData(
        supabaseClient,
        organizationId,
        tokenData,
      );

      // Clean up state
      await supabaseClient.from('oauth_states').delete().eq('state', state);

      return jsonResponse(
        {
          success: true,
          message: 'Instagram connected successfully',
          type: 'organization',
          timestamp: new Date().toISOString(),
        },
        { status: 200 },
      );
    }

    // Should not happen because of CHECK(type) in DB
    return jsonResponse(
      {
        success: false,
        error: 'unknown_type',
        error_description: `Unsupported connection type: ${stateData.type}`,
      },
      { status: 400 },
    );
  } catch (error) {
    console.error('=== CALLBACK ERROR ===');
    const err = error as ErrorWithMessage;
    console.error('Error details:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    });

    // Similar error shape as your old code
    let errorType = 'token_exchange_failed';
    let errorMsg = 'Failed to process Instagram authorization';
    let debugInfo = err?.message ?? String(error);

    if (err?.message?.includes('Short-lived token exchange failed')) {
      errorType = 'meta_api_error';
      errorMsg =
        'Meta API rejected the authorization code. This could be due to expired state, mismatched redirect URI, or invalid Meta App configuration.';
      debugInfo = `Meta API Error: ${err.message}`;
    } else if (err?.message?.includes('Invalid time value')) {
      errorType = 'token_processing_error';
      errorMsg = 'Error processing token expiration data from Meta API.';
      debugInfo =
        'Token expiry calculation failed - Meta API may have returned invalid data';
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
      { status: 200 },
    );
  }
}

async function exchangeCodeForToken(code: string) {
  // Use global Meta App credentials for all users
  const app_id = Deno.env.get('META_APP_ID');
  const app_secret = Deno.env.get('META_APP_SECRET');
  
  // Always force production redirect URI for Meta API token exchange
  const REDIRECT_URI = 'https://app.evasystem.cl/api/meta-oauth?action=callback'

  console.log('=== INSTAGRAM TOKEN EXCHANGE DEBUG ===')
  console.log('Code received:', code ? 'Yes' : 'No')
  console.log('APP_ID exists:', !!app_id)
  console.log('APP_SECRET exists:', !!app_secret)
  console.log('REDIRECT_URI:', REDIRECT_URI)

  if (!app_id || !app_secret) {
    throw new Error('Global Meta App credentials not configured')
  }

  // Paso 1: Intercambio del code por short-lived token usando Instagram API
  const shortLivedTokenData = new FormData();
  shortLivedTokenData.append('client_id', app_id);
  shortLivedTokenData.append('client_secret', app_secret);
  shortLivedTokenData.append('grant_type', 'authorization_code');
  shortLivedTokenData.append('redirect_uri', REDIRECT_URI);
  shortLivedTokenData.append('code', code);

  console.log('Making short-lived token exchange request to Instagram API...')

  const shortLivedResponse = await fetch('https://api.instagram.com/oauth/access_token', { 
    method: 'POST',
    body: shortLivedTokenData
  });
  const shortLivedData = await shortLivedResponse.json();

  console.log('Short-lived token exchange response status:', shortLivedResponse.status)
  
  if (!shortLivedResponse.ok) {
    console.error('SHORT-LIVED TOKEN EXCHANGE FAILED:', {
      status: shortLivedResponse.status,
      statusText: shortLivedResponse.statusText,
      data: shortLivedData,
      error: shortLivedData.error,
      errorDescription: shortLivedData.error_description
    })
    throw new Error(`Short-lived token exchange failed: ${shortLivedData.error_description || shortLivedData.error?.message || 'Unknown Instagram API error'}`)
  }

  // Paso 2: Intercambio del short-lived token por long-lived token
  try {
    const longLivedTokenUrl = `https://graph.instagram.com/access_token?` +
      `grant_type=ig_exchange_token&` +
      `client_secret=${app_secret}&` +
      `access_token=${shortLivedData.access_token}`;

    console.log('Making long-lived token exchange request...')

    const longLivedResponse = await fetch(longLivedTokenUrl);
    const longLivedData = await longLivedResponse.json();

    if (longLivedResponse.ok && longLivedData.access_token) {
      console.log('Long-lived token exchange successful')
      console.log('Long-lived token expires in:', longLivedData.expires_in, 'seconds')
      
      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + longLivedData.expires_in);
      
      return {
        access_token: longLivedData.access_token,
        token_type: longLivedData.token_type || 'bearer',
        expires_in: longLivedData.expires_in,
        expires_at: expiresAt.toISOString(),
        user_id: shortLivedData.user_id,
        username: shortLivedData.username || null
      };
    } else {
      console.error('LONG-LIVED TOKEN EXCHANGE FAILED:', {
        status: longLivedResponse.status,
        statusText: longLivedResponse.statusText,
        data: longLivedData
      })
      throw new Error(`Long-lived token exchange failed: ${longLivedData.error?.message || longLivedData.error_description || 'Unknown Meta Graph API error'}`)
    }
  } catch (error) {
    console.error('Error during long-lived token exchange:', error)
    throw new Error(`Failed to exchange tokens: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Update ambassador data in Supabase using secure token storage
async function updateAmbassadorInstagramData(
  supabaseClient: SupabaseClient,
  ambassadorId: string,
  tokenData: TokenData,
) {
  try {
    console.log('Updating ambassador Instagram data for ambassador:', ambassadorId);

    if (!tokenData.access_token) {
      throw new Error('No access token provided');
    }

    // 1) Get "user" info from Meta
    const userResponse = await fetch(
      `${META_API_BASE}/me?fields=id,name&access_token=${encodeURIComponent(
        tokenData.access_token,
      )}`,
    );
    const userData = await userResponse.json();

    if (!userResponse.ok || userData.error) {
      console.error('Error fetching /me:', userData.error || userData);
      throw new Error(
        userData.error?.message || 'Failed to fetch Meta user profile data',
      );
    }

    // 2) Get pages/accounts this user manages (to find IG business account if any)
    const accountsResponse = await fetch(
      `${META_API_BASE}/me/accounts?access_token=${encodeURIComponent(
        tokenData.access_token,
      )}`,
    );
    const accountsData = await accountsResponse.json();

    if (!accountsResponse.ok || accountsData.error) {
      console.warn('Error fetching /me/accounts:', accountsData.error || accountsData);
      // Not fatal – we can still store basic user info and token
    }

    let instagramData: InstagramData = {
      instagram_user_id: userData.id,
    };

    // Try to get follower count, username, picture from first Instagram business account
    if (accountsData.data && accountsData.data.length > 0) {
      for (const page of accountsData.data as Array<{ id: string }>) {
        try {
          const igResponse = await fetch(
            `${META_API_BASE}/${page.id}?fields=instagram_business_account&access_token=${encodeURIComponent(
              tokenData.access_token,
            )}`,
          );
          const igData = await igResponse.json();

          if (!igResponse.ok || igData.error) {
            console.warn('Failed to get instagram_business_account for page:', {
              pageId: page.id,
              error: igData.error || igData,
            });
            continue;
          }

          if (igData.instagram_business_account) {
            const igAccountResponse = await fetch(
              `${META_API_BASE}/${igData.instagram_business_account.id}?fields=username,followers_count,profile_picture_url&access_token=${encodeURIComponent(
                tokenData.access_token,
              )}`,
            );
            const igAccountData = await igAccountResponse.json();

            if (!igAccountResponse.ok || igAccountData.error) {
              console.warn('Failed to get Instagram account data:', {
                pageId: page.id,
                error: igAccountData.error || igAccountData,
              });
              continue;
            }

            instagramData = {
              ...instagramData,
              instagram_user: igAccountData.username,
              follower_count: igAccountData.followers_count || 0,
              profile_picture_url: igAccountData.profile_picture_url,
            };
            break; // First valid IG business account is enough
          }
        } catch (error) {
          console.warn('Exception while resolving Instagram data for page:', {
            pageId: page.id,
            error,
          });
        }
      }
    }

    // 3) Compute expiry date (Meta sometimes omits expires_in)
    const expiryDate = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // default ~60 days

    // 4) Encrypt and store token in ambassador_tokens
    const encryptedToken = await encryptToken(tokenData.access_token);

    const { error: tokenError } = await supabaseClient
      .from('ambassador_tokens')
      .upsert({
        embassador_id: ambassadorId,
        access_token: encryptedToken,
        token_expiry: expiryDate.toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (tokenError) {
      console.error('Failed to store ambassador token:', tokenError);
      throw new Error('Failed to store ambassador token');
    }

    // 5) Update embassadors row with public IG info only
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
      console.error('Failed to update ambassador:', updateError);
      throw new Error('Failed to update ambassador data');
    }

    console.log('Ambassador Instagram data updated successfully');
  } catch (error) {
    console.error('Error updating ambassador Instagram data:', error);
    throw error;
  }
}

// Update organization data in Supabase using secure token storage
async function updateOrganizationInstagramData(
  supabaseClient: SupabaseClient,
  organizationId: string,
  tokenData: TokenData,
) {
  try {
    console.log('Updating organization Instagram data for:', organizationId);

    if (!tokenData.access_token) {
      throw new Error('No access token provided');
    }

    // 1) Get pages this user manages
    const pagesResponse = await fetch(
      `${META_API_BASE}/me/accounts?access_token=${encodeURIComponent(
        tokenData.access_token,
      )}`,
    );
    const pagesData = await pagesResponse.json();

    if (!pagesResponse.ok || pagesData.error) {
      console.error('Error fetching /me/accounts:', pagesData.error || pagesData);
      throw new Error(
        pagesData.error?.message ||
          'Failed to fetch Facebook pages for this account',
      );
    }

    if (!pagesData.data || pagesData.data.length === 0) {
      console.log('No Facebook pages found for this account');
      return;
    }

    // Use the first page for now
    const page = pagesData.data[0];
    console.log('Found Facebook page:', page.name, page.id);

    // 2) Get Instagram business account linked to this FB page
    const igResponse = await fetch(
      `${META_API_BASE}/${page.id}?fields=instagram_business_account&access_token=${encodeURIComponent(
        tokenData.access_token,
      )}`,
    );
    const igData = await igResponse.json();

    if (!igResponse.ok || igData.error) {
      console.warn('Error fetching instagram_business_account:', igData.error || igData);
    }

    let instagramData: OrganizationInstagramData = {
      facebook_page_id: page.id,
    };

    if (igData.instagram_business_account) {
      console.log(
        'Found Instagram business account:',
        igData.instagram_business_account.id,
      );

      // 3) Get Instagram account details
      const igAccountResponse = await fetch(
        `${META_API_BASE}/${igData.instagram_business_account.id}?fields=username,followers_count&access_token=${encodeURIComponent(
          tokenData.access_token,
        )}`,
      );
      const igAccountData = await igAccountResponse.json();

      if (!igAccountResponse.ok || igAccountData.error) {
        console.warn('Error fetching IG account details:', igAccountData.error || igAccountData);
      } else {
        instagramData = {
          ...instagramData,
          instagram_business_account_id: igData.instagram_business_account.id,
          instagram_username: igAccountData.username,
          instagram_user_id: igData.instagram_business_account.id,
        };
      }
    }

    // 4) Compute expiry date
    const expiryDate = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // default ~60 days

    // 5) Encrypt and store token
    const encryptedToken = await encryptToken(tokenData.access_token);
    const { error: tokenError } = await supabaseClient
      .from('organization_instagram_tokens')
      .upsert({
        organization_id: organizationId,
        access_token: encryptedToken,
        token_expiry: expiryDate.toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (tokenError) {
      console.error('Failed to store organization token:', tokenError);
      throw new Error('Failed to store organization token');
    }

    // 6) Update organizations row with public IG info
    const { error: updateError } = await supabaseClient
      .from('organizations')
      .update({
        last_instagram_sync: new Date().toISOString(),
        facebook_page_id: instagramData.facebook_page_id,
        instagram_business_account_id:
          instagramData.instagram_business_account_id ?? null,
        instagram_username: instagramData.instagram_username ?? null,
        instagram_user_id: instagramData.instagram_user_id ?? null,
      })
      .eq('id', organizationId);

    if (updateError) {
      console.error('Failed to update organization:', updateError);
      throw new Error('Failed to update organization data');
    }

    // 7) Subscribe to webhooks
    try {
      if (instagramData.instagram_business_account_id) {
        console.log('Subscribing Instagram Business Account to webhooks...');
        const igWebhookResponse = await fetch(
          `${META_API_BASE}/${instagramData.instagram_business_account_id}/subscribed_apps`,
          {
            method: 'POST',
            body: new URLSearchParams({
              subscribed_fields: 'mentions,comments,messages,story_insights',
            }),
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        );

        const igWebhookData = await igWebhookResponse.json();

        if (igWebhookResponse.ok) {
          console.log('Instagram webhook subscription successful:', igWebhookData);
        } else {
          console.warn('Instagram webhook subscription failed:', igWebhookData);
          // Fallback to page-level subscription
          await subscribeToPageWebhooks(page.id, tokenData.access_token);
        }
      } else {
        // No Instagram account, just subscribe the page
        await subscribeToPageWebhooks(page.id, tokenData.access_token);
      }
    } catch (webhookError) {
      console.warn('Webhook subscription failed:', webhookError);
      // not fatal – token stored and org updated
    }

    console.log('Organization Instagram data updated successfully');
  } catch (error) {
    console.error('Error updating organization Instagram data:', error);
    throw error;
  }
}

// Handle token refresh using secure token storage
async function handleTokenRefresh(req: Request, supabaseClient: SupabaseClient) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { organization_id, ambassador_id } = await req.json();

    // --- ORGANIZATION TOKEN REFRESH ---
    if (organization_id) {
      // Verify logged-in user belongs to this organization
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('organization_id')
        .eq('auth_user_id', user.id)
        .single();

      if (userError || !userData || userData.organization_id !== organization_id) {
        throw new Error('Unauthorized to refresh this organization token');
      }

      // Get current token
      const { data: tokenData, error: tokenError } = await supabaseClient
        .from('organization_instagram_tokens')
        .select('access_token')
        .eq('organization_id', organization_id)
        .single();

      if (tokenError || !tokenData?.access_token) {
        throw new Error('No token found for organization');
      }

      const decryptedToken = await safeDecryptToken(tokenData.access_token);

      // Refresh IG long-lived token
      const newTokenData = await exchangeTokenForLongLived(decryptedToken);

      // Update token
      const encryptedNewToken = await encryptToken(newTokenData.access_token);
      const expiresAt = new Date(
        Date.now() + (newTokenData.expires_in ?? 60 * 24 * 60 * 60) * 1000,
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
        JSON.stringify({ success: true, message: 'Organization token refreshed successfully' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    // --- AMBASSADOR TOKEN REFRESH ---
    if (ambassador_id) {
      // Find ambassador org
      const { data: ambassadorData, error: ambassadorError } = await supabaseClient
        .from('embassadors')
        .select('organization_id')
        .eq('id', ambassador_id)
        .single();

      if (ambassadorError || !ambassadorData) {
        throw new Error('Ambassador not found');
      }

      // Verify logged-in user belongs to same org
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('organization_id')
        .eq('auth_user_id', user.id)
        .single();

      if (userError || !userData || userData.organization_id !== ambassadorData.organization_id) {
        throw new Error('Unauthorized to refresh this ambassador token');
      }

      // Get current token
      const { data: tokenData, error: tokenError } = await supabaseClient
        .from('ambassador_tokens')
        .select('access_token')
        .eq('embassador_id', ambassador_id)
        .single();

      if (tokenError || !tokenData?.access_token) {
        throw new Error('No token found for ambassador');
      }

      const decryptedToken = await safeDecryptToken(tokenData.access_token);

      // Refresh IG long-lived token
      const newTokenData = await exchangeTokenForLongLived(decryptedToken);

      // Update token
      const encryptedNewToken = await encryptToken(newTokenData.access_token);
      const expiresAt = new Date(
        Date.now() + (newTokenData.expires_in ?? 60 * 24 * 60 * 60) * 1000,
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
        JSON.stringify({ success: true, message: 'Ambassador token refreshed successfully' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    throw new Error('Missing organization_id or ambassador_id');
  } catch (err) {
    const error = err as Error;
    console.error('Token refresh error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
}


// Helper function to exchange a token for a long-lived token
// Refresh an Instagram long-lived access token
async function exchangeTokenForLongLived(accessToken: string): Promise<{
  access_token: string;
  token_type?: string;
  expires_in?: number;
}> {
  const url =
    'https://graph.instagram.com/refresh_access_token?' +
    `grant_type=ig_refresh_token&access_token=${encodeURIComponent(accessToken)}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.error) {
    console.error('Token exchange error:', data.error || data);
    throw new Error(
      data.error?.message || data.error_message || 'Failed to refresh Instagram token',
    );
  }

  console.log('Instagram token refreshed successfully');
  return data;
}


async function subscribeToPageWebhooks(pageId: string, accessToken: string) {
  const webhookUrl = `${META_API_BASE}/${encodeURIComponent(pageId)}/subscribed_apps`;

  const body = new URLSearchParams({
    subscribed_fields: 'mentions,comments,messages,story_insights',
    access_token: accessToken,
  });

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const json = await response.json();

  if (!response.ok || json.error) {
    console.error('Webhook subscription failed:', json.error || json);
    throw new Error(`Webhook subscription failed: ${JSON.stringify(json)}`);
  }

  console.log(`Webhooks subscribed for page ${pageId}`, json);
}
