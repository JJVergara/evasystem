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
    // Initialize Supabase client
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

    // Parse request body with size limit (2MB max)
    const MAX_PAYLOAD_SIZE = 2 * 1024 * 1024; // 2MB
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      throw new Error('Payload too large');
    }

    const body = await req.json()
    const { webhookUrl, data } = body

    if (!webhookUrl || !data) {
      throw new Error('Missing webhookUrl or data')
    }

    // Enhanced URL validation - enforce HTTPS and whitelist
    const allowedDomains = [
      'hooks.zapier.com',
      'webhook.site', 
      'n8n.cloud',
      'pipedream.com',
      'rquevedos.app.n8n.cloud' // Add specific n8n instance
    ];

    let url: URL;
    try {
      url = new URL(webhookUrl);
    } catch {
      throw new Error('Invalid webhook URL format');
    }

    // Security checks
    if (url.protocol !== 'https:') {
      throw new Error('Only HTTPS URLs are allowed');
    }

    // Reject IP addresses and non-standard ports
    if (/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) {
      throw new Error('IP addresses are not allowed');
    }

    if (url.port && !['80', '443', ''].includes(url.port)) {
      throw new Error('Non-standard ports are not allowed');
    }

    // Check if domain is in allowlist
    const isAllowed = allowedDomains.some(domain => 
      url.hostname === domain || url.hostname.endsWith('.' + domain)
    );

    if (!isAllowed) {
      throw new Error(`Domain ${url.hostname} is not in the allowed list`);
    }

    // Generate request ID for observability
    const requestId = crypto.randomUUID();
    
    // Prepare payload with organization and user context
    const payload = {
      ...data,
      organization_id: userData.organization_id,
      user_id: user.id,
      timestamp: new Date().toISOString(),
      request_id: requestId
    }

    console.log(`[${requestId}] Proxying request to:`, webhookUrl);

    console.log('Proxying request to:', webhookUrl);

    // Make the webhook request with timeout and proper error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'EVA-System-Webhook-Proxy/1.0'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText };
      }

      console.log('Webhook response status:', response.status);

      return new Response(
        JSON.stringify({
          success: response.ok,
          status: response.status,
          data: responseData
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.ok ? 200 : 400,
        },
      )
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Webhook request timed out');
      }
      throw new Error(`Webhook request failed: ${fetchError.message}`);
    }

  } catch (error) {
    console.error('Webhook proxy error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})