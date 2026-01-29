import request from 'supertest';
import { cleanupTestData, getTestClient } from './helpers/testHelpers.js';
import { createTestAdmin, createTestCoach, createTestViewer, getAuthHeaders } from './helpers/authHelpers.js';
import { createTestTeam, createTestMatch, createTestGameEvent, assignTeamToUser } from './helpers/dataHelpers.js';
import { db } from '../db/database.js';

let client: any;
function makeRequest() {
  return client;
}

describe('Matches Management API', () => {
  let admin: Awaited<ReturnType<typeof createTestAdmin>>;
  let coach: Awaited<ReturnType<typeof createTestCoach>>;
  let coachWithTeam: Awaited<ReturnType<typeof createTestCoach>>;
  let viewer: Awaited<ReturnType<typeof createTestViewer>>;
  let testTeam: Awaited<ReturnType<typeof createTestTeam>>;
  let otherTeam: Awaited<ReturnType<typeof createTestTeam>>;

  beforeAll(async () => {
    await cleanupTestData();
    client = await getTestClient();
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  beforeEach(async () => {
    // Recreate test users and sessions AFTER beforeEach cleanup runs
    try {
      admin = await createTestAdmin();
    } catch (error) {
      console.error('Failed to create admin:', error);
      throw error;
    }
    
    try {
      coach = await createTestCoach();
    } catch (error) {
      console.error('Failed to create coach:', error);
      throw error;
    }
    
    try {
      coachWithTeam = await createTestCoach(undefined, 'TestPassword123!', 'Coach With Team');
    } catch (error) {
      console.error('Failed to create coachWithTeam:', error);
      throw error;
    }
    
    try {
      viewer = await createTestViewer();
    } catch (error) {
      console.error('Failed to create viewer:', error);
      throw error;
    }
    
    // Small delay before creating teams
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Create teams and assign one to coachWithTeam
    testTeam = await createTestTeam();
    otherTeam = await createTestTeam();
    
    // Verify teams were created
    if (!testTeam || !testTeam.id) {
      throw new Error('Failed to create testTeam');
    }
    if (!otherTeam || !otherTeam.id) {
      throw new Error('Failed to create otherTeam');
    }
    
    await assignTeamToUser(coachWithTeam.userId, testTeam.id, admin.userId);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /api/matches', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest()
        .get('/api/matches')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });

    it('should return all matches for authenticated users', async () => {
      const response = await makeRequest()
        .get('/api/matches')
        .set(getAuthHeaders(admin.cookies))
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter matches by teamId', async () => {
      // Verify team exists - recreate if needed
      if (!testTeam || !testTeam.id) {
        testTeam = await createTestTeam();
      }
      
      // Create a match for testTeam
      const match = await createTestMatch(testTeam.id, 'Test Opponent', undefined, undefined, undefined, undefined, admin.userId);
      
      const response = await makeRequest()
        .get(`/api/matches?teamId=${testTeam.id}`)
        .set(getAuthHeaders(admin.cookies))
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      
      // Don't cleanup teams - they're needed for other tests
      // Only cleanup the match we created
      await db.deleteFrom('matches').where('id', '=', match.id).execute();
      await db.deleteFrom('game_events').where('match_id', '=', match.id).execute();
    });

    it('should filter matches by opponentName', async () => {
      // Verify team exists - recreate if needed
      if (!testTeam || !testTeam.id) {
        testTeam = await createTestTeam();
      }
      
      const match = await createTestMatch(testTeam.id, 'Specific Opponent', undefined, undefined, undefined, undefined, admin.userId);
      
      const response = await makeRequest()
        .get('/api/matches?opponentName=Specific Opponent')
        .set(getAuthHeaders(admin.cookies))
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      
      // Cleanup only the match we created
      await db.deleteFrom('game_events').where('match_id', '=', match.id).execute();
      await db.deleteFrom('matches').where('id', '=', match.id).execute();
    });

    it('should filter matches by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      
      const response = await makeRequest()
        .get(`/api/matches?startDate=${startDate}&endDate=${endDate}`)
        .set(getAuthHeaders(admin.cookies))
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/matches/:id', () => {
    let testMatch: Awaited<ReturnType<typeof createTestMatch>>;

    beforeEach(async () => {
      // Ensure team exists
      if (!testTeam || !testTeam.id) {
        testTeam = await createTestTeam();
      }
      testMatch = await createTestMatch(testTeam.id, 'Test Opponent', undefined, undefined, undefined, undefined, admin.userId);
    });

    afterEach(async () => {
      // Cleanup only the match we created (not teams)
      if (testMatch?.id) {
        await db.deleteFrom('game_events').where('match_id', '=', testMatch.id).execute();
        await db.deleteFrom('matches').where('id', '=', testMatch.id).execute();
      }
    });

    it('should return 401 without authentication', async () => {
      const response = await makeRequest()
        .get(`/api/matches/${testMatch.id}`)
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent match', async () => {
      const response = await makeRequest()
        .get('/api/matches/999999')
        .set(getAuthHeaders(admin.cookies))
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Match not found');
    });

    it('should return match by ID for authenticated users', async () => {
      const response = await makeRequest()
        .get(`/api/matches/${testMatch.id}`)
        .set(getAuthHeaders(admin.cookies))
        .expect(200);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBe(testMatch.id);
      expect(response.body.opponentName).toBe('Test Opponent');
    });
  });

  describe('POST /api/matches', () => {
    it('should return 401 or 403 without authentication', async () => {
      const response = await makeRequest()
        .post('/api/matches')
        .send({
          teamId: testTeam.id,
          opponentName: 'New Opponent',
          matchDate: '2024-01-01',
        });
      
      // POST requests require CSRF, so may return 403 instead of 401
      expect([401, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for viewer (cannot modify)', async () => {
      const response = await makeRequest()
        .post('/api/matches')
        .set(getAuthHeaders(viewer.cookies, viewer.csrfToken))
        .send({
          teamId: testTeam.id,
          opponentName: 'New Opponent',
          matchDate: '2024-01-01',
        })
        .expect(403);
      
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await makeRequest()
        .post('/api/matches')
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .send({
          teamId: testTeam.id,
          // Missing opponentName and matchDate
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });

    it('should create match as admin (any team)', async () => {
      const response = await makeRequest()
        .post('/api/matches')
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .send({
          teamId: testTeam.id,
          opponentName: 'Admin Created Opponent',
          matchDate: '2024-01-01',
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.opponentName).toBe('Admin Created Opponent');
      
      // Cleanup only the match we created
      await db.deleteFrom('game_events').where('match_id', '=', response.body.id).execute();
      await db.deleteFrom('matches').where('id', '=', response.body.id).execute();
    });

    it('should create match as coach with assigned team', async () => {
      // Ensure team exists
      if (!testTeam || !testTeam.id) {
        testTeam = await createTestTeam();
      }
      
      const response = await makeRequest()
        .post('/api/matches')
        .set(getAuthHeaders(coachWithTeam.cookies, coachWithTeam.csrfToken))
        .send({
          teamId: testTeam.id,
          opponentName: 'Coach Created Opponent',
          matchDate: '2024-01-01',
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.opponentName).toBe('Coach Created Opponent');
      
      // Cleanup only the match we created
      await db.deleteFrom('game_events').where('match_id', '=', response.body.id).execute();
      await db.deleteFrom('matches').where('id', '=', response.body.id).execute();
    });

    it('should return 403 for coach without team assignment', async () => {
      const response = await makeRequest()
        .post('/api/matches')
        .set(getAuthHeaders(coach.cookies, coach.csrfToken))
        .send({
          teamId: otherTeam.id,
          opponentName: 'Unauthorized Opponent',
          matchDate: '2024-01-01',
        })
        .expect(403);
      
      expect(response.body).toHaveProperty('error');
    });

    it('should create match with stats JSON', async () => {
      // Ensure team exists
      if (!testTeam || !testTeam.id) {
        testTeam = await createTestTeam();
      }
      
      const statsJson = { goals: 2, shots: 10, possession: 60 };
      
      const response = await makeRequest()
        .post('/api/matches')
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .send({
          teamId: testTeam.id,
          opponentName: 'Stats Opponent',
          matchDate: '2024-01-01',
          statsJson,
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.statsJson).toEqual(statsJson);
      
      // Cleanup only the match we created
      await db.deleteFrom('game_events').where('match_id', '=', response.body.id).execute();
      await db.deleteFrom('matches').where('id', '=', response.body.id).execute();
    });
  });

  describe('PUT /api/matches/:id', () => {
    let testMatch: Awaited<ReturnType<typeof createTestMatch>>;

    beforeEach(async () => {
      // Ensure team exists
      if (!testTeam || !testTeam.id) {
        testTeam = await createTestTeam();
      }
      testMatch = await createTestMatch(testTeam.id, 'Test Opponent', undefined, undefined, undefined, undefined, admin.userId);
    });

    afterEach(async () => {
      // Cleanup only the match we created
      if (testMatch?.id) {
        await db.deleteFrom('game_events').where('match_id', '=', testMatch.id).execute();
        await db.deleteFrom('matches').where('id', '=', testMatch.id).execute();
      }
    });

    it('should return 401 or 403 without authentication', async () => {
      const response = await makeRequest()
        .put(`/api/matches/${testMatch.id}`)
        .send({ opponentName: 'Updated Opponent' });
      
      // PUT requests require CSRF, so may return 403 instead of 401
      expect([401, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for viewer (cannot modify)', async () => {
      const response = await makeRequest()
        .put(`/api/matches/${testMatch.id}`)
        .set(getAuthHeaders(viewer.cookies, viewer.csrfToken))
        .send({ opponentName: 'Updated Opponent' })
        .expect(403);
      
      expect(response.body).toHaveProperty('error');
    });

    it('should update match as admin', async () => {
      const response = await makeRequest()
        .put(`/api/matches/${testMatch.id}`)
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .send({ opponentName: 'Updated Opponent Name' })
        .expect(200);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.opponentName).toBe('Updated Opponent Name');
    });

    it('should update match as coach with assigned team', async () => {
      const response = await makeRequest()
        .put(`/api/matches/${testMatch.id}`)
        .set(getAuthHeaders(coachWithTeam.cookies, coachWithTeam.csrfToken))
        .send({ opponentName: 'Coach Updated Opponent' })
        .expect(200);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.opponentName).toBe('Coach Updated Opponent');
    });

    it('should return 403 for coach without team assignment', async () => {
      // Create match for otherTeam
      const otherMatch = await createTestMatch(otherTeam.id, 'Other Opponent', undefined, undefined, undefined, undefined, admin.userId);
      
      const response = await makeRequest()
        .put(`/api/matches/${otherMatch.id}`)
        .set(getAuthHeaders(coach.cookies, coach.csrfToken))
        .send({ opponentName: 'Unauthorized Update' })
        .expect(403);
      
      expect(response.body).toHaveProperty('error');
      
      // Cleanup
      // Cleanup only the match we created
      await db.deleteFrom('game_events').where('match_id', '=', response.body.id).execute();
      await db.deleteFrom('matches').where('id', '=', response.body.id).execute();
    });
  });

  describe('DELETE /api/matches/:id', () => {
    let testMatch: Awaited<ReturnType<typeof createTestMatch>>;

    beforeEach(async () => {
      // Ensure team exists
      if (!testTeam || !testTeam.id) {
        testTeam = await createTestTeam();
      }
      testMatch = await createTestMatch(testTeam.id, 'Test Opponent', undefined, undefined, undefined, undefined, admin.userId);
    });

    afterEach(async () => {
      // Cleanup only if match still exists (might have been deleted by test)
      if (testMatch?.id) {
        await db.deleteFrom('game_events').where('match_id', '=', testMatch.id).execute();
        await db.deleteFrom('matches').where('id', '=', testMatch.id).execute();
      }
    });

    it('should return 401 or 403 without authentication', async () => {
      const response = await makeRequest()
        .delete(`/api/matches/${testMatch.id}`);
      
      // DELETE requests may return 401 or 403
      expect([401, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for viewer (cannot modify)', async () => {
      const response = await makeRequest()
        .delete(`/api/matches/${testMatch.id}`)
        .set(getAuthHeaders(viewer.cookies))
        .expect(403);
      
      expect(response.body).toHaveProperty('error');
    });

    it('should delete match as admin', async () => {
      const response = await makeRequest()
        .delete(`/api/matches/${testMatch.id}`)
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      
      // Verify match is deleted
      const getResponse = await makeRequest()
        .get(`/api/matches/${testMatch.id}`)
        .set(getAuthHeaders(admin.cookies))
        .expect(404);
      
      expect(getResponse.body.error).toBe('Match not found');
    });

    it('should delete match as coach with assigned team', async () => {
      // Ensure team exists
      if (!testTeam || !testTeam.id) {
        testTeam = await createTestTeam();
      }
      
      const coachMatch = await createTestMatch(testTeam.id, 'Coach Match', undefined, undefined, undefined, undefined, coachWithTeam.userId);
      
      const response = await makeRequest()
        .delete(`/api/matches/${coachMatch.id}`)
        .set(getAuthHeaders(coachWithTeam.cookies, coachWithTeam.csrfToken))
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
      
      // Match should already be deleted, but cleanup events just in case
      await db.deleteFrom('game_events').where('match_id', '=', coachMatch.id).execute();
    });
  });

  describe('GET /api/matches/:id/events', () => {
    let testMatch: Awaited<ReturnType<typeof createTestMatch>>;

    beforeEach(async () => {
      testMatch = await createTestMatch(testTeam.id, 'Test Opponent', undefined, undefined, undefined, undefined, admin.userId);
    });

    afterEach(async () => {
      // Cleanup only the match we created
      if (testMatch?.id) {
        await db.deleteFrom('game_events').where('match_id', '=', testMatch.id).execute();
        await db.deleteFrom('matches').where('id', '=', testMatch.id).execute();
      }
    });

    it('should return 401 without authentication', async () => {
      const response = await makeRequest()
        .get(`/api/matches/${testMatch.id}/events`)
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });

    it('should return match events for authenticated users', async () => {
      // Create a test event
      await createTestGameEvent(testMatch.id, 'goal', 'attack');
      
      const response = await makeRequest()
        .get(`/api/matches/${testMatch.id}/events`)
        .set(getAuthHeaders(admin.cookies))
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const event = response.body[0];
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('eventType');
      }
    });
  });

  describe('POST /api/matches/:id/events', () => {
    let testMatch: Awaited<ReturnType<typeof createTestMatch>>;

    beforeEach(async () => {
      // Ensure team exists
      if (!testTeam || !testTeam.id) {
        testTeam = await createTestTeam();
      }
      testMatch = await createTestMatch(testTeam.id, 'Test Opponent', undefined, undefined, undefined, undefined, admin.userId);
    });

    afterEach(async () => {
      // Cleanup only the match and events we created
      if (testMatch?.id) {
        await db.deleteFrom('game_events').where('match_id', '=', testMatch.id).execute();
        await db.deleteFrom('matches').where('id', '=', testMatch.id).execute();
      }
    });

    it('should return 401 or 403 without authentication', async () => {
      const response = await makeRequest()
        .post(`/api/matches/${testMatch.id}/events`)
        .send({
          eventType: 'goal',
        });
      
      // POST requests require CSRF, so may return 403 instead of 401
      expect([401, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for viewer (cannot modify)', async () => {
      const response = await makeRequest()
        .post(`/api/matches/${testMatch.id}/events`)
        .set(getAuthHeaders(viewer.cookies, viewer.csrfToken))
        .send({
          eventType: 'goal',
        })
        .expect(403);
      
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if eventType is missing', async () => {
      const response = await makeRequest()
        .post(`/api/matches/${testMatch.id}/events`)
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Event type is required');
    });

    it('should create game event as admin', async () => {
      const response = await makeRequest()
        .post(`/api/matches/${testMatch.id}/events`)
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .send({
          eventType: 'goal',
          eventCategory: 'attack',
          minute: 45,
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.eventType).toBe('goal');
      expect(response.body.minute).toBe(45);
    });

    it('should create game event as coach with assigned team', async () => {
      const response = await makeRequest()
        .post(`/api/matches/${testMatch.id}/events`)
        .set(getAuthHeaders(coachWithTeam.cookies, coachWithTeam.csrfToken))
        .send({
          eventType: 'shot',
          eventCategory: 'attack',
          minute: 30,
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.eventType).toBe('shot');
    });
  });
});
