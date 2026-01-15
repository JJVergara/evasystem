/**
 * Ambassador Status Constants
 *
 * Defines status values and their TypeScript types.
 * Used by @/types/ambassador.ts
 */

export const PERFORMANCE_STATUS = {
  CUMPLE: 'cumple',
  ADVERTENCIA: 'advertencia',
  NO_CUMPLE: 'no_cumple',
  EXCLUSIVO: 'exclusivo',
} as const;

export type PerformanceStatus = (typeof PERFORMANCE_STATUS)[keyof typeof PERFORMANCE_STATUS];

export const AMBASSADOR_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DELETED: 'deleted',
} as const;

export type AmbassadorStatus = (typeof AMBASSADOR_STATUS)[keyof typeof AMBASSADOR_STATUS];

export const REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type RequestStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];
