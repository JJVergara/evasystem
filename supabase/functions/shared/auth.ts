import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './constants.ts';
import type { SupabaseClient } from './types.ts';

export interface AuthResult {
  user: { id: string; [key: string]: unknown };
  supabase: SupabaseClient;
  isCron?: boolean;
}

export interface AuthOptions {
  requireAuth?: boolean;
  allowCron?: boolean;
}

export function createSupabaseClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

export async function authenticateRequest(
  req: Request,
  options: AuthOptions = { requireAuth: true, allowCron: false }
): Promise<AuthResult | Response> {
  const authHeader = req.headers.get('Authorization');
  const cronSecret = req.headers.get('x-cron-secret');
  const supabase = createSupabaseClient();

  if (options.allowCron && cronSecret) {
    const expectedSecret = Deno.env.get('CRON_SECRET');
    if (expectedSecret && cronSecret === expectedSecret) {
      return {
        user: { id: 'system', isCron: true },
        supabase,
        isCron: true,
      };
    }
  }

  if (!authHeader && options.requireAuth) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (authHeader) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return { user, supabase };
  }

  return { user: { id: 'anonymous' }, supabase };
}

export async function verifyOrganizationAccess(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<boolean> {
  if (userId === 'system') return true;

  const { data: org, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', organizationId)
    .eq('created_by', userId)
    .single();

  return !error && !!org;
}

export async function verifyOrganizationMembership(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const { data: isMember, error } = await supabase.rpc('is_organization_member', {
    user_auth_id: userId,
    org_id: organizationId,
  });

  return !error && isMember === true;
}

export async function getUserOrganization(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: userOrgs, error } = await supabase.rpc('get_user_organizations', {
    user_auth_id: userId,
  });

  if (error || !userOrgs || userOrgs.length === 0) {
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', userId)
      .single();

    return userData?.organization_id ?? null;
  }

  return userOrgs[0].organization_id;
}

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
    token_expiry: tokenData.token_expiry,
  };
}
