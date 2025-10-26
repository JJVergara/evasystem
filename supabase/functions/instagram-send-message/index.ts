import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeDecryptToken } from '../shared/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const { recipientId, message, organizationId } = await req.json();

    if (!recipientId || !message || !organizationId) {
      return new Response(JSON.stringify({ error: 'Missing required fields: recipientId, message, organizationId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify user owns the organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, facebook_page_id, name')
      .eq('id', organizationId)
      .eq('created_by', user.id)
      .single();

    if (orgError || !organization) {
      return new Response(JSON.stringify({ error: 'Organization not found or unauthorized' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get organization's Instagram access token
    const { data: tokenData, error: tokenError } = await supabase
      .from('organization_instagram_tokens')
      .select('access_token, token_expiry')
      .eq('organization_id', organizationId)
      .single();

    if (tokenError || !tokenData?.access_token) {
      return new Response(JSON.stringify({ error: 'Instagram access token not found for organization' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if token is expired
    if (tokenData.token_expiry && new Date(tokenData.token_expiry) < new Date()) {
      return new Response(JSON.stringify({ error: 'Instagram access token has expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Decrypt token for API call
    const decryptedToken = await safeDecryptToken(tokenData.access_token);

    // Send message via Instagram Messaging API
    const messagePayload = {
      recipient: {
        id: recipientId
      },
      message: {
        text: message
      }
    };

    const instagramApiUrl = `https://graph.facebook.com/v18.0/${organization.facebook_page_id}/messages`;
    
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
      return new Response(JSON.stringify({ 
        error: 'Failed to send Instagram message', 
        details: responseData.error || responseData 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log the sent message for audit trail
    console.log('Instagram message sent successfully:', {
      organizationId,
      recipientId,
      messageId: responseData.message_id,
      sentBy: user.id
    });

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: responseData.message_id,
      recipientId 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error sending Instagram message:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});