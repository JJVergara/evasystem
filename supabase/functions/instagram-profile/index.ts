import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { safeDecryptToken } from '../shared/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Authenticate user first
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { organization_id, endpoint } = await req.json();

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: 'Organization ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Verify user owns this organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, instagram_user_id, instagram_username')
      .eq('id', organization_id)
      .eq('created_by', user.id) // CRITICAL: Only allow access to owned organizations
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: 'Organization not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get organization token
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('get_organization_token_info', { org_id: organization_id });

    if (tokenError || !tokenData || tokenData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No Instagram token found for organization' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orgToken = tokenData[0];
    if (orgToken.is_expired) {
      return new Response(
        JSON.stringify({ error: 'Instagram token has expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt token
    const accessToken = await safeDecryptToken(orgToken.access_token);

    let result = {};

    switch (endpoint) {
      case 'profile':
        result = await getInstagramProfile(org.instagram_user_id, accessToken);
        break;
      case 'media':
        result = await getInstagramMedia(org.instagram_user_id, accessToken);
        break;
      case 'tags':
        result = await getInstagramTags(org.instagram_user_id, accessToken);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid endpoint' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in instagram-profile:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Obtener perfil básico usando las especificaciones del usuario
async function getInstagramProfile(igUserId: string, accessToken: string) {
  const fields = 'user_id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count';
  
  const response = await fetch(
    `https://graph.instagram.com/v22.0/${igUserId}?fields=${fields}&access_token=${accessToken}`
  );

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Instagram API error: ${data.error?.message || 'Unknown error'}`);
  }

  return {
    success: true,
    profile: data
  };
}

// Obtener feed del usuario usando las especificaciones del usuario
async function getInstagramMedia(igUserId: string, accessToken: string) {
  const fields = 'id,caption,comments_count,like_count,media_type,media_url,owner,permalink,username';
  
  const response = await fetch(
    `https://graph.instagram.com/v22.0/${igUserId}/media?fields=${fields}&access_token=${accessToken}`
  );

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Instagram API error: ${data.error?.message || 'Unknown error'}`);
  }

  return {
    success: true,
    media: data.data || []
  };
}

// Obtener menciones (tags en publicaciones) usando las especificaciones del usuario
async function getInstagramTags(igUserId: string, accessToken: string) {
  const fields = 'id,caption,comments_count,like_count,media_type,media_url,permalink,username';
  
  const response = await fetch(
    `https://graph.instagram.com/v22.0/${igUserId}/tags?fields=${fields}&access_token=${accessToken}`
  );

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Instagram API error: ${data.error?.message || 'Unknown error'}`);
  }

  return {
    success: true,
    tags: data.data || []
  };
}