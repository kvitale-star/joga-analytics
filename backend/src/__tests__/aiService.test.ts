/**
 * Tests for AI Service with Context Cache
 * Tests service functions without calling actual Gemini API
 */

import {
  invalidateTeamCacheForDataChange,
  isAIConfigured,
} from '../services/aiService.js';
import { getStoredCache, storeCacheMetadata } from '../services/aiCacheManager.js';
import { createTestTeam } from './helpers/dataHelpers.js';
import { db } from '../db/database.js';

describe('AI Service with Context Cache', () => {
  let testTeam: Awaited<ReturnType<typeof createTestTeam>>;

  beforeEach(async () => {
    // Clean up
    await db.deleteFrom('ai_context_cache').execute();
    await db.deleteFrom('training_logs').execute();
    await db.deleteFrom('insights').execute();
    await db.deleteFrom('matches').execute();

    testTeam = await createTestTeam();
  });

  afterEach(async () => {
    await db.deleteFrom('ai_context_cache').execute();
    delete process.env.GEMINI_API_KEY;
  });

  describe('isAIConfigured', () => {
    it('should return true when API key is set', () => {
      process.env.GEMINI_API_KEY = 'test-key';
      expect(isAIConfigured()).toBe(true);
    });

    it('should return false when API key is not set', () => {
      delete process.env.GEMINI_API_KEY;
      expect(isAIConfigured()).toBe(false);
    });
  });

  describe('invalidateTeamCacheForDataChange', () => {
    it('should invalidate cache for team', async () => {
      await storeCacheMetadata({
        teamId: testTeam.id,
        cacheType: 'combined',
        cacheId: 'cachedContents/test123',
        dataHash: 'testhash',
        expiresAt: new Date(Date.now() + 3600000),
      });

      await invalidateTeamCacheForDataChange(testTeam.id);

      const cache = await getStoredCache(testTeam.id, 'combined');
      expect(cache).toBeNull();
    });
  });

  // Note: chatWithCachedContext and chatWithAI are not tested here
  // because they require actual Gemini API calls or complex mocking.
  // These are tested at the route level in aiRoutes.test.ts
});
