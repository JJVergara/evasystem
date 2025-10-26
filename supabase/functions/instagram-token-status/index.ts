import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role to access token columns
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            isConnected: false,
            isTokenExpired: false,
            lastSync: null,
            username: null,
            tokenExpiryDate: null
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.log('User authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            isConnected: false,
            isTokenExpired: false,
            lastSync: null,
            username: null,
            tokenExpiryDate: null
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    console.log('Checking token status for user:', user.id);

    // Get user's organization
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) {
      console.log('User data not found:', userError?.message);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            isConnected: false,
            isTokenExpired: false,
            lastSync: null,
            username: null,
            tokenExpiryDate: null
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    console.log('Checking organization access for user:', user.id, 'org:', userData.organization_id);

    // Check if user has access to this organization (either owner or member)
    const { data: hasAccess, error: accessError } = await supabaseClient
      .rpc('is_organization_member', { 
        user_auth_id: user.id, 
        org_id: userData.organization_id 
      });

    if (accessError || !hasAccess) {
      console.log('Organization access denied:', accessError?.message, 'hasAccess:', hasAccess);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            isConnected: false,
            isTokenExpired: false,
            lastSync: null,
            username: null,
            tokenExpiryDate: null
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Get organization token status from secure table
    const { data: orgData, error: orgError } = await supabaseClient
      .from('organizations')
      .select('instagram_username, last_instagram_sync')
      .eq('id', userData.organization_id)
      .single();

    if (orgError) {
      console.error('Failed to fetch organization data:', orgError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Organization data not found',
          error_type: 'database_error'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Get token info from secure table using service_role
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('organization_instagram_tokens')
      .select('token_expiry')
      .eq('organization_id', userData.organization_id)
      .single();

    // Token not found is not an error - organization might not be connected
    const hasToken = !tokenError && tokenData;
    console.log('Token status for org', userData.organization_id, ':', hasToken ? 'found' : 'not found');

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
    console.error('Unexpected token status error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        error_type: 'server_error',
        message: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  }
})