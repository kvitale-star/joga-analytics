import { db } from '../db/database.js';
import { cleanupTestData } from './helpers/testHelpers.js';
import { createTestUser, deleteTestUser } from './helpers/testHelpers.js';
import { createTestTeam, createTestMatch, cleanupTestData as cleanupExtended } from './helpers/dataHelpers.js';
import { resetUserPassword } from '../services/userService.js';
import { getAllUsers } from '../services/userService.js';
import { getMatchById } from '../services/matchService.js';

describe('Service Layer Data Integrity Tests', () => {
  beforeAll(async () => {
    await cleanupTestData();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('User Service - Preferences JSON Parsing', () => {
    it('should handle valid JSON preferences', async () => {
      const email = `test-prefs-valid-${Date.now()}@example.com`;
      const userId = await createTestUser(email, 'TestPassword123!', 'Test User', 'coach', true, true);
      
      // Update preferences with valid JSON
      await db
        .updateTable('users')
        .set({ preferences: JSON.stringify({ theme: 'dark', language: 'en' }) })
        .where('id', '=', userId)
        .execute();
      
      const users = await getAllUsers();
      const user = users.find((u: any) => u.id === userId);
      
      expect(user).toBeDefined();
      expect(user?.preferences).toEqual({ theme: 'dark', language: 'en' });
      
      await deleteTestUser(email);
    });

    it('should handle malformed JSON preferences with fallback', async () => {
      const email = `test-prefs-malformed-${Date.now()}@example.com`;
      const userId = await createTestUser(email, 'TestPassword123!', 'Test User', 'coach', true, true);
      
      // Set invalid JSON
      await db
        .updateTable('users')
        .set({ preferences: '{ invalid json }' })
        .where('id', '=', userId)
        .execute();
      
      const users = await getAllUsers();
      const user = users.find((u: any) => u.id === userId);
      
      // Should fallback to empty object
      expect(user).toBeDefined();
      expect(user?.preferences).toEqual({});
      
      await deleteTestUser(email);
    });

    it('should handle null preferences with fallback', async () => {
      const email = `test-prefs-null-${Date.now()}@example.com`;
      const userId = await createTestUser(email, 'TestPassword123!', 'Test User', 'coach', true, true);
      
      // Set null preferences
      await db
        .updateTable('users')
        .set({ preferences: null as any })
        .where('id', '=', userId)
        .execute();
      
      const users = await getAllUsers();
      const user = users.find((u: any) => u.id === userId);
      
      // Should fallback to empty object
      expect(user).toBeDefined();
      expect(user?.preferences).toEqual({});
      
      await deleteTestUser(email);
    });

    it('should handle empty string preferences with fallback', async () => {
      const email = `test-prefs-empty-${Date.now()}@example.com`;
      const userId = await createTestUser(email, 'TestPassword123!', 'Test User', 'coach', true, true);
      
      // Set empty string
      await db
        .updateTable('users')
        .set({ preferences: '' })
        .where('id', '=', userId)
        .execute();
      
      const users = await getAllUsers();
      const user = users.find((u: any) => u.id === userId);
      
      // Should fallback to empty object
      expect(user).toBeDefined();
      expect(user?.preferences).toEqual({});
      
      await deleteTestUser(email);
    });
  });

  describe('Match Service - Stats JSON Parsing', () => {
    it('should handle valid stats JSON', async () => {
      const testTeam = await createTestTeam();
      const statsJson = { goals: 2, shots: 10, possession: 60 };
      
      const match = await createTestMatch(
        testTeam.id,
        'Test Opponent',
        undefined,
        undefined,
        undefined,
        statsJson,
        undefined
      );
      
      const retrievedMatch = await getMatchById(match.id);
      
      expect(retrievedMatch).toBeDefined();
      expect(retrievedMatch?.statsJson).toEqual(statsJson);
      
      await cleanupExtended();
    });

    it('should handle null stats JSON', async () => {
      const testTeam = await createTestTeam();
      
      const match = await createTestMatch(
        testTeam.id,
        'Test Opponent',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      );
      
      const retrievedMatch = await getMatchById(match.id);
      
      expect(retrievedMatch).toBeDefined();
      expect(retrievedMatch?.statsJson).toBeNull();
      
      await cleanupExtended();
    });
  });

  describe('Team Service - Metadata JSON Parsing', () => {
    it('should handle valid metadata JSON', async () => {
      const metadata = { color: 'blue', season: '2024' };
      const team = await createTestTeam(undefined, undefined, metadata);
      
      const retrievedTeam = await db
        .selectFrom('teams')
        .selectAll()
        .where('id', '=', team.id)
        .executeTakeFirst();
      
      expect(retrievedTeam).toBeDefined();
      const parsedMetadata = JSON.parse(retrievedTeam!.metadata);
      expect(parsedMetadata).toEqual(metadata);
      
      await cleanupExtended();
    });

    it('should handle empty metadata', async () => {
      const team = await createTestTeam(undefined, undefined, {});
      
      const retrievedTeam = await db
        .selectFrom('teams')
        .selectAll()
        .where('id', '=', team.id)
        .executeTakeFirst();
      
      expect(retrievedTeam).toBeDefined();
      const parsedMetadata = JSON.parse(retrievedTeam!.metadata);
      expect(parsedMetadata).toEqual({});
      
      await cleanupExtended();
    });
  });

  describe('Session Cleanup on Password Reset', () => {
    it('should clean up sessions when password is reset', async () => {
      const email = `test-session-cleanup-${Date.now()}@example.com`;
      const userId = await createTestUser(email, 'OldPassword123!', 'Test User', 'coach', true, true);
      
      // Create a session
      const { createSession } = await import('./helpers/authHelpers.js');
      const sessionId = await createSession(userId);
      
      // Verify session exists
      const sessionBefore = await db
        .selectFrom('sessions')
        .selectAll()
        .where('id', '=', sessionId)
        .executeTakeFirst();
      
      expect(sessionBefore).toBeDefined();
      
      // Reset password
      await resetUserPassword(userId, 'NewPassword123!');
      
      // Verify session is deleted
      const sessionAfter = await db
        .selectFrom('sessions')
        .selectAll()
        .where('id', '=', sessionId)
        .executeTakeFirst();
      
      expect(sessionAfter).toBeUndefined();
      
      await deleteTestUser(email);
    });
  });

  describe('Database Constraints', () => {
    it('should enforce unique email constraint', async () => {
      const email = `test-unique-${Date.now()}@example.com`;
      await createTestUser(email, 'TestPassword123!', 'Test User', 'coach', true, true);
      
      // Try to create another user with same email
      await expect(
        createTestUser(email, 'TestPassword123!', 'Another User', 'coach', true, true)
      ).rejects.toThrow();
      
      await deleteTestUser(email);
    });

    it('should enforce unique team slug constraint', async () => {
      const slug = `test-slug-${Date.now()}`;
      await createTestTeam('Test Team', slug);
      
      // Try to create another team with same slug
      await expect(
        createTestTeam('Another Team', slug)
      ).rejects.toThrow();
      
      await cleanupExtended();
    });

    it('should enforce unique user_teams assignment constraint', async () => {
      const email = `test-assignment-${Date.now()}@example.com`;
      const userId = await createTestUser(email, 'TestPassword123!', 'Test User', 'coach', true, true);
      const team = await createTestTeam();
      
      // Assign team to user
      const { assignTeamToUser } = await import('./helpers/dataHelpers.js');
      await assignTeamToUser(userId, team.id, undefined);
      
      // Try to assign again (should fail)
      await expect(
        assignTeamToUser(userId, team.id, undefined)
      ).rejects.toThrow();
      
      await deleteTestUser(email);
      await cleanupExtended();
    });

    it('should enforce foreign key constraint for team_id in matches', async () => {
      // Try to create match with non-existent team_id
      await expect(
        createTestMatch(999999, 'Test Opponent')
      ).rejects.toThrow();
    });
  });

  describe('Data Type Validation', () => {
    it('should handle date parsing correctly', async () => {
      const testTeam = await createTestTeam();
      const matchDate = '2024-01-15';
      
      const match = await createTestMatch(testTeam.id, 'Test Opponent', matchDate);
      
      const retrievedMatch = await getMatchById(match.id);
      
      expect(retrievedMatch).toBeDefined();
      expect(retrievedMatch?.matchDate).toBe(matchDate);
      
      await cleanupExtended();
    });

    it('should handle number conversion in stats', async () => {
      const testTeam = await createTestTeam();
      const statsJson = { 
        goals: 2, 
        shots: 10, 
        possession: 60.5,
        xG: 1.25,
      };
      
      const match = await createTestMatch(testTeam.id, 'Test Opponent', undefined, undefined, undefined, statsJson);
      
      const retrievedMatch = await getMatchById(match.id);
      
      expect(retrievedMatch).toBeDefined();
      expect(retrievedMatch?.statsJson).toEqual(statsJson);
      expect(typeof retrievedMatch?.statsJson?.goals).toBe('number');
      expect(typeof retrievedMatch?.statsJson?.possession).toBe('number');
      
      await cleanupExtended();
    });

    it('should handle boolean values in metadata', async () => {
      const metadata = { 
        isActive: true, 
        hasSubs: false,
        archived: 0, // SQLite stores as 0/1
      };
      
      const team = await createTestTeam(undefined, undefined, metadata);
      
      const retrievedTeam = await db
        .selectFrom('teams')
        .selectAll()
        .where('id', '=', team.id)
        .executeTakeFirst();
      
      expect(retrievedTeam).toBeDefined();
      const parsedMetadata = JSON.parse(retrievedTeam!.metadata);
      expect(parsedMetadata.isActive).toBe(true);
      expect(parsedMetadata.hasSubs).toBe(false);
      
      await cleanupExtended();
    });
  });
});
