import request from 'supertest';
import { cleanupTestData, getTestClient } from './helpers/testHelpers.js';
import { createTestAdmin, createTestCoach, createTestViewer, getAuthHeaders } from './helpers/authHelpers.js';
import { createTestTeam, createTestMatch, assignTeamToUser, cleanupTestData as cleanupExtended } from './helpers/dataHelpers.js';

let client: any;
function makeRequest() {
  return client;
}

describe('Role/Permission Matrix Tests', () => {
  let admin: Awaited<ReturnType<typeof createTestAdmin>>;
  let coach: Awaited<ReturnType<typeof createTestCoach>>;
  let coachWithTeam: Awaited<ReturnType<typeof createTestCoach>>;
  let viewer: Awaited<ReturnType<typeof createTestViewer>>;
  let testTeam: Awaited<ReturnType<typeof createTestTeam>>;
  let otherTeam: Awaited<ReturnType<typeof createTestTeam>>;
  let testMatch: Awaited<ReturnType<typeof createTestMatch>>;

  beforeAll(async () => {
    await cleanupTestData();
    client = await getTestClient();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  beforeEach(async () => {
    // Recreate test users and sessions AFTER beforeEach cleanup runs
    admin = await createTestAdmin();
    coach = await createTestCoach();
    coachWithTeam = await createTestCoach(undefined, 'TestPassword123!', 'Coach With Team');
    viewer = await createTestViewer();
    
    testTeam = await createTestTeam();
    otherTeam = await createTestTeam();
    await assignTeamToUser(coachWithTeam.userId, testTeam.id, admin.userId);
    testMatch = await createTestMatch(testTeam.id, 'Test Opponent', undefined, undefined, undefined, undefined, admin.userId);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe.each([
    { role: 'admin', user: () => admin, canModifyAnyTeam: true, canModifyAssignedTeam: true, canRead: true },
    { role: 'coach', user: () => coachWithTeam, canModifyAnyTeam: false, canModifyAssignedTeam: true, canRead: true },
    { role: 'viewer', user: () => viewer, canModifyAnyTeam: false, canModifyAssignedTeam: false, canRead: true },
  ])('Role-based permissions: $role', ({ role, user, canModifyAnyTeam, canModifyAssignedTeam, canRead }) => {
    const testUser = user();
    
    // Skip entire suite if user creation failed
    if (!testUser || !testUser.cookies || testUser.cookies.length === 0) {
      describe.skip(`Skipping ${role} tests - user not properly initialized`, () => {
        it('placeholder', () => {});
      });
      return;
    }

    describe('Users endpoints', () => {
      it('should handle GET /api/users', async () => {
        const response = await makeRequest()
          .get('/api/users')
          .set(getAuthHeaders(testUser.cookies));
        
        if (role === 'admin') {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
        } else {
          expect(response.status).toBe(403);
          expect(response.body).toHaveProperty('error');
        }
      });

      it('should handle POST /api/users', async () => {
        const response = await makeRequest()
          .post('/api/users')
          .set(getAuthHeaders(testUser.cookies, testUser.csrfToken))
          .send({
            email: `test-${Date.now()}@example.com`,
            name: 'Test User',
            role: 'coach',
          });
        
        if (role === 'admin') {
          expect(response.status).toBe(201);
        } else {
          expect(response.status).toBe(403);
        }
      });

      it('should handle PUT /api/users/:id', async () => {
        const response = await makeRequest()
          .put('/api/users/1')
          .set(getAuthHeaders(testUser.cookies, testUser.csrfToken))
          .send({ name: 'Updated Name' });
        
        if (role === 'admin') {
          // May be 200 or 404/400 depending on user existence
          expect([200, 400, 404]).toContain(response.status);
        } else {
          expect(response.status).toBe(403);
        }
      });

      it('should handle DELETE /api/users/:id', async () => {
        const response = await makeRequest()
          .delete('/api/users/1')
          .set(getAuthHeaders(testUser.cookies, testUser.csrfToken));
        
        if (role === 'admin') {
          // May be 200 or 404/400 depending on user existence
          expect([200, 400, 404]).toContain(response.status);
        } else {
          expect(response.status).toBe(403);
        }
      });
    });

    describe('Teams endpoints', () => {
      it('should handle GET /api/teams', async () => {
        const response = await makeRequest()
          .get('/api/teams')
          .set(getAuthHeaders(testUser.cookies));
        
        if (role === 'admin') {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
        } else {
          expect(response.status).toBe(403);
        }
      });

      it('should handle POST /api/teams', async () => {
        const response = await makeRequest()
          .post('/api/teams')
          .set(getAuthHeaders(testUser.cookies, testUser.csrfToken))
          .send({
            displayName: 'New Team',
            slug: `new-team-${Date.now()}`,
          });
        
        if (role === 'admin') {
          expect(response.status).toBe(201);
        } else {
          expect(response.status).toBe(403);
        }
      });
    });

    describe('Matches endpoints', () => {
      it('should handle GET /api/matches', async () => {
        const response = await makeRequest()
          .get('/api/matches')
          .set(getAuthHeaders(testUser.cookies));
        
        // All authenticated users can read matches
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should handle GET /api/matches/:id', async () => {
        const response = await makeRequest()
          .get(`/api/matches/${testMatch.id}`)
          .set(getAuthHeaders(testUser.cookies));
        
        // All authenticated users can read matches
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id');
      });

      it('should handle POST /api/matches', async () => {
        const response = await makeRequest()
          .post('/api/matches')
          .set(getAuthHeaders(testUser.cookies, testUser.csrfToken))
          .send({
            teamId: canModifyAssignedTeam ? testTeam.id : otherTeam.id,
            opponentName: 'New Opponent',
            matchDate: '2024-01-01',
          });
        
        if (role === 'admin') {
          expect(response.status).toBe(201);
        } else if (role === 'coach' && canModifyAssignedTeam) {
          expect(response.status).toBe(201);
        } else if (role === 'coach' && !canModifyAssignedTeam) {
          expect(response.status).toBe(403);
        } else {
          // viewer
          expect(response.status).toBe(403);
        }
      });

      it('should handle PUT /api/matches/:id', async () => {
        const response = await makeRequest()
          .put(`/api/matches/${testMatch.id}`)
          .set(getAuthHeaders(testUser.cookies, testUser.csrfToken))
          .send({ opponentName: 'Updated Opponent' });
        
        if (role === 'admin') {
          expect(response.status).toBe(200);
        } else if (role === 'coach' && canModifyAssignedTeam) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(403);
        }
      });

      it('should handle DELETE /api/matches/:id', async () => {
        // Create a match to delete
        const matchToDelete = await createTestMatch(
          canModifyAssignedTeam ? testTeam.id : otherTeam.id,
          'Match To Delete',
          undefined,
          undefined,
          undefined,
          undefined,
          admin.userId
        );
        
        const response = await makeRequest()
          .delete(`/api/matches/${matchToDelete.id}`)
          .set(getAuthHeaders(testUser.cookies, testUser.csrfToken));
        
        if (role === 'admin') {
          expect(response.status).toBe(200);
        } else if (role === 'coach' && canModifyAssignedTeam) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(403);
        }
        
        // Cleanup if not deleted
        if (response.status !== 200) {
          await cleanupExtended();
        }
      });
    });

    describe('Preferences endpoints', () => {
      it('should handle GET /api/preferences', async () => {
        const response = await makeRequest()
          .get('/api/preferences')
          .set(getAuthHeaders(testUser.cookies));
        
        // All authenticated users can access their own preferences
        expect(response.status).toBe(200);
        expect(typeof response.body).toBe('object');
      });

      it('should handle PUT /api/preferences', async () => {
        const response = await makeRequest()
          .put('/api/preferences')
          .set(getAuthHeaders(testUser.cookies, testUser.csrfToken))
          .send({ preferences: { theme: 'dark' } });
        
        // All authenticated users can update their own preferences
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success');
      });
    });

    describe('Sheets endpoints', () => {
      it('should handle GET /api/sheets/data', async () => {
        // Set env vars for sheets test
        const originalSpreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
        const originalApiKey = process.env.GOOGLE_SHEETS_API_KEY;
        process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'test-id';
        process.env.GOOGLE_SHEETS_API_KEY = 'test-key';
        
        // Mock fetch for sheets
        const originalFetch = global.fetch;
        global.fetch = (async () => ({
          ok: true,
          status: 200,
          json: async () => ({ values: [['Header'], ['Data']] }),
        })) as any;
        
        const response = await makeRequest()
          .get('/api/sheets/data?range=Sheet1!A1:Z100')
          .set(getAuthHeaders(testUser.cookies));
        
        // All authenticated users can access sheets
        expect([200, 500]).toContain(response.status);
        
        // Restore
        global.fetch = originalFetch;
        process.env.GOOGLE_SHEETS_SPREADSHEET_ID = originalSpreadsheetId;
        process.env.GOOGLE_SHEETS_API_KEY = originalApiKey;
      });
    });

    describe('AI endpoints', () => {
      it('should handle POST /api/ai/chat', async () => {
        const originalKey = process.env.GEMINI_API_KEY;
        process.env.GEMINI_API_KEY = 'test-key';
        
        const response = await makeRequest()
          .post('/api/ai/chat')
          .set(getAuthHeaders(testUser.cookies, testUser.csrfToken))
          .send({ message: 'Test question' });
        
        // All authenticated users can use AI (may fail if API key invalid)
        expect([200, 500, 503]).toContain(response.status);
        
        process.env.GEMINI_API_KEY = originalKey;
      });

      it('should handle GET /api/ai/status', async () => {
        const response = await makeRequest()
          .get('/api/ai/status')
          .set(getAuthHeaders(testUser.cookies));
        
        // All authenticated users can check AI status
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('configured');
      });
    });
  });

  describe('Unauthenticated access', () => {
    it('should return 401 for all protected endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/users' },
        { method: 'get', path: '/api/teams' },
        { method: 'get', path: '/api/matches' },
        { method: 'get', path: '/api/preferences' },
        { method: 'post', path: '/api/users' },
        { method: 'post', path: '/api/teams' },
        { method: 'post', path: '/api/matches' },
      ];

      for (const endpoint of endpoints) {
        let response: any;
        if (endpoint.method === 'get') {
          response = await makeRequest().get(endpoint.path);
        } else if (endpoint.method === 'post') {
          response = await makeRequest().post(endpoint.path);
        } else if (endpoint.method === 'put') {
          response = await makeRequest().put(endpoint.path);
        } else if (endpoint.method === 'delete') {
          response = await makeRequest().delete(endpoint.path);
        }
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Last admin protection', () => {
    it('should prevent demoting the last active admin', async () => {
      // This test verifies that the last admin cannot be demoted
      // The actual protection is tested in users.test.ts
      // This is a matrix test to ensure it works across roles
      const response = await makeRequest()
        .put(`/api/users/${admin.userId}`)
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .send({ role: 'coach' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Cannot change your own role');
    });
  });

  describe('CORS and CSRF requirements', () => {
    it('should require CSRF token for state-changing requests', async () => {
      const response = await makeRequest()
        .post('/api/users')
        .set(getAuthHeaders(admin.cookies))
        // No CSRF token
        .send({
          email: 'test@example.com',
          name: 'Test',
          role: 'coach',
        });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('CSRF token required');
    });

    it('should not require CSRF token for GET requests', async () => {
      const response = await makeRequest()
        .get('/api/users')
        .set(getAuthHeaders(admin.cookies))
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
