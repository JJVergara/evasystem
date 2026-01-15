/**
 * Tests for QUERY_KEYS constants
 *
 * These tests verify that:
 * 1. All query key factories return correct tuple structures
 * 2. Keys are unique and follow the [entity, scope] pattern
 * 3. Type safety is maintained
 */

import { describe, it, expect } from 'vitest';
import { QUERY_KEYS } from './queryKeys';

describe('QUERY_KEYS', () => {
  describe('Ambassador-related queries', () => {
    it('should create ambassadors query key with organization scope', () => {
      const key = QUERY_KEYS.ambassadors('org-123');
      expect(key).toEqual(['ambassadors', 'org-123']);
      expect(key[0]).toBe('ambassadors');
      expect(key[1]).toBe('org-123');
    });

    it('should create ambassador query key with ambassador scope', () => {
      const key = QUERY_KEYS.ambassador('amb-456');
      expect(key).toEqual(['ambassador', 'amb-456']);
    });

    it('should create ambassadorMetrics query key', () => {
      const key = QUERY_KEYS.ambassadorMetrics('amb-789');
      expect(key).toEqual(['ambassadorMetrics', 'amb-789']);
    });

    it('should create ambassadorRanking query key', () => {
      const key = QUERY_KEYS.ambassadorRanking('org-123');
      expect(key).toEqual(['ambassadorRanking', 'org-123']);
    });

    it('should create ambassadorRequests query key', () => {
      const key = QUERY_KEYS.ambassadorRequests('org-123');
      expect(key).toEqual(['ambassadorRequests', 'org-123']);
    });

    it('should create ambassadorInstagramStatus query key', () => {
      const key = QUERY_KEYS.ambassadorInstagramStatus('amb-123');
      expect(key).toEqual(['ambassadorInstagramStatus', 'amb-123']);
    });
  });

  describe('Organization-related queries', () => {
    it('should create currentOrganization query key with user scope', () => {
      const key = QUERY_KEYS.currentOrganization('user-123');
      expect(key).toEqual(['currentOrganization', 'user-123']);
    });

    it('should create organizations query key', () => {
      const key = QUERY_KEYS.organizations('user-456');
      expect(key).toEqual(['organizations', 'user-456']);
    });

    it('should create organizationMembers query key', () => {
      const key = QUERY_KEYS.organizationMembers('org-789');
      expect(key).toEqual(['organizationMembers', 'org-789']);
    });

    it('should create organizationSettings query key', () => {
      const key = QUERY_KEYS.organizationSettings('org-123');
      expect(key).toEqual(['organizationSettings', 'org-123']);
    });
  });

  describe('Event/Fiesta-related queries', () => {
    it('should create events query key', () => {
      const key = QUERY_KEYS.events('org-123');
      expect(key).toEqual(['events', 'org-123']);
    });

    it('should create event query key', () => {
      const key = QUERY_KEYS.event('evt-456');
      expect(key).toEqual(['event', 'evt-456']);
    });

    it('should create fiestas query key', () => {
      const key = QUERY_KEYS.fiestas('org-123');
      expect(key).toEqual(['fiestas', 'org-123']);
    });

    it('should create fiesta query key', () => {
      const key = QUERY_KEYS.fiesta('fiesta-789');
      expect(key).toEqual(['fiesta', 'fiesta-789']);
    });

    it('should create fiestaMetrics query key', () => {
      const key = QUERY_KEYS.fiestaMetrics('fiesta-123');
      expect(key).toEqual(['fiestaMetrics', 'fiesta-123']);
    });
  });

  describe('Instagram-related queries', () => {
    it('should create instagramTokenStatus query key', () => {
      const key = QUERY_KEYS.instagramTokenStatus('org-123');
      expect(key).toEqual(['instagramTokenStatus', 'org-123']);
    });

    it('should create instagramConnection query key', () => {
      const key = QUERY_KEYS.instagramConnection('org-456');
      expect(key).toEqual(['instagramConnection', 'org-456']);
    });

    it('should create instagramProfile query key', () => {
      const key = QUERY_KEYS.instagramProfile('org-789');
      expect(key).toEqual(['instagramProfile', 'org-789']);
    });
  });

  describe('Story/Mention-related queries', () => {
    it('should create storyMentions query key', () => {
      const key = QUERY_KEYS.storyMentions('org-123');
      expect(key).toEqual(['storyMentions', 'org-123']);
    });

    it('should create storyInsights query key', () => {
      const key = QUERY_KEYS.storyInsights('org-456');
      expect(key).toEqual(['storyInsights', 'org-456']);
    });

    it('should create socialMentions query key', () => {
      const key = QUERY_KEYS.socialMentions('org-789');
      expect(key).toEqual(['socialMentions', 'org-789']);
    });

    it('should create socialMentionsFiltered query key with all filters', () => {
      const key = QUERY_KEYS.socialMentionsFiltered('org-123', 'search', 'story', 'assigned');
      expect(key).toEqual(['socialMentions', 'org-123', 'search', 'story', 'assigned']);
      expect(key.length).toBe(5);
    });
  });

  describe('Dashboard/Analytics queries', () => {
    it('should create dashboardStats query key', () => {
      const key = QUERY_KEYS.dashboardStats('user-123');
      expect(key).toEqual(['dashboardStats', 'user-123']);
    });

    it('should create analytics query key', () => {
      const key = QUERY_KEYS.analytics('org-456');
      expect(key).toEqual(['analytics', 'org-456']);
    });
  });

  describe('Notification queries', () => {
    it('should create notifications query key', () => {
      const key = QUERY_KEYS.notifications('user-123');
      expect(key).toEqual(['notifications', 'user-123']);
    });

    it('should create unreadNotifications query key', () => {
      const key = QUERY_KEYS.unreadNotifications('user-456');
      expect(key).toEqual(['unreadNotifications', 'user-456']);
    });
  });

  describe('Task queries', () => {
    it('should create tasks query key', () => {
      const key = QUERY_KEYS.tasks('org-123');
      expect(key).toEqual(['tasks', 'org-123']);
    });

    it('should create ambassadorTasks query key', () => {
      const key = QUERY_KEYS.ambassadorTasks('amb-456');
      expect(key).toEqual(['ambassadorTasks', 'amb-456']);
    });
  });

  describe('System queries', () => {
    it('should create systemChecks query key', () => {
      const key = QUERY_KEYS.systemChecks('org-123');
      expect(key).toEqual(['systemChecks', 'org-123']);
    });

    it('should create onboardingStatus query key', () => {
      const key = QUERY_KEYS.onboardingStatus('user-789');
      expect(key).toEqual(['onboardingStatus', 'user-789']);
    });
  });

  describe('Query key uniqueness', () => {
    it('should generate unique keys for different entities', () => {
      const ambassadorsKey = QUERY_KEYS.ambassadors('org-123');
      const eventsKey = QUERY_KEYS.events('org-123');
      const fiestasKey = QUERY_KEYS.fiestas('org-123');

      expect(ambassadorsKey[0]).not.toBe(eventsKey[0]);
      expect(eventsKey[0]).not.toBe(fiestasKey[0]);
    });

    it('should generate unique keys for different scopes', () => {
      const key1 = QUERY_KEYS.ambassadors('org-123');
      const key2 = QUERY_KEYS.ambassadors('org-456');

      expect(key1[0]).toBe(key2[0]); // Same entity
      expect(key1[1]).not.toBe(key2[1]); // Different scope
    });
  });
});
