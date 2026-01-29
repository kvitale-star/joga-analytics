import request from 'supertest';
import { cleanupTestData, getTestClient } from './helpers/testHelpers.js';
import { createTestAdmin, createTestCoach, getAuthHeaders } from './helpers/authHelpers.js';

let client: any;
function makeRequest() {
  return client;
}

describe('User Preferences API', () => {
  let admin: Awaited<ReturnType<typeof createTestAdmin>>;
  let coach: Awaited<ReturnType<typeof createTestCoach>>;

  beforeAll(async () => {
    await cleanupTestData();
    client = await getTestClient();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  beforeEach(async () => {
    // Recreate test users and sessions AFTER beforeEach cleanup runs
    admin = await createTestAdmin();
    coach = await createTestCoach();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /api/preferences', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest()
        .get('/api/preferences')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });

    it('should return preferences for authenticated user', async () => {
      const response = await makeRequest()
        .get('/api/preferences')
        .set(getAuthHeaders(admin.cookies))
        .expect(200);
      
      // Preferences should be an object (defaults to {})
      expect(typeof response.body).toBe('object');
    });

    it('should return user-specific preferences (isolation)', async () => {
      // Set preferences for admin
      await makeRequest()
        .put('/api/preferences')
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .send({ preferences: { theme: 'dark', language: 'en' } })
        .expect(200);
      
      // Set different preferences for coach
      await makeRequest()
        .put('/api/preferences')
        .set(getAuthHeaders(coach.cookies, coach.csrfToken))
        .send({ preferences: { theme: 'light', language: 'es' } })
        .expect(200);
      
      // Verify admin gets their own preferences
      const adminResponse = await makeRequest()
        .get('/api/preferences')
        .set(getAuthHeaders(admin.cookies))
        .expect(200);
      
      expect(adminResponse.body.theme).toBe('dark');
      expect(adminResponse.body.language).toBe('en');
      
      // Verify coach gets their own preferences
      const coachResponse = await makeRequest()
        .get('/api/preferences')
        .set(getAuthHeaders(coach.cookies))
        .expect(200);
      
      expect(coachResponse.body.theme).toBe('light');
      expect(coachResponse.body.language).toBe('es');
    });
  });

  describe('PUT /api/preferences', () => {
    it('should return 401 or 403 without authentication', async () => {
      const response = await makeRequest()
        .put('/api/preferences')
        .send({ preferences: { theme: 'dark' } });
      
      // PUT requests require CSRF, so may return 403 instead of 401
      expect([401, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if preferences is not an object', async () => {
      const response = await makeRequest()
        .put('/api/preferences')
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .send({ preferences: 'not an object' })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Preferences object required');
    });

    it('should return 400 if preferences is missing', async () => {
      const response = await makeRequest()
        .put('/api/preferences')
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Preferences object required');
    });

    it('should update preferences for authenticated user', async () => {
      const newPreferences = {
        theme: 'dark',
        language: 'en',
        notifications: true,
      };
      
      const response = await makeRequest()
        .put('/api/preferences')
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .send({ preferences: newPreferences })
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      
      // Verify preferences were saved
      const getResponse = await makeRequest()
        .get('/api/preferences')
        .set(getAuthHeaders(admin.cookies))
        .expect(200);
      
      expect(getResponse.body.theme).toBe('dark');
      expect(getResponse.body.language).toBe('en');
      expect(getResponse.body.notifications).toBe(true);
    });

    it('should merge preferences with existing (not replace)', async () => {
      // Set initial preferences
      await makeRequest()
        .put('/api/preferences')
        .set(getAuthHeaders(coach.cookies, coach.csrfToken))
        .send({ preferences: { theme: 'dark', language: 'en' } })
        .expect(200);
      
      // Update with new property (should merge, not replace)
      await makeRequest()
        .put('/api/preferences')
        .set(getAuthHeaders(coach.cookies, coach.csrfToken))
        .send({ preferences: { notifications: true } })
        .expect(200);
      
      // Verify all preferences are present (merged)
      const getResponse = await makeRequest()
        .get('/api/preferences')
        .set(getAuthHeaders(coach.cookies))
        .expect(200);
      
      expect(getResponse.body.theme).toBe('dark');
      expect(getResponse.body.language).toBe('en');
      expect(getResponse.body.notifications).toBe(true);
    });

    it('should handle nested preferences objects', async () => {
      const nestedPreferences = {
        ui: {
          theme: 'dark',
          fontSize: 'large',
        },
        notifications: {
          email: true,
          push: false,
        },
      };
      
      const response = await makeRequest()
        .put('/api/preferences')
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .send({ preferences: nestedPreferences })
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
      
      // Verify nested structure is preserved
      const getResponse = await makeRequest()
        .get('/api/preferences')
        .set(getAuthHeaders(admin.cookies))
        .expect(200);
      
      expect(getResponse.body.ui).toBeDefined();
      expect(getResponse.body.ui.theme).toBe('dark');
      expect(getResponse.body.notifications).toBeDefined();
      expect(getResponse.body.notifications.email).toBe(true);
    });

    it('should handle empty preferences object', async () => {
      const response = await makeRequest()
        .put('/api/preferences')
        .set(getAuthHeaders(coach.cookies, coach.csrfToken))
        .send({ preferences: {} })
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
      
      // Verify empty object is saved
      const getResponse = await makeRequest()
        .get('/api/preferences')
        .set(getAuthHeaders(coach.cookies))
        .expect(200);
      
      expect(typeof getResponse.body).toBe('object');
    });
  });
});
