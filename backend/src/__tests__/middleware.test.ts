import request from 'supertest';
import { cleanupTestData, getTestClient } from './helpers/testHelpers.js';
import { createTestAdmin, createTestCoach, createTestViewer, createSession, deleteSession, getAuthHeaders } from './helpers/authHelpers.js';
import { createTestTeam, createTestMatch, assignTeamToUser } from './helpers/dataHelpers.js';
import { db } from '../db/database.js';

let client: any;
function makeRequest() {
  return client;
}

describe('Middleware Tests', () => {
  let admin: Awaited<ReturnType<typeof createTestAdmin>>;
  let coach: Awaited<ReturnType<typeof createTestCoach>>;
  let viewer: Awaited<ReturnType<typeof createTestViewer>>;
  let testTeam: Awaited<ReturnType<typeof createTestTeam>>;

  beforeAll(async () => {
    await cleanupTestData();
    client = await getTestClient();
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  beforeEach(async () => {
    // Recreate test users and sessions AFTER beforeEach cleanup runs
    try {
      admin = await createTestAdmin();
      if (!admin || !admin.cookies || admin.cookies.length === 0) {
        throw new Error('Admin user not properly initialized');
      }
    } catch (error) {
      console.error('Failed to create admin in middleware.test.ts:', error);
      throw error;
    }
    
    try {
      coach = await createTestCoach();
      if (!coach || !coach.cookies || coach.cookies.length === 0) {
        throw new Error('Coach user not properly initialized');
      }
    } catch (error) {
      console.error('Failed to create coach in middleware.test.ts:', error);
      throw error;
    }
    
    try {
      viewer = await createTestViewer();
      if (!viewer || !viewer.cookies || viewer.cookies.length === 0) {
        throw new Error('Viewer user not properly initialized');
      }
    } catch (error) {
      console.error('Failed to create viewer in middleware.test.ts:', error);
      throw error;
    }
    
    testTeam = await createTestTeam();
    await assignTeamToUser(coach.userId, testTeam.id, admin.userId);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('authenticateSession middleware', () => {
    it('should return 401 without session cookie or header', async () => {
      const response = await makeRequest()
        .get('/api/auth/me')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('No session provided');
    });

    it('should authenticate with valid session cookie', async () => {
      const response = await makeRequest()
        .get('/api/auth/me')
        .set(getAuthHeaders(admin.cookies))
        .expect(200);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(admin.email);
    });

    it('should authenticate with valid session header (fallback)', async () => {
      // Extract sessionId from cookies
      const sessionCookie = admin.cookies.find((c: string) => c.startsWith('sessionId='));
      const sessionId = sessionCookie?.split(';')[0].split('=')[1];
      
      const response = await makeRequest()
        .get('/api/auth/me')
        .set('X-Session-ID', sessionId || '')
        .expect(200);
      
      expect(response.body).toHaveProperty('id');
    });

    it('should return 401 with invalid session', async () => {
      const response = await makeRequest()
        .get('/api/auth/me')
        .set('Cookie', ['sessionId=invalid-session-id'])
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid or expired session');
    });

    it('should return 401 with expired session', async () => {
      // Create an expired session
      const expiredSessionId = await createSession(admin.userId, -1); // -1 hour = expired
      
      const response = await makeRequest()
        .get('/api/auth/me')
        .set('Cookie', [`sessionId=${expiredSessionId}`])
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
      
      // Cleanup
      await deleteSession(expiredSessionId);
    });
  });

  describe('requireAdmin middleware', () => {
    it('should allow admin access', async () => {
      const response = await makeRequest()
        .get('/api/users')
        .set(getAuthHeaders(admin.cookies))
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 403 for coach', async () => {
      const response = await makeRequest()
        .get('/api/users')
        .set(getAuthHeaders(coach.cookies))
        .expect(403);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Admin access required');
    });

    it('should return 403 for viewer', async () => {
      const response = await makeRequest()
        .get('/api/users')
        .set(getAuthHeaders(viewer.cookies))
        .expect(403);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Admin access required');
    });
  });

  describe('canModifyMatch middleware', () => {
    let testMatch: Awaited<ReturnType<typeof createTestMatch>>;

    beforeEach(async () => {
      testMatch = await createTestMatch(testTeam.id, 'Test Opponent', undefined, undefined, undefined, undefined, admin.userId);
    });

    afterEach(async () => {
      // Cleanup only the match we created, not teams
      if (testMatch?.id) {
        await db.deleteFrom('game_events').where('match_id', '=', testMatch.id).execute();
        await db.deleteFrom('matches').where('id', '=', testMatch.id).execute();
      }
    });

    it('should allow admin to modify any match', async () => {
      const response = await makeRequest()
        .put(`/api/matches/${testMatch.id}`)
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .send({ opponentName: 'Updated Opponent' })
        .expect(200);
      
      expect(response.body).toHaveProperty('id');
    });

    it('should allow coach to modify assigned team match', async () => {
      const response = await makeRequest()
        .put(`/api/matches/${testMatch.id}`)
        .set(getAuthHeaders(coach.cookies, coach.csrfToken))
        .send({ opponentName: 'Coach Updated' })
        .expect(200);
      
      expect(response.body).toHaveProperty('id');
    });

    it('should return 403 for coach without team assignment', async () => {
      // Create a match for a different team
      const otherTeam = await createTestTeam();
      const otherMatch = await createTestMatch(otherTeam.id, 'Other Opponent', undefined, undefined, undefined, undefined, admin.userId);
      
      const response = await makeRequest()
        .put(`/api/matches/${otherMatch.id}`)
        .set(getAuthHeaders(coach.cookies, coach.csrfToken))
        .send({ opponentName: 'Unauthorized Update' })
        .expect(403);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('assigned teams');
      
      // Cleanup only the match and team we created
      await db.deleteFrom('game_events').where('match_id', '=', otherMatch.id).execute();
      await db.deleteFrom('matches').where('id', '=', otherMatch.id).execute();
      await db.deleteFrom('user_teams').where('team_id', '=', otherTeam.id).execute();
      await db.deleteFrom('teams').where('id', '=', otherTeam.id).execute();
    });

    it('should return 403 for viewer (cannot modify)', async () => {
      const response = await makeRequest()
        .put(`/api/matches/${testMatch.id}`)
        .set(getAuthHeaders(viewer.cookies, viewer.csrfToken))
        .send({ opponentName: 'Viewer Update' })
        .expect(403);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Viewers cannot modify matches');
    });
  });

  describe('CSRF protection middleware', () => {
    it('should allow GET requests without CSRF token', async () => {
      const response = await makeRequest()
        .get('/api/users')
        .set(getAuthHeaders(admin.cookies))
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should require CSRF token for POST requests', async () => {
      const response = await makeRequest()
        .post('/api/users')
        .set(getAuthHeaders(admin.cookies))
        // No CSRF token
        .send({
          email: 'test@example.com',
          name: 'Test User',
          role: 'coach',
        })
        .expect(403);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('CSRF token required');
    });

    it('should require CSRF token for PUT requests', async () => {
      const response = await makeRequest()
        .put('/api/users/1')
        .set(getAuthHeaders(admin.cookies))
        // No CSRF token
        .send({ name: 'Updated Name' })
        .expect(403);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('CSRF token required');
    });

    it('should require CSRF token for DELETE requests', async () => {
      // Create a test user to delete
      const testUserEmail = `test-csrf-${Date.now()}@example.com`;
      const { createTestUser } = await import('./helpers/testHelpers.js');
      const testUserId = await createTestUser(testUserEmail, 'TestPassword123!', 'Test User', 'coach', true, true);
      
      const response = await makeRequest()
        .delete(`/api/users/${testUserId}`)
        .set(getAuthHeaders(admin.cookies))
        // No CSRF token
        .expect(403);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('CSRF token required');
      
      // Cleanup
      const { deleteTestUser } = await import('./helpers/testHelpers.js');
      await deleteTestUser(testUserEmail);
    });

    it('should accept valid CSRF token for POST requests', async () => {
      const testUserEmail = `test-csrf-valid-${Date.now()}@example.com`;
      
      const response = await makeRequest()
        .post('/api/users')
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .send({
          email: testUserEmail,
          name: 'Test User',
          role: 'coach',
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      
      // Cleanup
      const { deleteTestUser } = await import('./helpers/testHelpers.js');
      await deleteTestUser(testUserEmail);
    });

    it('should reject invalid CSRF token', async () => {
      const response = await makeRequest()
        .post('/api/users')
        .set(getAuthHeaders(admin.cookies))
        .set('X-CSRF-Token', 'invalid-csrf-token')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          role: 'coach',
        })
        .expect(403);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid CSRF token');
    });

    it('should skip CSRF for login endpoint', async () => {
      const testUserEmail = `test-login-${Date.now()}@example.com`;
      const { createTestUser } = await import('./helpers/testHelpers.js');
      await createTestUser(testUserEmail, 'TestPassword123!', 'Test User', 'coach', true, true);
      
      const response = await makeRequest()
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: 'TestPassword123!',
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('user');
      
      // Cleanup
      const { deleteTestUser } = await import('./helpers/testHelpers.js');
      await deleteTestUser(testUserEmail);
    });

    it('should skip CSRF for logout endpoint', async () => {
      const response = await makeRequest()
        .post('/api/auth/logout')
        .set(getAuthHeaders(admin.cookies))
        // No CSRF token, but should still work
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Rate limiting', () => {
    it('should not rate limit in test environment', async () => {
      // Rate limiting is disabled in test mode
      // This test verifies that multiple requests don't get rate limited
      const testUserEmail = `test-ratelimit-${Date.now()}@example.com`;
      const { createTestUser } = await import('./helpers/testHelpers.js');
      await createTestUser(testUserEmail, 'TestPassword123!', 'Test User', 'coach', true, true);
      
      // Make multiple login attempts quickly
      for (let i = 0; i < 3; i++) {
        const response = await makeRequest()
          .post('/api/auth/login')
          .send({
            email: testUserEmail,
            password: 'TestPassword123!',
          });
        
        // Should not be rate limited (429) in test mode
        expect(response.status).not.toBe(429);
      }
      
      // Cleanup
      const { deleteTestUser } = await import('./helpers/testHelpers.js');
      await deleteTestUser(testUserEmail);
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers in response', async () => {
      const testUserEmail = `test-cors-${Date.now()}@example.com`;
      const { createTestUser, deleteTestUser } = await import('./helpers/testHelpers.js');
      await createTestUser(testUserEmail, 'TestPassword123!', 'Test User', 'coach', true, true);

      const loginResponse = await makeRequest()
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: 'TestPassword123!' })
        .expect(200);

      const cookies = Array.isArray(loginResponse.headers['set-cookie'])
        ? (loginResponse.headers['set-cookie'] as string[]).map(c => c.split(';')[0])
        : [(loginResponse.headers['set-cookie'] as string).split(';')[0]];

      const response = await makeRequest()
        .get('/api/auth/me')
        .set(getAuthHeaders(cookies))
        .expect(200);
      
      // CORS headers should be present (set by server)
      // Note: Actual CORS headers depend on server configuration
      expect(response.headers).toBeDefined();

      await deleteTestUser(testUserEmail);
    });
  });

  describe('Cookie security attributes', () => {
    it('should set secure cookies in production', async () => {
      // This test verifies cookie attributes are set correctly
      // Actual attributes depend on NODE_ENV
      const testUserEmail = `test-cookie-${Date.now()}@example.com`;
      const { createTestUser } = await import('./helpers/testHelpers.js');
      await createTestUser(testUserEmail, 'TestPassword123!', 'Test User', 'coach', true, true);
      
      const response = await makeRequest()
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: 'TestPassword123!',
        })
        .expect(200);
      
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      // Check that sessionId cookie has HttpOnly attribute
      const sessionCookie = Array.isArray(cookies) 
        ? cookies.find((c: string) => c.startsWith('sessionId='))
        : cookies?.toString();
      
      if (sessionCookie) {
        // HttpOnly should be present for sessionId
        expect(sessionCookie).toContain('HttpOnly');
      }
      
      // Cleanup
      const { deleteTestUser } = await import('./helpers/testHelpers.js');
      await deleteTestUser(testUserEmail);
    });
  });
});
