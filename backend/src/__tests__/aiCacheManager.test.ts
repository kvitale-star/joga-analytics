/**
 * Tests for AI Cache Manager Service
 */

import {
  getStoredCache,
  isCacheValid,
  storeCacheMetadata,
  hashMatchData,
  invalidateTeamCache,
  cleanupExpiredCaches,
} from '../services/aiCacheManager.js';
import { db } from '../db/database.js';
import { createTestTeam } from './helpers/dataHelpers.js';

describe('AI Cache Manager Service', () => {
  let testTeam: Awaited<ReturnType<typeof createTestTeam>>;

  beforeEach(async () => {
    // Clean up cache table (must be first to avoid foreign key issues)
    await db.deleteFrom('ai_context_cache').execute();
    
    testTeam = await createTestTeam();
  });

  afterEach(async () => {
    // Clean up after each test to avoid cross-test contamination
    await db.deleteFrom('ai_context_cache').execute();
  });


  describe('hashMatchData', () => {
    it('should generate consistent hash for same data', () => {
      const matches = [
        { id: 1, match_date: '2024-01-01' },
        { id: 2, match_date: '2024-01-08' },
      ];

      const hash1 = hashMatchData(matches);
      const hash2 = hashMatchData(matches);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBeGreaterThan(0);
    });

    it('should generate different hash for different data', () => {
      const matches1 = [
        { id: 1, match_date: '2024-01-01' },
      ];
      const matches2 = [
        { id: 1, match_date: '2024-01-01' },
        { id: 2, match_date: '2024-01-08' },
      ];

      const hash1 = hashMatchData(matches1);
      const hash2 = hashMatchData(matches2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty matches array', () => {
      const hash = hashMatchData([]);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should include match count in hash', () => {
      const matches1 = [{ id: 1, match_date: '2024-01-01' }];
      const matches2 = [
        { id: 1, match_date: '2024-01-01' },
        { id: 2, match_date: '2024-01-08' },
      ];

      const hash1 = hashMatchData(matches1);
      const hash2 = hashMatchData(matches2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('storeCacheMetadata', () => {
    it('should store cache metadata', async () => {
      const metadata = {
        teamId: testTeam.id,
        cacheType: 'combined' as const,
        cacheId: 'cachedContents/test123',
        dataHash: 'abc123',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      };

      const stored = await storeCacheMetadata(metadata);

      expect(stored.team_id).toBe(testTeam.id);
      expect(stored.cache_id).toBe('cachedContents/test123');
      expect(stored.data_hash).toBe('abc123');
      expect(stored.cache_type).toBe('combined');
    });

    it('should invalidate existing cache before storing new one', async () => {
      // Store first cache
      await storeCacheMetadata({
        teamId: testTeam.id,
        cacheType: 'combined',
        cacheId: 'cachedContents/old123',
        dataHash: 'oldhash',
        expiresAt: new Date(Date.now() + 3600000),
      });

      // Store new cache
      await storeCacheMetadata({
        teamId: testTeam.id,
        cacheType: 'combined',
        cacheId: 'cachedContents/new123',
        dataHash: 'newhash',
        expiresAt: new Date(Date.now() + 3600000),
      });

      // Should only have one cache
      const caches = await db
        .selectFrom('ai_context_cache')
        .selectAll()
        .where('team_id', '=', testTeam.id)
        .execute();

      expect(caches.length).toBe(1);
      expect(caches[0].cache_id).toBe('cachedContents/new123');
    });
  });

  describe('getStoredCache', () => {
    it('should return null when no cache exists', async () => {
      const cache = await getStoredCache(testTeam.id, 'combined');
      expect(cache).toBeNull();
    });

    it('should return stored cache', async () => {
      const metadata = {
        teamId: testTeam.id,
        cacheType: 'combined' as const,
        cacheId: 'cachedContents/test123',
        dataHash: 'abc123',
        expiresAt: new Date(Date.now() + 3600000),
      };

      await storeCacheMetadata(metadata);

      const cache = await getStoredCache(testTeam.id, 'combined');
      expect(cache).not.toBeNull();
      expect(cache?.cache_id).toBe('cachedContents/test123');
    });

    it('should return most recent cache if multiple exist', async () => {
      // Store two caches (should only keep latest due to invalidation)
      await storeCacheMetadata({
        teamId: testTeam.id,
        cacheType: 'combined',
        cacheId: 'cachedContents/old123',
        dataHash: 'oldhash',
        expiresAt: new Date(Date.now() + 3600000),
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await storeCacheMetadata({
        teamId: testTeam.id,
        cacheType: 'combined',
        cacheId: 'cachedContents/new123',
        dataHash: 'newhash',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const cache = await getStoredCache(testTeam.id, 'combined');
      expect(cache?.cache_id).toBe('cachedContents/new123');
    });
  });

  describe('isCacheValid', () => {
    it('should return true for valid, non-expired cache', () => {
      const cache = {
        id: 1,
        team_id: testTeam.id,
        cache_type: 'combined' as const,
        cache_id: 'cachedContents/test123',
        data_hash: 'abc123',
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const isValid = isCacheValid(cache, 'abc123');
      expect(isValid).toBe(true);
    });

    it('should return false for expired cache', () => {
      const cache = {
        id: 1,
        team_id: testTeam.id,
        cache_type: 'combined' as const,
        cache_id: 'cachedContents/test123',
        data_hash: 'abc123',
        expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const isValid = isCacheValid(cache, 'abc123');
      expect(isValid).toBe(false);
    });

    it('should return false when data hash changed', () => {
      const cache = {
        id: 1,
        team_id: testTeam.id,
        cache_type: 'combined' as const,
        cache_id: 'cachedContents/test123',
        data_hash: 'oldhash',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const isValid = isCacheValid(cache, 'newhash');
      expect(isValid).toBe(false);
    });
  });

  describe('invalidateTeamCache', () => {
    it('should delete cache for a team', async () => {
      await storeCacheMetadata({
        teamId: testTeam.id,
        cacheType: 'combined',
        cacheId: 'cachedContents/test123',
        dataHash: 'abc123',
        expiresAt: new Date(Date.now() + 3600000),
      });

      await invalidateTeamCache(testTeam.id, 'combined');

      const cache = await getStoredCache(testTeam.id, 'combined');
      expect(cache).toBeNull();
    });

    it('should only delete cache of specified type', async () => {
      // Store two different cache types
      await db.insertInto('ai_context_cache').values({
        team_id: testTeam.id,
        cache_type: 'combined',
        cache_id: 'cachedContents/combined123',
        data_hash: 'hash1',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      }).execute();

      await db.insertInto('ai_context_cache').values({
        team_id: testTeam.id,
        cache_type: 'framework_only',
        cache_id: 'cachedContents/framework123',
        data_hash: 'hash2',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      }).execute();

      await invalidateTeamCache(testTeam.id, 'combined');

      const combinedCache = await getStoredCache(testTeam.id, 'combined');
      const frameworkCache = await getStoredCache(testTeam.id, 'framework_only');

      expect(combinedCache).toBeNull();
      expect(frameworkCache).not.toBeNull();
    });
  });

  describe('cleanupExpiredCaches', () => {
    it('should delete expired caches', async () => {
      // Create expired cache
      await db.insertInto('ai_context_cache').values({
        team_id: testTeam.id,
        cache_type: 'combined',
        cache_id: 'cachedContents/expired123',
        data_hash: 'hash1',
        expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
      }).execute();

      // Create valid cache
      await db.insertInto('ai_context_cache').values({
        team_id: testTeam.id,
        cache_type: 'combined',
        cache_id: 'cachedContents/valid123',
        data_hash: 'hash2',
        expires_at: new Date(Date.now() + 3600000).toISOString(), // Valid
      }).execute();

      const deletedCount = await cleanupExpiredCaches();

      expect(deletedCount).toBeGreaterThan(0);

      const remainingCaches = await db
        .selectFrom('ai_context_cache')
        .selectAll()
        .where('team_id', '=', testTeam.id)
        .execute();

      // Should only have valid cache
      expect(remainingCaches.length).toBe(1);
      expect(remainingCaches[0].cache_id).toBe('cachedContents/valid123');
    });

    it('should return 0 when no expired caches exist', async () => {
      // Clean up any existing caches first
      await db.deleteFrom('ai_context_cache').execute();

      await db.insertInto('ai_context_cache').values({
        team_id: testTeam.id,
        cache_type: 'combined',
        cache_id: 'cachedContents/valid123',
        data_hash: 'hash1',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      }).execute();

      const deletedCount = await cleanupExpiredCaches();
      expect(deletedCount).toBe(0);
    });
  });
});
