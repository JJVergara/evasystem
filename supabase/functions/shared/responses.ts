/**
 * HTTP Response Utilities
 * Standardized response creation for consistent API responses
 */

import { corsHeaders } from './constants.ts';

export interface JsonResponseOptions {
  status?: number;
  headers?: HeadersInit;
}

/**
 * Create a JSON response with CORS headers
 */
export function jsonResponse(
  data: unknown,
  options: JsonResponseOptions = {}
): Response {
  const { status = 200, headers = {} } = options;
  
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        ...headers
      }
    }
  );
}

/**
 * Create an error response
 */
export function errorResponse(
  error: string | Error,
  status = 500
): Response {
  const message = typeof error === 'string' ? error : error.message;
  return jsonResponse({ error: message }, { status });
}

/**
 * Create a success response with data
 */
export function successResponse(data: unknown): Response {
  return jsonResponse({ success: true, ...data });
}

/**
 * Create an unauthorized (401) response
 */
export function unauthorizedResponse(message = 'Authentication required'): Response {
  return errorResponse(message, 401);
}

/**
 * Create a forbidden (403) response
 */
export function forbiddenResponse(message = 'Access denied'): Response {
  return errorResponse(message, 403);
}

/**
 * Create a not found (404) response
 */
export function notFoundResponse(message = 'Resource not found'): Response {
  return errorResponse(message, 404);
}

/**
 * Create a bad request (400) response
 */
export function badRequestResponse(message = 'Bad request'): Response {
  return errorResponse(message, 400);
}

/**
 * Handle CORS preflight requests
 */
export function corsPreflightResponse(): Response {
  return new Response(null, { headers: corsHeaders });
}

