import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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

    const { organization_id, test } = await req.json();

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: 'Organization ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Verify user owns this organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, meta_token, token_expiry, instagram_business_account_id, instagram_username')
      .eq('id', organization_id)
      .eq('created_by', user.id) // CRITICAL: Only allow access to owned organizations
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: 'Organization not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result = {};

    switch (test) {
      case 'token_validity':
        result = await testTokenValidity(org);
        break;
      case 'profile_access':
        result = await testProfileAccess(org);
        break;
      case 'mentions_permissions':
        result = await testMentionsPermissions(org);
        break;
      case 'stories_permissions':
        result = await testStoriesPermissions(org);
        break;
      case 'webhook_status':
        result = await testWebhookStatus(supabase, org);
        break;
      case 'webhook_test':
        result = await testWebhookDelivery(org);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid test type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in instagram-diagnostics:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function testTokenValidity(org: any) {
  // Get credentials from secure table
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: creds, error: credsError } = await supabase
    .rpc('get_organization_credentials_secure', {
      p_organization_id: org.id
    });

  if (credsError || !creds || creds.length === 0) {
    return { 
      valid: false, 
      error: 'No Meta credentials configured for organization',
      credentials_info: {
        app_id: 'Not configured',
        has_app_secret: false,
        has_webhook_token: false
      }
    };
  }

  const orgCreds = creds[0];
  
  if (!org.meta_token) {
    return { 
      valid: false, 
      error: 'No Instagram token found',
      credentials_info: {
        app_id: orgCreds.meta_app_id || 'Not configured',
        has_app_secret: !!orgCreds.meta_app_secret,
        has_webhook_token: !!orgCreds.webhook_verify_token
      }
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?access_token=${org.meta_token}`
    );

    const data = await response.json();
    
    if (data.error) {
      return { 
        valid: false, 
        error: data.error.message,
        credentials_info: {
          app_id: orgCreds.meta_app_id || 'Not configured',
          has_app_secret: !!orgCreds.meta_app_secret,
          has_webhook_token: !!orgCreds.webhook_verify_token
        }
      };
    }

    return { 
      valid: true, 
      token_info: {
        account: data.name || data.username,
        id: data.id
      },
      credentials_info: {
        app_id: orgCreds.meta_app_id || 'Not configured',
        has_app_secret: !!orgCreds.meta_app_secret,
        has_webhook_token: !!orgCreds.webhook_verify_token
      }
    };
  } catch (error) {
    return { 
      valid: false, 
      error: error.message,
      credentials_info: {
        app_id: orgCreds.meta_app_id || 'Not configured',
        has_app_secret: !!orgCreds.meta_app_secret,
        has_webhook_token: !!orgCreds.webhook_verify_token
      }
    };
  }
}

async function testProfileAccess(org: any) {
  if (!org.meta_token || !org.instagram_business_account_id) {
    throw new Error('Missing token or Instagram business account ID');
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${org.instagram_business_account_id}?fields=id,username,followers_count,media_count&access_token=${org.meta_token}`
    );
    const data = await response.json();
    
    if (response.ok) {
      return { 
        accessible: true, 
        profile: data 
      };
    } else {
      throw new Error(data.error?.message || 'Profile access failed');
    }
  } catch (error) {
    throw new Error(`Profile access error: ${error.message}`);
  }
}

async function testMentionsPermissions(org: any) {
  if (!org.meta_token || !org.instagram_business_account_id) {
    throw new Error('Missing token or Instagram business account ID');
  }

  try {
    // Test access to mentioned media
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${org.instagram_business_account_id}/tags?limit=1&access_token=${org.meta_token}`
    );
    const data = await response.json();
    
    if (response.ok) {
      return { 
        accessible: true, 
        mentions_available: data.data ? data.data.length >= 0 : true,
        sample_data: data.data
      };
    } else {
      throw new Error(data.error?.message || 'Mentions access failed');
    }
  } catch (error) {
    throw new Error(`Mentions permissions error: ${error.message}`);
  }
}

async function testStoriesPermissions(org: any) {
  if (!org.meta_token || !org.instagram_business_account_id) {
    throw new Error('Missing token or Instagram business account ID');
  }

  try {
    // Test access to stories
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${org.instagram_business_account_id}/stories?limit=1&access_token=${org.meta_token}`
    );
    const data = await response.json();
    
    if (response.ok) {
      return { 
        accessible: true, 
        stories_available: data.data ? data.data.length >= 0 : true
      };
    } else {
      // Stories might not be available or might require different permissions
      return { 
        accessible: false, 
        error: data.error?.message || 'Stories access not available',
        note: 'This might be normal if no recent stories exist or permissions are limited'
      };
    }
  } catch (error) {
    return { 
      accessible: false, 
      error: `Stories permissions error: ${error.message}`,
      note: 'This might be normal depending on account type and permissions'
    };
  }
}

async function testWebhookStatus(supabase: any, org: any) {
  // Get credentials to verify webhook setup
  const { data: creds, error: credsError } = await supabase
    .rpc('get_organization_credentials_secure', {
      p_organization_id: org.id
    });

  const hasCredentials = !credsError && creds && creds.length > 0;
  const orgCreds = hasCredentials ? creds[0] : null;

  // Check for recent webhook notifications in the last 24 hours
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const { data: recentNotifications, error } = await supabase
    .from('notifications')
    .select('created_at, type')
    .eq('organization_id', org.id)
    .gte('created_at', yesterday.toISOString())
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    return { 
      configured: hasCredentials, 
      reachable: false, 
      error: error.message,
      credentials_configured: hasCredentials,
      webhook_url: 'https://awpfslcepylnipaolmvv.supabase.co/functions/v1/instagram-webhook'
    };
  }

  return {
    configured: hasCredentials,
    reachable: recentNotifications && recentNotifications.length > 0,
    recent_activity: recentNotifications?.map((n: any) => ({
      type: n.type,
      created_at: n.created_at
    })) || [],
    credentials_configured: hasCredentials,
    app_id: orgCreds?.meta_app_id || null,
    webhook_url: 'https://awpfslcepylnipaolmvv.supabase.co/functions/v1/instagram-webhook',
    verify_token_configured: !!(orgCreds?.webhook_verify_token)
  };
}

async function testWebhookDelivery(org: any) {
  // Send a test webhook payload to verify signature validation
  if (!org.instagram_business_account_id) {
    return {
      test_sent: false,
      error: 'No Instagram Business Account ID configured'
    };
  }

  try {
    // Get organization credentials for signing
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: creds, error: credsError } = await supabase
      .rpc('get_organization_credentials_secure', {
        p_organization_id: org.id
      });

    if (credsError || !creds || creds.length === 0 || !creds[0].meta_app_secret) {
      return {
        test_sent: false,
        error: 'No Meta App Secret configured for organization'
      };
    }

    const appSecret = creds[0].meta_app_secret;

    // Create test payload
    const testPayload = {
      object: "instagram",
      entry: [{
        id: org.instagram_business_account_id,
        messaging: [{
          sender: { id: "test_user_id" },
          recipient: { id: org.instagram_business_account_id },
          timestamp: Date.now(),
          referral: {
            source: "SHORTLINK",
            type: "STORY",
            referer_uri: "https://www.instagram.com/stories/test_user/123456789/"
          },
          message: {
            text: "EVA Diagnostics Test - Story Mention"
          }
        }]
      }]
    };

    const payloadString = JSON.stringify(testPayload);

    // Generate signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(appSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadString));
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Send test webhook to our own endpoint
    const webhookResponse = await fetch('https://awpfslcepylnipaolmvv.supabase.co/functions/v1/instagram-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': `sha256=${signatureHex}`,
        'User-Agent': 'EVA-Diagnostics-Test'
      },
      body: payloadString
    });

    const responseText = await webhookResponse.text();
    
    return {
      test_sent: true,
      webhook_response_status: webhookResponse.status,
      webhook_response: responseText,
      success: webhookResponse.status === 200,
      signature_used: `sha256=${signatureHex.substring(0, 8)}...`,
      app_id_used: creds[0].meta_app_id
    };

  } catch (error) {
    console.error('Webhook test error:', error);
    return {
      test_sent: false,
      error: error.message
    };
  }
}