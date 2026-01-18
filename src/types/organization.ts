import type { MemberStatus } from '@/constants';

export interface Organization {
  id: string;
  name: string;
  description?: string | null;
  instagram_username?: string | null;
  instagram_user_id?: string | null;
  instagram_business_account_id?: string | null;
  instagram_profile_picture_url?: string | null;
  instagram_access_token?: string | null;
  instagram_token_expiry?: string | null;
  instagram_token_status?: string | null;
  created_at: string;
  created_by?: string;
}

export interface OrganizationWithStats extends Organization {
  ambassadorCount?: number;
  eventCount?: number;
  fiestaCount?: number;
}

export interface OrganizationMembership {
  id: string;
  user_id: string;
  organization_id: string;
  role: OrganizationRole;
  status: MemberStatus | string;
  permissions: OrganizationPermissions;
  created_at: string;
}

export interface OrganizationMember extends OrganizationMembership {
  user?: {
    email?: string;
    full_name?: string;
  };
}

export type OrganizationRole = 'owner' | 'admin' | 'manager' | 'viewer';

export interface OrganizationPermissions {
  manage_organization?: boolean;
  manage_members?: boolean;
  manage_ambassadors?: boolean;
  manage_events?: boolean;
  view_analytics?: boolean;
  manage_instagram?: boolean;
}

export const DEFAULT_PERMISSIONS: Record<OrganizationRole, OrganizationPermissions> = {
  owner: {
    manage_organization: true,
    manage_members: true,
    manage_ambassadors: true,
    manage_events: true,
    view_analytics: true,
    manage_instagram: true,
  },
  admin: {
    manage_organization: false,
    manage_members: true,
    manage_ambassadors: true,
    manage_events: true,
    view_analytics: true,
    manage_instagram: true,
  },
  manager: {
    manage_organization: false,
    manage_members: false,
    manage_ambassadors: true,
    manage_events: true,
    view_analytics: true,
    manage_instagram: false,
  },
  viewer: {
    manage_organization: false,
    manage_members: false,
    manage_ambassadors: false,
    manage_events: false,
    view_analytics: true,
    manage_instagram: false,
  },
};

export interface OrganizationSettings {
  id: string;
  organization_id: string;
  instagram_client_id?: string | null;
  instagram_client_secret?: string | null;
  webhook_verify_token?: string | null;
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface CreateOrganizationInput {
  name: string;
  description?: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  description?: string;
  instagram_username?: string;
}

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  manager: 'Gestor',
  viewer: 'Visualizador',
};

export function hasPermission(
  membership: Pick<OrganizationMembership, 'permissions' | 'role'>,
  permission: keyof OrganizationPermissions
): boolean {
  if (membership.role === 'owner') return true;

  return (
    membership.permissions?.[permission] ??
    DEFAULT_PERMISSIONS[membership.role]?.[permission] ??
    false
  );
}
