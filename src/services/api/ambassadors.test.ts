/**
 * Tests for Ambassadors API Service
 *
 * These tests verify that:
 * 1. Service functions call Supabase correctly
 * 2. Data transformations (like @ stripping) work properly
 * 3. Errors are handled correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  getAmbassadors,
  createAmbassador,
  updateAmbassador,
  deleteAmbassador,
} from './ambassadors';

const mockSupabase = vi.mocked(supabase);

describe('Ambassadors Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAmbassadors', () => {
    it('should fetch ambassadors with correct query', async () => {
      const mockAmbassadors = [
        {
          id: 'amb-1',
          first_name: 'John',
          last_name: 'Doe',
          instagram_user: 'johndoe',
          organization_id: 'org-123',
          status: 'active',
        },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockAmbassadors, error: null }),
      };

      mockSupabase.from = vi.fn().mockReturnValue(mockChain);
      mockSupabase.rpc = vi.fn().mockResolvedValue({ data: [{ email: 'john@test.com' }] });

      const result = await getAmbassadors('org-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('embassadors');
      expect(mockChain.eq).toHaveBeenCalledWith('organization_id', 'org-123');
      expect(mockChain.neq).toHaveBeenCalledWith('status', 'deleted');
      expect(result).toHaveLength(1);
      expect(result[0].first_name).toBe('John');
    });

    it('should throw error when fetch fails', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Fetch failed') }),
      };

      mockSupabase.from = vi.fn().mockReturnValue(mockChain);

      await expect(getAmbassadors('org-123')).rejects.toThrow('Fetch failed');
    });
  });

  describe('createAmbassador', () => {
    it('should create ambassador with correct data', async () => {
      const mockCreated = {
        id: 'new-amb-1',
        first_name: 'Jane',
        last_name: 'Smith',
        instagram_user: 'janesmith',
        status: 'active',
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCreated, error: null }),
      };

      mockSupabase.from = vi.fn().mockReturnValue(mockChain);

      const input = {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@test.com',
        instagram_user: '@janesmith', // With @ symbol
      };

      const result = await createAmbassador('org-123', input);

      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org-123',
          first_name: 'Jane',
          last_name: 'Smith',
          instagram_user: 'janesmith', // @ should be stripped
          status: 'active',
          global_category: 'bronze',
          global_points: 0,
        })
      );
      expect(result.id).toBe('new-amb-1');
    });

    it('should strip @ from instagram username', async () => {
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      };

      mockSupabase.from = vi.fn().mockReturnValue(mockChain);

      await createAmbassador('org-123', {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@test.com',
        instagram_user: '@testuser',
      });

      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          instagram_user: 'testuser',
        })
      );
    });

    it('should throw error when creation fails', async () => {
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') }),
      };

      mockSupabase.from = vi.fn().mockReturnValue(mockChain);

      await expect(
        createAmbassador('org-123', {
          first_name: 'Test',
          last_name: 'User',
          email: 'test@test.com',
          instagram_user: 'testuser',
        })
      ).rejects.toThrow('Insert failed');
    });
  });

  describe('updateAmbassador', () => {
    it('should update ambassador with correct data', async () => {
      const mockUpdated = {
        id: 'amb-1',
        first_name: 'Updated',
        last_name: 'Name',
      };

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdated, error: null }),
      };

      mockSupabase.from = vi.fn().mockReturnValue(mockChain);

      const result = await updateAmbassador({
        id: 'amb-1',
        first_name: 'Updated',
        last_name: 'Name',
      });

      expect(mockChain.update).toHaveBeenCalledWith({
        first_name: 'Updated',
        last_name: 'Name',
      });
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'amb-1');
      expect(result.first_name).toBe('Updated');
    });

    it('should strip @ from instagram username on update', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'amb-1' }, error: null }),
      };

      mockSupabase.from = vi.fn().mockReturnValue(mockChain);

      await updateAmbassador({
        id: 'amb-1',
        instagram_user: '@newusername',
      });

      expect(mockChain.update).toHaveBeenCalledWith({
        instagram_user: 'newusername',
      });
    });

    it('should throw error when update fails', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Update failed') }),
      };

      mockSupabase.from = vi.fn().mockReturnValue(mockChain);

      await expect(updateAmbassador({ id: 'amb-1', first_name: 'New' })).rejects.toThrow(
        'Update failed'
      );
    });
  });

  describe('deleteAmbassador', () => {
    it('should soft delete ambassador by setting status to deleted', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from = vi.fn().mockReturnValue(mockChain);

      await deleteAmbassador('amb-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('embassadors');
      expect(mockChain.update).toHaveBeenCalledWith({ status: 'deleted' });
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'amb-123');
    });

    it('should throw error when delete fails', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error('Delete failed') }),
      };

      mockSupabase.from = vi.fn().mockReturnValue(mockChain);

      await expect(deleteAmbassador('amb-123')).rejects.toThrow('Delete failed');
    });
  });
});
