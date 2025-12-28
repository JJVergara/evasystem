import { supabase } from '@/integrations/supabase/client';
import type { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';
import { handleError, isPostgrestError, Result, success, failure } from '@/lib/errors';

/**
 * Base service options
 */
export interface ServiceOptions {
  /** Log errors to console */
  logErrors?: boolean;
  /** Show toast on error */
  showToast?: boolean;
}

const defaultOptions: ServiceOptions = {
  logErrors: true,
  showToast: false,
};

/**
 * Wrap a Supabase query result in a Result type
 */
export async function wrapQuery<T>(
  queryPromise: PromiseLike<PostgrestSingleResponse<T>>,
  context: string,
  options: ServiceOptions = {}
): Promise<Result<T, PostgrestError>> {
  const opts = { ...defaultOptions, ...options };

  const { data, error } = await queryPromise;

  if (error) {
    if (opts.logErrors) {
      handleError(context, error, { showToast: opts.showToast });
    }
    return failure(error);
  }

  return success(data);
}

/**
 * Execute a query and return data or null
 */
export async function executeQuery<T>(
  queryPromise: PromiseLike<PostgrestSingleResponse<T>>,
  context: string,
  options: ServiceOptions = {}
): Promise<T | null> {
  const result = await wrapQuery(queryPromise, context, options);
  return result.success ? result.data : null;
}

/**
 * Execute a query and throw on error
 */
export async function executeQueryOrThrow<T>(
  queryPromise: PromiseLike<PostgrestSingleResponse<T>>,
  context: string
): Promise<T> {
  const { data, error } = await queryPromise;

  if (error) {
    handleError(context, error, { showToast: true, rethrow: true });
    throw error; // TypeScript needs this
  }

  return data;
}

/**
 * Build common query filters
 */
export interface QueryFilters {
  organizationId?: string;
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * Get the Supabase client instance
 */
export function getSupabaseClient() {
  return supabase;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return session !== null;
}

/**
 * Get current user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

/**
 * Validate organization access
 */
export async function validateOrganizationAccess(organizationId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { data } = await supabase.rpc('is_organization_member', {
    org_id: organizationId,
    user_auth_id: userId,
  });

  return data === true;
}

/**
 * Base service class with common CRUD operations
 */
export abstract class BaseService<
  TRow,
  TInsert,
  TUpdate,
  TTable extends string = string
> {
  protected tableName: TTable;
  protected context: string;

  constructor(tableName: TTable, context?: string) {
    this.tableName = tableName;
    this.context = context ?? `${tableName}Service`;
  }

  /**
   * Get all records for an organization
   */
  async getAll(organizationId: string, options: ServiceOptions = {}): Promise<TRow[]> {
    const result = await executeQuery(
      supabase
        .from(this.tableName)
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false }),
      `${this.context}.getAll`,
      options
    );

    return (result as TRow[]) ?? [];
  }

  /**
   * Get a single record by ID
   */
  async getById(id: string, options: ServiceOptions = {}): Promise<TRow | null> {
    return executeQuery(
      supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single(),
      `${this.context}.getById`,
      options
    ) as Promise<TRow | null>;
  }

  /**
   * Create a new record
   */
  async create(data: TInsert, options: ServiceOptions = {}): Promise<TRow | null> {
    return executeQuery(
      supabase
        .from(this.tableName)
        .insert(data as Record<string, unknown>)
        .select()
        .single(),
      `${this.context}.create`,
      { ...options, showToast: true }
    ) as Promise<TRow | null>;
  }

  /**
   * Update a record
   */
  async update(id: string, data: TUpdate, options: ServiceOptions = {}): Promise<TRow | null> {
    return executeQuery(
      supabase
        .from(this.tableName)
        .update(data as Record<string, unknown>)
        .eq('id', id)
        .select()
        .single(),
      `${this.context}.update`,
      { ...options, showToast: true }
    ) as Promise<TRow | null>;
  }

  /**
   * Delete a record
   */
  async delete(id: string, options: ServiceOptions = {}): Promise<boolean> {
    const result = await wrapQuery(
      supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)
        .select()
        .single(),
      `${this.context}.delete`,
      { ...options, showToast: true }
    );

    return result.success;
  }

  /**
   * Count records for an organization
   */
  async count(organizationId: string): Promise<number> {
    const { count, error } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (error) {
      handleError(`${this.context}.count`, error);
      return 0;
    }

    return count ?? 0;
  }
}
