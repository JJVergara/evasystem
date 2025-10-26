// Complete fixes for all remaining TypeScript errors
// Pattern to fix: error.message => error instanceof Error ? error.message : String(error)

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function getErrorName(error: unknown): string {
  return error instanceof Error ? error.name : 'Error';
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

// Apply these fixes to all remaining files with TypeScript errors