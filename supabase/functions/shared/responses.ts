import { corsHeaders } from './constants.ts';

export interface JsonResponseOptions {
  status?: number;
  headers?: HeadersInit;
}

export function jsonResponse(data: unknown, options: JsonResponseOptions = {}): Response {
  const { status = 200, headers = {} } = options;

  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export function errorResponse(error: string | Error, status = 500): Response {
  const message = typeof error === 'string' ? error : error.message;
  return jsonResponse({ error: message }, { status });
}

export function successResponse(data: unknown): Response {
  return jsonResponse({ success: true, ...data });
}

export function unauthorizedResponse(message = 'Authentication required'): Response {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message = 'Access denied'): Response {
  return errorResponse(message, 403);
}

export function notFoundResponse(message = 'Resource not found'): Response {
  return errorResponse(message, 404);
}

export function badRequestResponse(message = 'Bad request'): Response {
  return errorResponse(message, 400);
}

export function corsPreflightResponse(): Response {
  return new Response(null, { headers: corsHeaders });
}
