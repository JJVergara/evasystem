/**
 * Tasks API Service
 *
 * Abstracts Supabase operations for task management.
 * Used by useTasksManagement hook.
 */

import { supabase } from '@/integrations/supabase/client';

export type TaskType = 'story' | 'mention' | 'repost';
export type TaskStatusType =
  | 'pending'
  | 'uploaded'
  | 'in_progress'
  | 'completed'
  | 'invalid'
  | 'expired';

export interface TaskWithRelations {
  id: string;
  embassador_id: string;
  event_id: string;
  task_type: TaskType;
  platform: string;
  expected_hashtag: string | null;
  status: TaskStatusType;
  instagram_story_id: string | null;
  story_url: string | null;
  upload_time: string | null;
  expiry_time: string | null;
  completion_method: '24h_validation' | 'manual';
  engagement_score: number;
  reach_count: number;
  verified_through_api: boolean;
  points_earned: number;
  last_status_update: string;
  created_at: string;
  embassadors?: {
    first_name: string;
    last_name: string;
    instagram_user: string;
  };
  events?: {
    id: string;
    fiesta_id: string;
    fiestas?: { name: string };
  };
}

export interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  invalid: number;
  totalPoints: number;
  completionRate: number;
}

export interface TasksData {
  tasks: TaskWithRelations[];
  stats: TaskStats;
}

export interface CreateTaskInput {
  embassador_id: string;
  event_id: string;
  task_type: TaskType;
  expected_hashtag?: string;
}

export interface UpdateTaskInput {
  taskId: string;
  status: TaskStatusType;
  points?: number;
}

/**
 * Fetch all tasks for an organization with relations
 */
export async function getTasks(organizationId: string): Promise<TasksData> {
  const { data, error } = await supabase
    .from('tasks')
    .select(
      `
      *,
      embassadors (
        first_name,
        last_name,
        instagram_user,
        organization_id
      ),
      events (
        id,
        fiesta_id,
        fiestas (
          name
        )
      )
    `
    )
    .eq('embassadors.organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const tasksData = (data || []).map((task) => ({
    ...task,
    task_type: task.task_type as TaskType,
    status: task.status as TaskStatusType,
    completion_method: task.completion_method as '24h_validation' | 'manual',
  }));

  // Calculate stats
  const completed = tasksData.filter((t) => t.status === 'completed').length;
  const pending = tasksData.filter((t) =>
    ['pending', 'uploaded', 'in_progress'].includes(t.status)
  ).length;
  const invalid = tasksData.filter((t) => ['invalid', 'expired'].includes(t.status)).length;
  const totalPoints = tasksData.reduce((sum, t) => sum + t.points_earned, 0);
  const completionRate = tasksData.length > 0 ? (completed / tasksData.length) * 100 : 0;

  return {
    tasks: tasksData,
    stats: {
      total: tasksData.length,
      completed,
      pending,
      invalid,
      totalPoints,
      completionRate: Math.round(completionRate * 100) / 100,
    },
  };
}

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput): Promise<TaskWithRelations> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...input,
      status: 'pending',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as TaskWithRelations;
}

/**
 * Update task status and optionally points
 */
export async function updateTask(input: UpdateTaskInput): Promise<boolean> {
  const updateData: {
    status: TaskStatusType;
    last_status_update: string;
    points_earned?: number;
  } = {
    status: input.status,
    last_status_update: new Date().toISOString(),
  };

  if (input.points !== undefined) {
    updateData.points_earned = input.points;
  }

  const { error } = await supabase.from('tasks').update(updateData).eq('id', input.taskId);

  if (error) throw error;
  return true;
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<boolean> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);

  if (error) throw error;
  return true;
}
