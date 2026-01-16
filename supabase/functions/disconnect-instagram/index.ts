import { corsHeaders } from '../shared/constants.ts';
import { corsPreflightResponse, jsonResponse } from '../shared/responses.ts';
import { authenticateRequest, getUserOrganization, createSupabaseClient } from '../shared/auth.ts';
import { handleError, assert } from '../shared/error-handler.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    const authResult = await authenticateRequest(req);
    if (authResult instanceof Response) return authResult;

    const { user, supabase: supabaseClient } = authResult;

    const organizationId = await getUserOrganization(supabaseClient, user.id);
    assert(organizationId, 'Organization not found', 404);

    const { error: tokenError } = await supabaseClient
      .from('organization_instagram_tokens')
      .delete()
      .eq('organization_id', organizationId);

    if (tokenError) {
      console.error('Failed to delete organization tokens:', tokenError);
      throw new Error('Failed to disconnect Instagram tokens');
    }

    const { data: hasAccess } = await supabaseClient.rpc('is_organization_member', {
      user_auth_id: user.id,
      org_id: organizationId,
    });

    if (!hasAccess) {
      throw new Error('No access to this organization');
    }

    const { error: updateError } = await supabaseClient
      .from('organizations')
      .update({
        instagram_user_id: null,
        instagram_username: null,
        facebook_page_id: null,
        instagram_business_account_id: null,
        last_instagram_sync: null,
      })
      .eq('id', organizationId);

    if (updateError) {
      console.error('Failed to disconnect Instagram:', updateError);
      throw new Error('Failed to disconnect Instagram account');
    }

    console.log('Instagram account disconnected successfully for organization:', organizationId);

    return jsonResponse({
      success: true,
      message: 'Instagram account disconnected successfully',
    });
  } catch (error) {
    return handleError(error);
  }
});
