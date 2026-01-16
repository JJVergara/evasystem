import { corsHeaders, INSTAGRAM_API_BASE } from '../shared/constants.ts';
import {
  corsPreflightResponse,
  jsonResponse,
  unauthorizedResponse,
  badRequestResponse,
} from '../shared/responses.ts';
import { authenticateRequest, createSupabaseClient } from '../shared/auth.ts';
import { handleError, validateRequired } from '../shared/error-handler.ts';
import { safeDecryptToken } from '../shared/crypto.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    const authResult = await authenticateRequest(req);
    if (authResult instanceof Response) return authResult;

    const { user, supabase } = authResult;

    const { organization_id, endpoint } = await req.json();
    validateRequired({ organization_id }, ['organization_id']);

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, instagram_user_id, instagram_username')
      .eq('id', organization_id)
      .eq('created_by', user.id)
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: 'Organization not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: tokenData, error: tokenError } = await supabase.rpc(
      'get_organization_token_info',
      { org_id: organization_id }
    );

    if (tokenError || !tokenData || tokenData.length === 0) {
      return new Response(JSON.stringify({ error: 'No Instagram token found for organization' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orgToken = tokenData[0];
    if (orgToken.is_expired) {
      return new Response(JSON.stringify({ error: 'Instagram token has expired' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
        return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return handleError(error);
  }
});

async function getInstagramProfile(igUserId: string, accessToken: string) {
  const fields =
    'user_id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count';

  const response = await fetch(
    `${INSTAGRAM_API_BASE}/${igUserId}?fields=${fields}&access_token=${accessToken}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Instagram API error: ${data.error?.message || 'Unknown error'}`);
  }

  return {
    success: true,
    profile: data,
  };
}

async function getInstagramMedia(igUserId: string, accessToken: string) {
  const fields =
    'id,caption,comments_count,like_count,media_type,media_url,owner,permalink,username';

  const response = await fetch(
    `${INSTAGRAM_API_BASE}/${igUserId}/media?fields=${fields}&access_token=${accessToken}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Instagram API error: ${data.error?.message || 'Unknown error'}`);
  }

  return {
    success: true,
    media: data.data || [],
  };
}

async function getInstagramTags(igUserId: string, accessToken: string) {
  const fields = 'id,caption,comments_count,like_count,media_type,media_url,permalink,username';

  const response = await fetch(
    `${INSTAGRAM_API_BASE}/${igUserId}/tags?fields=${fields}&access_token=${accessToken}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Instagram API error: ${data.error?.message || 'Unknown error'}`);
  }

  return {
    success: true,
    tags: data.data || [],
  };
}
