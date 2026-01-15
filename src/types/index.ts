/**
 * Shared type definitions for EvaSystem
 *
 * Usage:
 * import type { Ambassador, Organization, Fiesta } from '@/types';
 */

// Ambassador types
export type {
  Ambassador,
  AmbassadorSensitiveData,
  CreateAmbassadorInput,
  UpdateAmbassadorInput,
  AmbassadorMetrics,
  AmbassadorRanking,
  AmbassadorRequest,
  ApproveRequestInput,
} from './ambassador';

export {
  getAmbassadorFullName,
  getAmbassadorInitials,
} from './ambassador';

// Organization types
export type {
  Organization,
  OrganizationWithStats,
  OrganizationMembership,
  OrganizationMember,
  OrganizationRole,
  OrganizationPermissions,
  OrganizationSettings,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from './organization';

export {
  DEFAULT_PERMISSIONS,
  ROLE_LABELS,
  hasPermission,
} from './organization';

// Event/Fiesta types
export type {
  Fiesta,
  FiestaWithMetrics,
  FiestaMetrics,
  CreateFiestaInput,
  UpdateFiestaInput,
  Event,
  EventWithRelations,
  CreateEventInput,
  UpdateEventInput,
  Task,
  TaskStatus,
} from './event';

export { TASK_STATUS_LABELS } from './event';

// Story mention types (existing)
export type { StoryMention } from './storyMentions';
