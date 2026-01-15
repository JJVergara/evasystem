import { corsHeaders } from '../shared/constants.ts';
import { SupabaseClient } from '../shared/types.ts';
import {
  corsPreflightResponse,
  jsonResponse,
  unauthorizedResponse,
  badRequestResponse,
} from '../shared/responses.ts';
import { authenticateRequest, verifyOrganizationAccess } from '../shared/auth.ts';
import { handleError, validateRequired } from '../shared/error-handler.ts';
import { safeDecryptToken } from '../shared/crypto.ts';
import { sendInstagramMessage } from '../shared/instagram-api.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    // Authenticate user
    const authResult = await authenticateRequest(req);
    if (authResult instanceof Response) return authResult;

    const { user, supabase } = authResult;

    // Parse and validate request body
    const { recipientId, message, organizationId } = await req.json();
    validateRequired({ recipientId, message, organizationId }, [
      'recipientId',
      'message',
      'organizationId',
    ]);

    // Verify user owns the organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .eq('created_by', user.id)
      .single();

    if (orgError || !organization) {
      return jsonResponse({ error: 'Organization not found or unauthorized' }, { status: 404 });
    }

    // Get organization's Instagram access token
    const { data: tokenData, error: tokenError } = await supabase
      .from('organization_instagram_tokens')
      .select('access_token, token_expiry')
      .eq('organization_id', organizationId)
      .single();

    if (tokenError || !tokenData?.access_token) {
      return jsonResponse(
        { error: 'Instagram access token not found for organization' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (tokenData.token_expiry && new Date(tokenData.token_expiry) < new Date()) {
      return jsonResponse({ error: 'Instagram access token has expired' }, { status: 400 });
    }

    // Decrypt token for API call
    const decryptedToken = await safeDecryptToken(tokenData.access_token);

    // Send message via Instagram Messaging API using shared function
    const responseData = await sendInstagramMessage(recipientId, message, decryptedToken);

    // Log the sent message for audit trail
    console.log('Instagram message sent successfully:', {
      organizationId,
      recipientId,
      messageId: responseData.message_id,
      sentBy: user.id,
    });

    return jsonResponse({
      success: true,
      messageId: responseData.message_id,
      recipientId,
    });
  } catch (error) {
    return handleError(error);
  }
});
