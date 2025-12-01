import { corsHeaders } from '../shared/constants.ts';
import { corsPreflightResponse, jsonResponse } from '../shared/responses.ts';
import { authenticateRequest, getUserOrganization, createSupabaseClient } from '../shared/auth.ts';
import { handleError } from '../shared/error-handler.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    // Initialize Supabase client with service role to access token columns
    const supabaseClient = createSupabaseClient();

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('No authorization header provided');
      return jsonResponse({
          success: true,
          data: {
            isConnected: false,
            isTokenExpired: false,
            lastSync: null,
            username: null,
            tokenExpiryDate: null
          }
        })
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.log('User authentication failed:', authError?.message);
      return jsonResponse({
          success: true,
          data: {
            isConnected: false,
            isTokenExpired: false,
            lastSync: null,
            username: null,
            tokenExpiryDate: null
          }
        })
    }

    console.log('Checking token status for user:', user.id);

    // Get user's organization via organization_members (same as frontend)
    // This is more reliable than users.organization_id which can be null
    const { data: userOrgs, error: orgsError } = await supabaseClient
      .rpc('get_user_organizations', { user_auth_id: user.id });

    if (orgsError || !userOrgs || userOrgs.length === 0) {
      console.log('No organizations found for user:', orgsError?.message);
      return jsonResponse({
          success: true,
          data: {
            isConnected: false,
            isTokenExpired: false,
            lastSync: null,
            username: null,
            tokenExpiryDate: null
          }
        })
    }

    // Use the first organization (or the one marked as current if available)
    const organizationId = userOrgs[0].organization_id;
    console.log('Found organization for user:', user.id, 'org:', organizationId);

    // Get organization token status from secure table
    const { data: orgData, error: orgError } = await supabaseClient
      .from('organizations')
      .select('instagram_username, last_instagram_sync')
      .eq('id', organizationId)
      .single();

    if (orgError) {
      console.error('Failed to fetch organization data:', orgError);
      return jsonResponse({
          success: false,
          error: 'Organization data not found',
          error_type: 'database_error'
        })
    }

    // Get token info from secure table using service_role
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('organization_instagram_tokens')
      .select('token_expiry')
      .eq('organization_id', organizationId)
      .single();

    // Token not found is not an error - organization might not be connected
    const hasToken = !tokenError && tokenData;
    console.log('Token status for org', organizationId, ':', hasToken ? 'found' : 'not found');

    const isConnected = !!hasToken;
    const isTokenExpired = hasToken && tokenData.token_expiry ? new Date(tokenData.token_expiry) < new Date() : false;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          isConnected,
          isTokenExpired,
          lastSync: orgData.last_instagram_sync,
          username: orgData.instagram_username,
          tokenExpiryDate: hasToken ? tokenData.token_expiry : null
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    return handleError(error);
  }
});