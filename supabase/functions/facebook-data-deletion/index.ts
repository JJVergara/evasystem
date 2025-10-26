import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_APP_SECRET = Deno.env.get('META_APP_SECRET');

function base64UrlDecode(input: string) {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = input.length % 4;
  if (pad) input += '='.repeat(4 - pad);
  const decoded = atob(input);
  const bytes = new Uint8Array([...decoded].map(c => c.charCodeAt(0)));
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

async function verifySignedRequest(signedRequest: string) {
  if (!META_APP_SECRET) throw new Error('Missing META_APP_SECRET');
  const [sig, payload] = signedRequest.split('.');
  if (!sig || !payload) throw new Error('Invalid signed_request');

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(META_APP_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const bytes = new Uint8Array(mac);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  const expectedB64Url = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
  if (expectedB64Url !== sig) throw new Error('Signature mismatch');

  const json = JSON.parse(base64UrlDecode(payload));
  return json;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      let signedRequest: string | null = null;

      if (contentType.includes('application/x-www-form-urlencoded')) {
        const formBody = await req.text();
        const params = new URLSearchParams(formBody);
        signedRequest = params.get('signed_request');
      } else {
        const body = await req.json().catch(() => ({}));
        signedRequest = body.signed_request || null;
      }

      let userRef = 'unknown';
      try {
        if (signedRequest) {
          const parsed = await verifySignedRequest(signedRequest);
          userRef = parsed.user_id || parsed.user?.id || 'unknown';
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.warn('Could not verify signed_request:', errorMessage);
      }

      const code = crypto.randomUUID();
      const statusUrl = `https://awpfslcepylnipaolmvv.functions.supabase.co/functions/v1/facebook-data-deletion?code=${code}`;

      // TODO: Optionally mark records for deletion for this userRef
      return new Response(JSON.stringify({ url: statusUrl, confirmation_code: code }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'GET') {
      // Simple status endpoint
      const url = new URL(req.url);
      const code = url.searchParams.get('code') || 'unknown';
      return new Response(JSON.stringify({ status: 'pending', confirmation_code: code }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  } catch (e) {
    console.error('facebook-data-deletion error:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
