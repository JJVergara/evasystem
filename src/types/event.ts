/**
 * Event and Fiesta type definitions
 */

import type { EventStatus, FiestaStatus } from '@/constants';

/**
 * Core fiesta (party/campaign) data
 */
export interface Fiesta {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
  event_date: string | null;
  location: string | null;
  main_hashtag: string | null;
  secondary_hashtags: string[] | null;
  instagram_handle?: string | null;
  status: FiestaStatus | string;
  created_at: string;
  updated_at: string;
}

/**
 * Fiesta with metrics
 */
export interface FiestaWithMetrics extends Fiesta {
  ambassadorCount?: number;
  eventCount?: number;
  totalMentions?: number;
  totalReach?: number;
}

/**
 * Fiesta metrics summary
 */
export interface FiestaMetrics {
  totalAmbassadors: number;
  totalEvents: number;
  totalMentions: number;
  totalStories: number;
  totalReach: number;
  totalImpressions: number;
  avgEngagement: number;
}

/**
 * Data for creating a new fiesta
 */
export interface CreateFiestaInput {
  name: string;
  description?: string | null;
  event_date?: string | null;
  location?: string | null;
  main_hashtag?: string | null;
  secondary_hashtags?: string[] | null;
  status?: FiestaStatus | string;
}

/**
 * Data for updating a fiesta
 */
export interface UpdateFiestaInput extends Partial<CreateFiestaInput> {
  id: string;
}

/**
 * Core event data
 */
export interface Event {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
  fiesta_id: string | null;
  event_date: string | null;
  location: string | null;
  status: EventStatus | string;
  created_at: string;
  updated_at: string;
}

/**
 * Event with related data
 */
export interface EventWithRelations extends Event {
  fiesta?: Pick<Fiesta, 'id' | 'name'>;
  ambassadorCount?: number;
  taskCount?: number;
}

/**
 * Data for creating a new event
 */
export interface CreateEventInput {
  name: string;
  description?: string | null;
  fiesta_id?: string | null;
  event_date?: string | null;
  location?: string | null;
  status?: EventStatus;
}

/**
 * Data for updating an event
 */
export interface UpdateEventInput extends Partial<CreateEventInput> {
  id: string;
}

/**
 * Task assigned to ambassador for an event
 */
export interface Task {
  id: string;
  ambassador_id: string;
  event_id: string | null;
  fiesta_id: string | null;
  organization_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Task status values
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

/**
 * Task status display labels (Spanish)
 */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  completed: 'Completada',
  failed: 'Fallida',
  cancelled: 'Cancelada',
};
