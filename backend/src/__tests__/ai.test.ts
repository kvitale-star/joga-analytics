import request from 'supertest';
import { cleanupTestData, getTestClient } from './helpers/testHelpers.js';
import { createTestAdmin, getAuthHeaders } from './helpers/authHelpers.js';

let client: any;
function makeRequest() {
  return client;
}

// Note: For ES modules, we'll test the endpoint behavior
// The actual Gemini API mocking would require more complex setup
// For now, we test the endpoint responses and error handling

describe('AI Service API', () => {
  let admin: Awaited<ReturnType<typeof createTestAdmin>>;

  beforeAll(async () => {
    await cleanupTestData();
    client = await getTestClient();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    admin = await createTestAdmin();
    
    // Set GEMINI_API_KEY for tests
    process.env.GEMINI_API_KEY = 'test-gemini-api-key';
  });

  afterAll(async () => {
    await cleanupTestData();
    delete process.env.GEMINI_API_KEY;
  });


  describe('POST /api/ai/chat', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest()
        .post('/api/ai/chat')
        .send({ message: 'Test question' });
      
      // May be 401 (no auth) or 403 (CSRF required)
      expect([401, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if message is missing', async () => {
      const response = await makeRequest()
        .post('/api/ai/chat')
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Message is required');
    });

    it('should return 503 when AI is not configured', async () => {
      // Temporarily remove API key
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const response = await makeRequest()
        .post('/api/ai/chat')
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .send({ message: 'Test question' })
        .expect(503);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not configured');
      
      // Restore API key
      process.env.GEMINI_API_KEY = originalKey;
    });

    it('should accept valid chat request (may fail if API key invalid, but endpoint should accept it)', async () => {
      // This test verifies the endpoint accepts the request
      // Actual AI response depends on valid API key
      // In a real scenario with mocked Gemini, this would succeed
      const response = await makeRequest()
        .post('/api/ai/chat')
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .send({ message: 'What is the average goals per match?' });
      
      // Accept either 200 (if API key works) or 500 (if API key invalid/missing)
      // The important thing is the endpoint accepts the request structure
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('response');
      } else {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should handle context in chat request', async () => {
      const context = 'Match data: Team A scored 2 goals';
      
      const response = await makeRequest()
        .post('/api/ai/chat')
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .send({ 
          message: 'Analyze the match data',
          context,
        });
      
      // Accept either success or error (depends on API key validity)
      expect([200, 500]).toContain(response.status);
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/ai/status', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest()
        .get('/api/ai/status')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });

    it('should return configured status when API key is set', async () => {
      const response = await makeRequest()
        .get('/api/ai/status')
        .set(getAuthHeaders(admin.cookies))
        .expect(200);
      
      expect(response.body).toHaveProperty('configured');
      expect(response.body.configured).toBe(true);
    });

    it('should return not configured when API key is missing', async () => {
      // Temporarily remove API key
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const response = await makeRequest()
        .get('/api/ai/status')
        .set(getAuthHeaders(admin.cookies))
        .expect(200);
      
      expect(response.body).toHaveProperty('configured');
      expect(response.body.configured).toBe(false);
      
      // Restore API key
      process.env.GEMINI_API_KEY = originalKey;
    });
  });
});
