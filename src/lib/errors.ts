import { AuthError, PostgrestError } from '@supabase/supabase-js';
import { toast } from 'sonner';

/**
 * Custom error classes for better error handling
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      `${resource}${id ? ` with id ${id}` : ''} not found`,
      'NOT_FOUND',
      404,
      { resource, id }
    );
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Error messages in Spanish for user-facing errors
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Auth errors
  'Invalid login credentials': 'Credenciales inválidas',
  'Email not confirmed': 'Por favor confirma tu email antes de iniciar sesión',
  'User already registered': 'Este usuario ya está registrado',
  'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
  'JWT expired': 'Tu sesión ha expirado. Por favor inicia sesión nuevamente',
  'Invalid Refresh Token': 'Tu sesión ha expirado. Por favor inicia sesión nuevamente',

  // Database errors
  'duplicate key value': 'Este registro ya existe',
  'foreign key violation': 'No se puede eliminar porque hay datos relacionados',
  'null value in column': 'Faltan campos requeridos',

  // Network errors
  'Failed to fetch': 'Error de conexión. Verifica tu internet',
  'Network request failed': 'Error de red. Intenta nuevamente',

  // Generic
  DEFAULT: 'Ha ocurrido un error. Intenta nuevamente',
};

/**
 * Get user-friendly error message
 */
function getUserMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof AuthError) {
    return ERROR_MESSAGES[error.message] || error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as { message?: string; code?: string };

    // Check for known error patterns
    for (const [pattern, message] of Object.entries(ERROR_MESSAGES)) {
      if (err.message?.includes(pattern) || err.code?.includes(pattern)) {
        return message;
      }
    }

    if (err.message) {
      return err.message;
    }
  }

  return ERROR_MESSAGES.DEFAULT;
}

/**
 * Log error for debugging
 */
function logError(context: string, error: unknown, extra?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const errorDetails = {
    timestamp,
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    ...extra,
  };

  console.error(`[${context}]`, errorDetails);

  // In production, you could send to error tracking service here
  // e.g., Sentry.captureException(error, { extra: errorDetails });
}

/**
 * Options for error handling
 */
interface HandleErrorOptions {
  /** Show toast notification to user */
  showToast?: boolean;
  /** Custom message to show instead of error message */
  customMessage?: string;
  /** Additional context for logging */
  context?: Record<string, unknown>;
  /** Rethrow the error after handling */
  rethrow?: boolean;
}

/**
 * Centralized error handler
 *
 * @example
 * try {
 *   await someOperation();
 * } catch (error) {
 *   handleError('MyComponent.someOperation', error);
 * }
 */
export function handleError(
  context: string,
  error: unknown,
  options: HandleErrorOptions = {}
): void {
  const {
    showToast = true,
    customMessage,
    context: extraContext,
    rethrow = false,
  } = options;

  // Log the error
  logError(context, error, extraContext);

  // Show toast if enabled
  if (showToast) {
    const message = customMessage || getUserMessage(error);

    // Determine toast type based on error
    if (error instanceof AuthError) {
      toast.error(message, { duration: 5000 });
    } else if (error instanceof ValidationError) {
      toast.warning(message);
    } else {
      toast.error(message);
    }
  }

  // Rethrow if requested
  if (rethrow) {
    throw error;
  }
}

/**
 * Handle Supabase PostgrestError specifically
 */
export function handleDatabaseError(
  context: string,
  error: PostgrestError,
  options: HandleErrorOptions = {}
): void {
  const errorContext = {
    ...options.context,
    code: error.code,
    details: error.details,
    hint: error.hint,
  };

  handleError(context, error, { ...options, context: errorContext });
}

/**
 * Type guard for PostgrestError
 */
export function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'details' in error
  );
}

/**
 * Type guard for AuthError
 */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

/**
 * Wrap an async function with error handling
 *
 * @example
 * const safeFetch = withErrorHandling(
 *   fetchData,
 *   'DataService.fetchData'
 * );
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context: string,
  options: HandleErrorOptions = {}
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
  return async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
    try {
      return await fn(...args) as ReturnType<T>;
    } catch (error) {
      handleError(context, error, options);
      return undefined;
    }
  };
}

/**
 * Create a result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Helper to create success result
 */
export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Helper to create error result
 */
export function failure<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}
