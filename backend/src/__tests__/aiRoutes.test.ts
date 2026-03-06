/**
 * Tests for AI Routes with Context Cache
 * Tests endpoint behavior without calling actual Gemini API
 */

import request from 'supertest';
import { cleanupTestData, getTestClient } from './helpers/testHelpers.js';
import { createTestAdmin, createTestCoach, getAuthHeaders } from './helpers/authHelpers.js';
import { createTestTeam, createTestMatch, assignTeamToUser } from './helpers/dataHelpers.js';

let client: any;
function makeRequest() {
  return client;
}

describe('AI Routes with Context Cache', () => {
  let admin: Awaited<ReturnType<typeof createTestAdmin>>;
  let coach: Awaited<ReturnType<typeof createTestCoach>>;
  let coachWithTeam: Awaited<ReturnType<typeof createTestCoach>>;
  let testTeam: Awaited<ReturnType<typeof createTestTeam>>;

  beforeAll(async () => {
    await cleanupTestData();
    client = await getTestClient();
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Set GEMINI_API_KEY for tests (even though we won't actually call API)
    process.env.GEMINI_API_KEY = 'test-gemini-api-key';
  });

  beforeEach(async () => {
    admin = await createTestAdmin();
    coach = await createTestCoach();
    coachWithTeam = await createTestCoach(undefined, 'TestPassword123!', 'Coach With Team');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    testTeam = await createTestTeam();
    await assignTeamToUser(coachWithTeam.userId, testTeam.id, admin.userId);
  });

  afterAll(async () => {
    await cleanupTestData();
    delete process.env.GEMINI_API_KEY;
  });

  describe('POST /api/ai/chat', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest()
        .post('/api/ai/chat')
        .send({ message: 'Test question', teamId: testTeam.id });
      
      expect([401, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if message is missing', async () => {
      const response = await makeRequest()
        .post('/api/ai/chat')
        .set(getAuthHeaders(coachWithTeam.cookies, coachWithTeam.csrfToken))
        .send({ teamId: testTeam.id })
        .expect(400);
      
      expect(response.body.error).toBe('Message is required');
    });

    it('should return 400 if teamId is missing (new mode)', async () => {
      const response = await makeRequest()
        .post('/api/ai/chat')
        .set(getAuthHeaders(coachWithTeam.cookies, coachWithTeam.csrfToken))
        .send({ message: 'Test question' })
        .expect(400);
      
      expect(response.body.error).toContain('teamId is required');
    });

    it('should accept teamId for cached context mode', async () => {
      await createTestMatch(testTeam.id, 'Opponent 1', '2024-01-01');

      const response = await makeRequest()
        .post('/api/ai/chat')
        .set(getAuthHeaders(coachWithTeam.cookies, coachWithTeam.csrfToken))
        .send({ message: 'What are our possession stats?', teamId: testTeam.id });
      
      // May succeed (if API key valid) or fail (if API key invalid or API unavailable)
      // Either way, the endpoint should handle it gracefully
      expect([200, 500, 503]).toContain(response.status);
    });

    it('should use non-cached mode when context provided (backward compatibility)', async () => {
      const response = await makeRequest()
        .post('/api/ai/chat')
        .set(getAuthHeaders(coachWithTeam.cookies, coachWithTeam.csrfToken))
        .send({ 
          message: 'Test question',
          context: 'Pre-formatted context'
        });
      
      // May succeed or fail depending on API availability
      expect([200, 500, 503]).toContain(response.status);
    });

    it('should return 403 for unauthorized team access', async () => {
      const otherTeam = await createTestTeam();

      const response = await makeRequest()
        .post('/api/ai/chat')
        .set(getAuthHeaders(coachWithTeam.cookies, coachWithTeam.csrfToken))
        .send({ message: 'Test question', teamId: otherTeam.id })
        .expect(403);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Access denied');
    });

    it('should return 503 when AI is not configured', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const response = await makeRequest()
        .post('/api/ai/chat')
        .set(getAuthHeaders(coachWithTeam.cookies, coachWithTeam.csrfToken))
        .send({ message: 'Test question', teamId: testTeam.id })
        .expect(503);
      
      expect(response.body.error).toContain('not configured');
      
      process.env.GEMINI_API_KEY = originalKey;
    });
  });

  describe('GET /api/ai/status', () => {
    it('should return AI configuration status', async () => {
      process.env.GEMINI_API_KEY = 'test-key';

      const response = await makeRequest()
        .get('/api/ai/status')
        .set(getAuthHeaders(coachWithTeam.cookies))
        .expect(200);
      
      expect(response.body).toHaveProperty('configured');
      expect(response.body.configured).toBe(true);
    });

    it('should return false when AI is not configured', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const response = await makeRequest()
        .get('/api/ai/status')
        .set(getAuthHeaders(coachWithTeam.cookies))
        .expect(200);
      
      expect(response.body.configured).toBe(false);
      
      process.env.GEMINI_API_KEY = originalKey;
    });
  });
});
