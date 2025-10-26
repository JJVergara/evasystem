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
    // Initialize Supabase client with service role to update sensitive fields
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) {
      throw new Error('User not found')
    }

    // Delete tokens from secure table
    const { error: tokenError } = await supabaseClient
      .from('organization_instagram_tokens')
      .delete()
      .eq('organization_id', userData.organization_id);

    if (tokenError) {
      console.error('Failed to delete organization tokens:', tokenError);
      throw new Error('Failed to disconnect Instagram tokens');
    }

    // Clear Instagram-related fields from organizations table
    const { error: updateError } = await supabaseClient
      .from('organizations')
      .update({
        instagram_user_id: null,
        instagram_username: null,
        facebook_page_id: null,
        instagram_business_account_id: null,
        last_instagram_sync: null
      })
      .eq('id', userData.organization_id)
      .eq('created_by', user.id) // Double-check ownership

    if (updateError) {
      console.error('Failed to disconnect Instagram:', updateError)
      throw new Error('Failed to disconnect Instagram account')
    }

    console.log('Instagram account disconnected successfully for organization:', userData.organization_id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Instagram account disconnected successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Disconnect Instagram error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})