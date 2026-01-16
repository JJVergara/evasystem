import type { EventStatus, FiestaStatus } from '@/constants';

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

export interface FiestaWithMetrics extends Fiesta {
  ambassadorCount?: number;
  eventCount?: number;
  totalMentions?: number;
  totalReach?: number;
}

export interface FiestaMetrics {
  totalAmbassadors: number;
  totalEvents: number;
  totalMentions: number;
  totalStories: number;
  totalReach: number;
  totalImpressions: number;
  avgEngagement: number;
}

export interface CreateFiestaInput {
  name: string;
  description?: string | null;
  event_date?: string | null;
  location?: string | null;
  main_hashtag?: string | null;
  secondary_hashtags?: string[] | null;
  status?: FiestaStatus | string;
}

export interface UpdateFiestaInput extends Partial<CreateFiestaInput> {
  id: string;
}

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

export interface EventWithRelations extends Event {
  fiesta?: Pick<Fiesta, 'id' | 'name'>;
  ambassadorCount?: number;
  taskCount?: number;
}

export interface CreateEventInput {
  name: string;
  description?: string | null;
  fiesta_id?: string | null;
  event_date?: string | null;
  location?: string | null;
  status?: EventStatus;
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  id: string;
}

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

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  completed: 'Completada',
  failed: 'Fallida',
  cancelled: 'Cancelada',
};
