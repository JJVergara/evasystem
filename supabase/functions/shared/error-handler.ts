/**
 * Error Handling Utilities
 * Standardized error handling for all edge functions
 */

import { errorResponse } from './responses.ts';
import { InstagramApiError } from './instagram-api.ts';

/**
 * Handle and format errors consistently
 */
export function handleError(error: unknown): Response {
  console.error('Function error:', error);

  // Instagram API errors
  if (error instanceof InstagramApiError) {
    console.error('Instagram API error:', {
      message: error.message,
      statusCode: error.statusCode,
      fbError: error.fbError,
    });
    return errorResponse(error.message, error.statusCode || 500);
  }

  // Standard Error objects
  if (error instanceof Error) {
    const message = error.message;

    // Common error patterns
    if (message.includes('Unauthorized') || message.includes('Invalid authentication')) {
      return errorResponse(message, 401);
    }
    if (message.includes('Forbidden') || message.includes('Access denied')) {
      return errorResponse(message, 403);
    }
    if (message.includes('Not found')) {
      return errorResponse(message, 404);
    }
    if (message.includes('Bad request') || message.includes('Invalid')) {
      return errorResponse(message, 400);
    }

    return errorResponse(message, 500);
  }

  // Unknown error type
  return errorResponse('An unexpected error occurred', 500);
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R | Response> {
  return async (...args: T): Promise<R | Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Assert condition or throw error
 */
export function assert(condition: unknown, message: string, statusCode = 400): asserts condition {
  if (!condition) {
    const error = new Error(message);
    (error as Error & { statusCode: number }).statusCode = statusCode;
    throw error;
  }
}

/**
 * Validate required fields in request body
 */
export function validateRequired<T extends Record<string, unknown>>(
  data: T,
  fields: (keyof T)[]
): void {
  const missing = fields.filter((field) => !data[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}
