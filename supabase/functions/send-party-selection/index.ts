/**
 * Send Party Selection Message
 * Sends an Instagram DM with quick reply buttons asking which party the story mention is for
 */

import { corsHeaders } from '../shared/constants.ts';
import { corsPreflightResponse, jsonResponse } from '../shared/responses.ts';
import { createSupabaseClient } from '../shared/auth.ts';
import { handleError } from '../shared/error-handler.ts';
import { safeDecryptToken } from '../shared/crypto.ts';
import {
  getActiveParties,
  buildQuickReplyOptions,
  buildPartyOptions,
  buildPartySelectionMessage,
  ActiveParty
} from '../shared/party-utils.ts';

interface SendPartySelectionRequest {
  mentionId: string;
  organizationId: string;
  recipientInstagramUserId: string;
}

interface QuickReplyMessage {
  text: string;
  quick_replies: Array<{
    content_type: 'text';
    title: string;
    payload: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  const supabase = createSupabaseClient();

  try {
    const { mentionId, organizationId, recipientInstagramUserId }: SendPartySelectionRequest = await req.json();

    if (!mentionId || !organizationId || !recipientInstagramUserId) {
      return jsonResponse(
        { error: 'Missing required fields: mentionId, organizationId, recipientInstagramUserId' },
        { status: 400 }
      );
    }

    console.log('Sending party selection message:', {
      mentionId,
      organizationId,
      recipientInstagramUserId: recipientInstagramUserId.slice(0, 8) + '...'
    });

    // Get organization with Facebook page ID
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, facebook_page_id')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      console.error('Organization not found:', orgError);
      return jsonResponse({ error: 'Organization not found' }, { status: 404 });
    }

    if (!organization.facebook_page_id) {
      console.error('Organization has no Facebook page ID');
      return jsonResponse({ error: 'Organization Instagram not configured' }, { status: 400 });
    }

    // Get active parties
    const parties = await getActiveParties(supabase, organizationId);

    if (parties.length < 2) {
      console.log('Not enough parties for selection, skipping message');
      return jsonResponse({
        success: false,
        reason: 'not_enough_parties',
        partyCount: parties.length
      });
    }

    // Get organization's Instagram access token
    const { data: tokenData, error: tokenError } = await supabase
      .from('organization_instagram_tokens')
      .select('access_token, token_expiry')
      .eq('organization_id', organizationId)
      .single();

    if (tokenError || !tokenData?.access_token) {
      console.error('Instagram token not found:', tokenError);
      return jsonResponse({ error: 'Instagram access token not found' }, { status: 400 });
    }

    // Check if token is expired
    if (tokenData.token_expiry && new Date(tokenData.token_expiry) < new Date()) {
      console.error('Instagram token expired');
      return jsonResponse({ error: 'Instagram access token expired' }, { status: 400 });
    }

    // Decrypt token
    const decryptedToken = await safeDecryptToken(tokenData.access_token);

    // Build message with quick replies
    const messageText = buildPartySelectionMessage(parties);
    const quickReplies = buildQuickReplyOptions(parties);
    const partyOptions = buildPartyOptions(parties);

    const messagePayload = {
      recipient: {
        id: recipientInstagramUserId
      },
      message: {
        text: messageText,
        quick_replies: quickReplies
      } as QuickReplyMessage
    };

    // Send via Instagram Messaging API
    const instagramApiUrl = `https://graph.facebook.com/v21.0/${organization.facebook_page_id}/messages`;

    console.log('Sending Instagram message to:', recipientInstagramUserId.slice(0, 8) + '...');

    const response = await fetch(instagramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${decryptedToken}`
      },
      body: JSON.stringify(messagePayload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Instagram API error:', responseData);
      return jsonResponse({
        error: 'Failed to send Instagram message',
        details: responseData.error || responseData
      }, { status: response.status });
    }

    console.log('Instagram message sent successfully:', {
      messageId: responseData.message_id,
      recipientId: responseData.recipient_id
    });

    // Update the social mention with pending status
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('social_mentions')
      .update({
        party_selection_status: 'pending_response',
        party_selection_message_sent_at: now,
        party_options_sent: partyOptions,
        party_selection_message_id: responseData.message_id
      })
      .eq('id', mentionId);

    if (updateError) {
      console.error('Error updating social mention:', updateError);
      // Don't fail the request, message was already sent
    }

    // Create notification for tracking
    await supabase
      .from('notifications')
      .insert({
        organization_id: organizationId,
        type: 'party_selection_sent',
        message: `Mensaje de selección de fiesta enviado - esperando respuesta`,
        target_type: 'social_mention',
        target_id: mentionId,
        priority: 'normal'
      });

    return jsonResponse({
      success: true,
      messageId: responseData.message_id,
      partiesOffered: parties.length,
      mentionId
    });

  } catch (error) {
    return handleError(error);
  }
});
