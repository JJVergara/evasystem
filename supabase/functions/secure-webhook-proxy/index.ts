import {
  corsPreflightResponse,
  jsonResponse,
  errorResponse,
  badRequestResponse,
} from '../shared/responses.ts';
import { authenticateRequest, getUserOrganization } from '../shared/auth.ts';

const ALLOWED_DOMAINS = [
  'hooks.zapier.com',
  'webhook.site',
  'n8n.cloud',
  'pipedream.com',
  'rquevedos.app.n8n.cloud',
];

const MAX_PAYLOAD_SIZE = 2 * 1024 * 1024;
const WEBHOOK_TIMEOUT_MS = 10000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    const authResult = await authenticateRequest(req, { requireAuth: true });
    if (authResult instanceof Response) {
      return authResult;
    }
    const { user, supabase } = authResult;

    const organizationId = await getUserOrganization(supabase, user.id);
    if (!organizationId) {
      return errorResponse('User has no organization', 400);
    }

    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      return badRequestResponse('Payload too large');
    }

    const body = await req.json();
    const { webhookUrl, data } = body;

    if (!webhookUrl || !data) {
      return badRequestResponse('Missing webhookUrl or data');
    }

    let url: URL;
    try {
      url = new URL(webhookUrl);
    } catch {
      return badRequestResponse('Invalid webhook URL format');
    }

    if (url.protocol !== 'https:') {
      return badRequestResponse('Only HTTPS URLs are allowed');
    }

    if (/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) {
      return badRequestResponse('IP addresses are not allowed');
    }

    if (url.port && !['80', '443', ''].includes(url.port)) {
      return badRequestResponse('Non-standard ports are not allowed');
    }

    const isAllowed = ALLOWED_DOMAINS.some(
      (domain) => url.hostname === domain || url.hostname.endsWith('.' + domain)
    );

    if (!isAllowed) {
      return badRequestResponse(`Domain ${url.hostname} is not in the allowed list`);
    }

    const requestId = crypto.randomUUID();

    const payload = {
      ...data,
      organization_id: organizationId,
      user_id: user.id,
      timestamp: new Date().toISOString(),
      request_id: requestId,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'EVA-System-Webhook-Proxy/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText };
      }

      return jsonResponse(
        {
          success: response.ok,
          status: response.status,
          data: responseData,
          request_id: requestId,
        },
        { status: response.ok ? 200 : 400 }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return errorResponse('Webhook request timed out', 504);
      }
      throw new Error(
        `Webhook request failed: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorResponse(errorMessage, 400);
  }
});
