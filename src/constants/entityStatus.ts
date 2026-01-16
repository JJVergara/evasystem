export const FIESTA_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  COMPLETED: 'completed',
  DRAFT: 'draft',
} as const;

export type FiestaStatus = (typeof FIESTA_STATUS)[keyof typeof FIESTA_STATUS];

export const EVENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];

export const MEMBER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
} as const;

export type MemberStatus = (typeof MEMBER_STATUS)[keyof typeof MEMBER_STATUS];
