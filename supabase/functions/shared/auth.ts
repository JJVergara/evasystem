/**
 * Authentication and Authorization Utilities
 * Centralized authentication logic for all edge functions
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './constants.ts';
import { SupabaseClient } from './types.ts';

export interface AuthResult {
  user: { id: string; [key: string]: unknown };
  supabase: SupabaseClient;
  isCron?: boolean;
}

export interface AuthOptions {
  requireAuth?: boolean;
  allowCron?: boolean;
}

/**
 * Create authenticated Supabase client
 */
export function createSupabaseClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

/**
 * Authenticate request and return user + client
 * Returns Response if authentication fails, AuthResult if successful
 */
export async function authenticateRequest(
  req: Request,
  options: AuthOptions = { requireAuth: true, allowCron: false }
): Promise<AuthResult | Response> {
  const authHeader = req.headers.get('Authorization');
  const cronSecret = req.headers.get('x-cron-secret');
  const supabase = createSupabaseClient();

  // Handle cron requests FIRST (cron secret takes priority over auth header)
  // This allows calling with both auth header (for Supabase gateway) and cron secret
  if (options.allowCron && cronSecret) {
    const expectedSecret = Deno.env.get('CRON_SECRET');
    if (expectedSecret && cronSecret === expectedSecret) {
      console.log('[AUTH] Authenticated via cron secret');
      // Return a system user for cron jobs
      return {
        user: { id: 'system', isCron: true },
        supabase,
        isCron: true
      };
    } else {
      console.log('[AUTH] Invalid cron secret provided');
    }
  }

  // Require authentication
  if (!authHeader && options.requireAuth) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    console.log('[AUTH] Validating user token...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.log('[AUTH] User token validation failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[AUTH] User authenticated:', user.id);
    return { user, supabase };
  }

  // No auth required
  console.log('[AUTH] No auth required, using anonymous user');
  return { user: { id: 'anonymous' }, supabase };
}

/**
 * Verify organization ownership
 */
export async function verifyOrganizationAccess(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<boolean> {
  if (userId === 'system') return true; // Cron jobs have full access
  
  const { data: org, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', organizationId)
    .eq('created_by', userId)
    .single();

  return !error && !!org;
}

/**
 * Verify organization membership (user is member but not necessarily owner)
 */
export async function verifyOrganizationMembership(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const { data: isMember, error } = await supabase
    .rpc('is_organization_member', {
      user_auth_id: userId,
      org_id: organizationId
    });

  return !error && isMember === true;
}

/**
 * Get user's organization
 */
export async function getUserOrganization(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('organization_id')
    .eq('auth_user_id', userId)
    .single();

  return data?.organization_id ?? null;
}

/**
 * Get organization with Instagram credentials
 */
export async function getOrganizationWithCredentials(
  supabase: SupabaseClient,
  organizationId: string
) {
  const { data: org, error } = await supabase
    .from('organizations')
    .select('id, name, instagram_business_account_id, instagram_username')
    .eq('id', organizationId)
    .single();

  if (error || !org) {
    throw new Error('Organization not found');
  }

  // Get encrypted token from secure table
  const { data: tokenData, error: tokenError } = await supabase
    .from('organization_instagram_tokens')
    .select('access_token, token_expiry')
    .eq('organization_id', organizationId)
    .single();

  if (tokenError || !tokenData) {
    throw new Error('No Instagram token found for organization');
  }

  return {
    ...org,
    access_token: tokenData.access_token,
    token_expiry: tokenData.token_expiry
  };
}
