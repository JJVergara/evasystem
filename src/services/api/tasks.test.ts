/**
 * Tests for Tasks API Service
 *
 * These tests verify that:
 * 1. Service functions call Supabase correctly
 * 2. Data transformations are applied properly
 * 3. Errors are thrown when Supabase returns errors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { getTasks, createTask, updateTask, deleteTask } from './tasks';

// Type the mock
const mockSupabase = vi.mocked(supabase);

describe('Tasks Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTasks', () => {
    it('should fetch tasks with correct query structure', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          embassador_id: 'amb-1',
          event_id: 'evt-1',
          task_type: 'story',
          platform: 'instagram',
          status: 'pending',
          points_earned: 0,
          engagement_score: 0,
          reach_count: 0,
          verified_through_api: false,
          completion_method: '24h_validation',
          created_at: '2024-01-01',
          last_status_update: '2024-01-01',
          embassadors: { first_name: 'John', last_name: 'Doe', instagram_user: 'johndoe' },
          events: { id: 'evt-1', fiesta_id: 'fiesta-1', fiestas: { name: 'Test Fiesta' } },
        },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
      };

      mockSupabase.from = vi.fn().mockReturnValue(mockChain);

      const result = await getTasks('org-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
      expect(mockChain.select).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledWith('embassadors.organization_id', 'org-123');
      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].task_type).toBe('story');
      expect(result.stats.total).toBe(1);
    });

    it('should calculate stats correctly', async () => {
      const mockTasks = [
        { status: 'completed', points_earned: 10 },
        { status: 'completed', points_earned: 20 },
        { status: 'pending', points_earned: 0 },
        { status: 'invalid', points_earned: 0 },
      ].map((t, i) => ({
        ...t,
        id: `task-${i}`,
        embassador_id: 'amb-1',
        event_id: 'evt-1',
        task_type: 'story',
        platform: 'instagram',
        engagement_score: 0,
        reach_count: 0,
        verified_through_api: false,
        completion_method: '24h_validation',
        created_at: '2024-01-01',
        last_status_update: '2024-01-01',
      }));

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
      };

      mockSupabase.from = vi.fn().mockReturnValue(mockChain);

      const result = await getTasks('org-123');

      expect(result.stats.total).toBe(4);
      expect(result.stats.completed).toBe(2);
      expect(result.stats.pending).toBe(1);
      expect(result.stats.invalid).toBe(1);
      expect(result.stats.totalPoints).toBe(30);
      expect(result.stats.completionRate).toBe(50);
    });

    it('should throw error when Supabase returns error', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
      };

      mockSupabase.from = vi.fn().mockReturnValue(mockChain);

      await expect(getTasks('org-123')).rejects.toThrow('Database error');
    });
  });

  describe('createTask', () => {
    it('should create task with correct data', async () => {
      const mockCreatedTask = {
        id: 'new-task-1',
        embassador_id: 'amb-1',
        event_id: 'evt-1',
        task_type: 'story',
        status: 'pending',
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCreatedTask, error: null }),
      };

      mockSupabase.from = vi.fn().mockReturnValue(mockChain);

      const input = {
        embassador_id: 'amb-1',
        event_id: 'evt-1',
        task_type: 'story' as const,
        expected_hashtag: '#test',
      };

      const result = await createTask(input);

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          embassador_id: 'amb-1',
          event_id: 'evt-1',
          task_type: 'story',
          expected_hashtag: '#test',
          status: 'pending',
        })
      );
      expect(result.id).toBe('new-task-1');
    });

    it('should throw error when creation fails', async () => {
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') }),
      };

      mockSupabase.from = vi.fn().mockReturnValue(mockChain);

      await expect(
        createTask({
          embassador_id: 'amb-1',
          event_id: 'evt-1',
          task_type: 'story',
        })
      ).rejects.toThrow('Insert failed');
    });
  });

  describe('updateTask', () => {
    it('should update task status correctly', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from = vi.fn().mockReturnValue(mockChain);

      const result = await updateTask({
        taskId: 'task-123',
        status: 'completed',
        points: 25,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          points_earned: 25,
        })
      );
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'task-123');
      expect(result).toBe(true);
    });

    it('should update without points when not provided', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from = vi.fn().mockReturnValue(mockChain);

      await updateTask({
        taskId: 'task-123',
        status: 'in_progress',
      });

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.not.objectContaining({ points_earned: expect.anything() })
      );
    });

    it('should throw error when update fails', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error('Update failed') }),
      };

      mockSupabase.from = vi.fn().mockReturnValue(mockChain);

      await expect(
        updateTask({ taskId: 'task-123', status: 'completed' })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('deleteTask', () => {
    it('should delete task by id', async () => {
      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from = vi.fn().mockReturnValue(mockChain);

      const result = await deleteTask('task-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
      expect(mockChain.delete).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'task-123');
      expect(result).toBe(true);
    });

    it('should throw error when delete fails', async () => {
      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error('Delete failed') }),
      };

      mockSupabase.from = vi.fn().mockReturnValue(mockChain);

      await expect(deleteTask('task-123')).rejects.toThrow('Delete failed');
    });
  });
});
