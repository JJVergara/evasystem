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

  // Fallback to global environment credentials
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

    let authedUser: { id: string } | null = null;
    if (token) {
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      authedUser = user;
    }

    const { user_id, organization_id, type, redirect_base } = await req.json();

    console.log('Authorization request data:', { user_id_present: !!user_id, organization_id, type, redirect_base });

    // Require authenticated user and ensure it matches provided user_id
    if (!authedUser || authedUser.id !== user_id) {
      console.error('Unauthorized authorize attempt');
      return new Response(
        JSON.stringify({ 
          error: 'unauthorized', 
          error_description: 'User must be authenticated to connect Instagram' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify organization membership when type is organization
    if (type === 'organization' && organization_id) {
      const { data: isMember, error: memberError } = await supabaseClient
        .rpc('is_organization_member', {
          user_auth_id: authedUser.id,
          org_id: organization_id
        });
        
      if (memberError || !isMember) {
        return new Response(
          JSON.stringify({ 
            error: 'forbidden', 
            error_description: 'You do not have access to this organization' 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Use global Meta App credentials for all users
    const app_id = Deno.env.get('META_APP_ID');
    const app_secret = Deno.env.get('META_APP_SECRET');

    // Always force production redirect URI for Meta OAuth
    const REDIRECT_URI = `https://app.evasystem.cl/api/meta-oauth?action=callback`;

    console.log('Environment check:', {
      hasAppId: !!app_id,
      hasAppSecret: !!app_secret,
      redirectUri: REDIRECT_URI
    });

    if (!app_id || !app_secret) {
      console.error('Missing global Meta credentials');
      return new Response(
        JSON.stringify({ 
          error: 'configuration_error',
          error_description: 'Instagram connection is not available. Global Meta App credentials are not configured in the system.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store temporary state for callback verification
    const state = `${user_id}_${organization_id || 'none'}_${type}_${Date.now()}`;

    const { error: stateError } = await supabaseClient
      .from('oauth_states')
      .insert({
        state,
        user_id: user_id,
        organization_id: organization_id || null,
        type: type || 'ambassador',
        redirect_base: redirect_base,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      });

    if (stateError) {
      console.error('Error storing OAuth state:', stateError);
      return new Response(
        JSON.stringify({ 
          error: 'database_error',
          error_description: `Failed to initialize Instagram connection: ${stateError.message || 'Database error'}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Instagram Business API scopes según especificaciones exactas del usuario
    const scopes = 'instagram_business_basic,instagram_business_manage_messages,instagram_business_content_publish';

    console.log('OAuth scopes being requested:', scopes);

    // Usar Instagram OAuth URL exacto según especificaciones del usuario
    const authUrl = `https://www.instagram.com/oauth/authorize?` +
      `client_id=${app_id}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `scope=${scopes}&` +
      `state=${state}`;

    console.log('Generated Instagram auth URL (sanitized)');
    console.log('OAuth state stored:', state);

    return new Response(
      JSON.stringify({ authUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in handleAuthorize:', error);
    return new Response(
      JSON.stringify({ 
        error: 'authorization_failed',
        error_description: `Failed to create Instagram authorization: ${error instanceof Error ? error.message : 'Unknown error'}`
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleCallback(req: Request, supabaseClient: SupabaseClient) {
  // Try to get data from body first (proxy call), then fall back to query params (direct Meta callback)
  let code, state, error, isProxyCall = false;
  
  try {
    const body = await req.json();
    if (body.action === 'callback') {
      code = body.code;
      state = body.state;
      error = body.error;
      isProxyCall = true;
    }
  } catch {
    // Fallback to query parameters for direct Meta callbacks
    const { searchParams } = new URL(req.url);
    code = searchParams.get('code');
    state = searchParams.get('state');
    error = searchParams.get('error');
  }

  if (error) {
    console.error('OAuth error:', error)
    if (isProxyCall) {
      return new Response(
        JSON.stringify({ error, error_description: 'Authorization failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      const callbackUrl = new URL('https://app.evasystem.cl/settings')
      callbackUrl.searchParams.set('error', error)
      callbackUrl.searchParams.set('error_description', 'Authorization failed')
      return Response.redirect(callbackUrl.toString(), 302)
    }
  }

  if (!code || !state) {
    const errorMsg = 'Missing authorization code or state'
    if (isProxyCall) {
      return new Response(
        JSON.stringify({ error: 'invalid_request', error_description: errorMsg }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      const callbackUrl = new URL('https://app.evasystem.cl/settings')
      callbackUrl.searchParams.set('error', 'invalid_request')
      callbackUrl.searchParams.set('error_description', errorMsg)
      return Response.redirect(callbackUrl.toString(), 302)
    }
  }

  try {
    // If this is a proxy call, require that the caller is the same user that initiated the flow
    if (isProxyCall) {
      const authHeader = req.headers.get('Authorization') || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'unauthorized', error_description: 'Missing auth token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'unauthorized', error_description: 'Invalid auth token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify state and get user info
      const { data: stateData, error: stateError } = await supabaseClient
        .from('oauth_states')
        .select('*')
        .eq('state', state)
        .single();

      if (stateError || !stateData) {
        const errorMsg = 'Invalid or expired authorization state'
        return new Response(
          JSON.stringify({ error: 'invalid_state', error_description: errorMsg }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (stateData.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'forbidden', error_description: 'State does not belong to this user' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('=== CALLBACK PROCESSING ===')
      console.log('State data:', { 
        type: stateData.type, 
        user_id: stateData.user_id, 
        organization_id: stateData.organization_id 
      })
      console.log('Starting token exchange...')

      // Exchange code for access token - always use production redirect URI
      const redirectUri = `https://app.evasystem.cl/api/meta-oauth?action=callback`;
      const tokenData = await exchangeCodeForToken(supabaseClient, stateData.organization_id, code, redirectUri)
      
      console.log('Token exchange successful, updating database...')
      if (stateData.type === 'ambassador') {
        await updateAmbassadorInstagramData(supabaseClient, stateData.user_id, tokenData)
      } else {
        // Verify organization membership
        const { data: isMember, error: memberError } = await supabaseClient
          .rpc('is_organization_member', {
            user_auth_id: user.id,
            org_id: stateData.organization_id
          });
          
        if (memberError || !isMember) {
          return new Response(
            JSON.stringify({ error: 'forbidden', error_description: 'No access to this organization' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        await updateOrganizationInstagramData(supabaseClient, stateData.organization_id, tokenData)
      }
      console.log('Database update completed successfully')

      // Clean up state
      await supabaseClient
        .from('oauth_states')
        .delete()
        .eq('state', state)

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Instagram connected successfully',
          timestamp: new Date().toISOString() 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Direct callbacks are not supported for security; instruct user to retry
      const callbackUrl = new URL('https://app.evasystem.cl/settings')
      callbackUrl.searchParams.set('error', 'unsupported_flow')
      callbackUrl.searchParams.set('error_description', 'Direct callbacks are not supported')
      return Response.redirect(callbackUrl.toString(), 302)
    }

  } catch (error) {
    console.error('=== CALLBACK ERROR ===')
    const err = error as ErrorWithMessage;
    console.error('Error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    })
    
    // Determine specific error type and message
    let errorType = 'token_exchange_failed'
    let errorMsg = 'Failed to process Instagram authorization'
    let debugInfo = err.message
    
    if (err.message?.includes('Token exchange failed')) {
      errorType = 'meta_api_error'
      errorMsg = 'Meta API rejected the authorization code. This could be due to expired state, mismatched redirect URI, or invalid Meta App configuration.'
      debugInfo = `Meta API Error: ${err.message}`
    } else if (err.message?.includes('Invalid time value')) {
      errorType = 'token_processing_error'
      errorMsg = 'Error processing token expiration data from Meta API.'
      debugInfo = 'Token expiry calculation failed - Meta API may have returned invalid data'
    } else if (err.message?.includes('Failed to store')) {
      errorType = 'database_error'
      errorMsg = 'Error saving Instagram connection data.'
      debugInfo = `Database Error: ${err.message}`
    }
    
    // Always return 200 with structured error for better client handling
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorType, 
        error_description: errorMsg,
        debug_info: debugInfo,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function exchangeCodeForToken(supabaseClient: SupabaseClient, organizationId: string, code: string, redirectUri?: string) {
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
async function updateAmbassadorInstagramData(supabaseClient: SupabaseClient, userId: string, tokenData: TokenData) {
  try {
    console.log('Updating ambassador Instagram data for user:', userId);
    
    // Get Instagram user details
    const userResponse = await fetch(`${META_API_BASE}/me?fields=id,name&access_token=${tokenData.access_token}`);
    const userData = await userResponse.json();
    
    // Get Instagram account info if available
    const accountsResponse = await fetch(`${META_API_BASE}/me/accounts?access_token=${tokenData.access_token}`);
    const accountsData = await accountsResponse.json();
    
    let instagramData: InstagramData = {
      instagram_user_id: userData.id,
    };

    // Try to get follower count and username from the first Instagram business account
    if (accountsData.data && accountsData.data.length > 0) {
      for (const page of accountsData.data) {
        try {
          const igResponse = await fetch(`${META_API_BASE}/${page.id}?fields=instagram_business_account&access_token=${tokenData.access_token}`);
          const igData = await igResponse.json();
          
          if (igData.instagram_business_account) {
            const igAccountResponse = await fetch(`${META_API_BASE}/${igData.instagram_business_account.id}?fields=username,followers_count,profile_picture_url&access_token=${tokenData.access_token}`);
            const igAccountData = await igAccountResponse.json();
            
            instagramData = {
              ...instagramData,
              instagram_user: igAccountData.username,
              follower_count: igAccountData.followers_count || 0,
              profile_picture_url: igAccountData.profile_picture_url,
            };
            break; // Use the first valid Instagram account
          }
        } catch (error) {
          console.warn('Failed to get Instagram data for page:', page.id);
        }
      }
    }

    // Store token in secure private table
    if (!tokenData.access_token) {
      throw new Error('No access token provided');
    }
    
    // Handle token expiry safely - Meta might not always provide expires_in
    const expiryDate = tokenData.expires_in 
      ? new Date(Date.now() + (tokenData.expires_in * 1000))
      : new Date(Date.now() + (60 * 24 * 60 * 60 * 1000)); // Default to 60 days if not provided
    
    const encryptedToken = await encryptToken(tokenData.access_token);
    const { error: tokenError } = await supabaseClient
      .from('ambassador_tokens')
      .upsert({
        embassador_id: userId,
        access_token: encryptedToken,
        token_expiry: expiryDate.toISOString(),
      });

    if (tokenError) {
      console.error('Failed to store ambassador token:', tokenError);
      throw new Error('Failed to store ambassador token');
    }

    // Update ambassador with Instagram data (NO TOKENS stored here anymore)
    const { error: updateError } = await supabaseClient
      .from('embassadors')
      .update({
        last_instagram_sync: new Date().toISOString(),
        ...instagramData
      })
      .eq('id', userId);

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
async function updateOrganizationInstagramData(supabaseClient: SupabaseClient, organizationId: string, tokenData: TokenData) {
  try {
    console.log('Updating organization Instagram data for:', organizationId);
    
    // Get Facebook pages associated with this access token
    const pagesResponse = await fetch(`${META_API_BASE}/me/accounts?access_token=${tokenData.access_token}`);
    const pagesData = await pagesResponse.json();
    
    if (!pagesData.data || pagesData.data.length === 0) {
      console.log('No Facebook pages found for this account');
      return;
    }

    // Use the first page for now (you might want to let users choose)
    const page = pagesData.data[0];
    console.log('Found Facebook page:', page.name, page.id);

    // Get Instagram business account linked to this Facebook page
    const igResponse = await fetch(`${META_API_BASE}/${page.id}?fields=instagram_business_account&access_token=${tokenData.access_token}`);
    const igData = await igResponse.json();

    let instagramData: OrganizationInstagramData = {
      facebook_page_id: page.id,
    };

    if (igData.instagram_business_account) {
      console.log('Found Instagram business account:', igData.instagram_business_account.id);
      
      // Get Instagram account details
      const igAccountResponse = await fetch(`${META_API_BASE}/${igData.instagram_business_account.id}?fields=username,followers_count&access_token=${tokenData.access_token}`);
      const igAccountData = await igAccountResponse.json();
      
      instagramData = {
        ...instagramData,
        instagram_business_account_id: igData.instagram_business_account.id,
        instagram_username: igAccountData.username,
        instagram_user_id: igData.instagram_business_account.id,
      };
    }

    // Store token in secure private table
    if (!tokenData.access_token) {
      throw new Error('No access token provided');
    }
    
    // Handle token expiry safely - Meta might not always provide expires_in
    const expiryDate = tokenData.expires_in 
      ? new Date(Date.now() + (tokenData.expires_in * 1000))
      : new Date(Date.now() + (60 * 24 * 60 * 60 * 1000)); // Default to 60 days if not provided
    
    const encryptedToken = await encryptToken(tokenData.access_token);
    const { error: tokenError } = await supabaseClient
      .from('organization_instagram_tokens')
      .upsert({
        organization_id: organizationId,
        access_token: encryptedToken,
        token_expiry: expiryDate.toISOString(),
      });

    if (tokenError) {
      console.error('Failed to store organization token:', tokenError);
      throw new Error('Failed to store organization token');
    }

    // Update organization with Instagram data (NO TOKENS stored here anymore)
    const { error: updateError } = await supabaseClient
      .from('organizations')
      .update({
        last_instagram_sync: new Date().toISOString(),
        ...instagramData
      })
      .eq('id', organizationId);

    if (updateError) {
      console.error('Failed to update organization:', updateError);
      throw new Error('Failed to update organization data');
    }
    
    // CRITICAL: Subscribe to webhooks for Instagram Business Account
    try {
      if (instagramData.instagram_business_account_id) {
        // First try to subscribe the Instagram Business Account directly
        console.log('Subscribing Instagram Business Account to webhooks...')
        const igWebhookResponse = await fetch(
          `${META_API_BASE}/${instagramData.instagram_business_account_id}/subscribed_apps`,
          {
            method: 'POST',
            body: new URLSearchParams({
              subscribed_fields: 'mentions,comments,messages,story_insights'
            }),
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
        
        const igWebhookData = await igWebhookResponse.json();
        
        if (igWebhookResponse.ok) {
          console.log('Instagram webhook subscription successful:', igWebhookData);
        } else {
          console.warn('Instagram webhook subscription failed:', igWebhookData);
          // Fallback to Facebook page subscription
          if (tokenData.access_token) {
            await subscribeToPageWebhooks(page.id, tokenData.access_token);
          }
        }
      } else {
        // No Instagram account, just subscribe the page
        if (tokenData.access_token) {
          await subscribeToPageWebhooks(page.id, tokenData.access_token);
        }
      }
    } catch (webhookError) {
      console.warn('Webhook subscription failed:', webhookError);
      // Don't fail the whole process if webhook subscription fails
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
    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { organization_id, ambassador_id } = await req.json();

    if (organization_id) {
      // Refresh organization token
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('organization_id')
        .eq('auth_user_id', user.id)
        .single();

      if (userError || !userData || userData.organization_id !== organization_id) {
        throw new Error('Unauthorized to refresh this organization token');
      }

      // Get current token from secure table
      const { data: tokenData, error: tokenError } = await supabaseClient
        .from('organization_instagram_tokens')
        .select('access_token')
        .eq('organization_id', organization_id)
        .single();

      if (tokenError || !tokenData?.access_token) {
        throw new Error('No token found for organization');
      }

      // Get organization credentials
      const credentials = await getOrganizationCredentials(supabaseClient, organization_id);
      
      // Exchange current token for new long-lived token
      const decryptedToken = await safeDecryptToken(tokenData.access_token);
      const newTokenData = await exchangeTokenForLongLived(credentials.app_id, credentials.app_secret, decryptedToken);
      
      // Update token in secure table
      const encryptedNewToken = await encryptToken(newTokenData.access_token);
      const { error: updateError } = await supabaseClient
        .from('organization_instagram_tokens')
        .update({
          access_token: encryptedNewToken,
          token_expiry: new Date(Date.now() + newTokenData.expires_in * 1000).toISOString(),
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
        }
      );

    } else if (ambassador_id) {
      // Refresh ambassador token
      const { data: ambassadorData, error: ambassadorError } = await supabaseClient
        .from('embassadors')
        .select('organization_id')
        .eq('id', ambassador_id)
        .single();

      if (ambassadorError) {
        throw new Error('Ambassador not found');
      }

      // Verify user owns this ambassador's organization
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('organization_id')
        .eq('auth_user_id', user.id)
        .single();

      if (userError || !userData || userData.organization_id !== ambassadorData.organization_id) {
        throw new Error('Unauthorized to refresh this ambassador token');
      }

      // Get current token from secure table
      const { data: tokenData, error: tokenError } = await supabaseClient
        .from('ambassador_tokens')
        .select('access_token')
        .eq('embassador_id', ambassador_id)
        .single();

      if (tokenError || !tokenData?.access_token) {
        throw new Error('No token found for ambassador');
      }

      // Get organization credentials
      const credentials = await getOrganizationCredentials(supabaseClient, ambassadorData.organization_id);
      
      const decryptedToken = await safeDecryptToken(tokenData.access_token);
      const newTokenData = await exchangeTokenForLongLived(credentials.app_id, credentials.app_secret, decryptedToken);
      
      // Update token in secure table  
      const encryptedNewToken = await encryptToken(newTokenData.access_token);
      const { error: updateError } = await supabaseClient
        .from('ambassador_tokens')
        .update({
          access_token: encryptedNewToken,
          token_expiry: new Date(Date.now() + newTokenData.expires_in * 1000).toISOString(),
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
        }
      );
    } else {
      throw new Error('Missing organization_id or ambassador_id');
    }

  } catch (error) {
    console.error('Token refresh error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
}

// Helper function to exchange a token for a long-lived token
async function exchangeTokenForLongLived(appId: string, appSecret: string, accessToken: string) {
  const exchangeUrl = `${META_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`;
  
  const response = await fetch(exchangeUrl);
  const data = await response.json();
  
  if (data.error) {
    console.error('Token exchange error:', data.error);
    throw new Error('Failed to exchange token');
  }
  
  console.log('Token exchanged successfully');
  return data;
}

async function subscribeToPageWebhooks(pageId: string, accessToken: string) {
  const webhookUrl = `${META_API_BASE}/${pageId}/subscribed_apps`;
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subscribed_fields: 'mention,story_insights',
      access_token: accessToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Webhook subscription failed: ${JSON.stringify(error)}`);
  }

  console.log(`Webhooks subscribed for page ${pageId}`);
}