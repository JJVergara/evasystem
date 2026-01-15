/**
 * Centralized Constants
 *
 * Usage:
 * import { QUERY_KEYS } from '@/constants';
 * import type { PerformanceStatus, FiestaStatus } from '@/constants';
 */

// Status types (used by @/types)
export {
  PERFORMANCE_STATUS,
  AMBASSADOR_STATUS,
  REQUEST_STATUS,
  type PerformanceStatus,
  type AmbassadorStatus,
  type RequestStatus,
} from './ambassadorStatus';

export { AMBASSADOR_CATEGORY, type AmbassadorCategory } from './categories';

export {
  FIESTA_STATUS,
  EVENT_STATUS,
  MEMBER_STATUS,
  type FiestaStatus,
  type EventStatus,
  type MemberStatus,
} from './entityStatus';

// Query keys (used by hooks)
export { QUERY_KEYS } from './queryKeys';
