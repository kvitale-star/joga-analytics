import request from 'supertest';
import { cleanupTestData, getTestClient } from './helpers/testHelpers.js';
import { createTestAdmin, getAuthHeaders } from './helpers/authHelpers.js';

let client: any;
function makeRequest() {
  return client;
}

// Store original fetch
const originalFetch = global.fetch;

describe('Google Sheets Integration API', () => {
  let admin: Awaited<ReturnType<typeof createTestAdmin>>;

  beforeAll(async () => {
    await cleanupTestData();
    client = await getTestClient();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    admin = await createTestAdmin();
    
    // Set required env vars for tests
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'test-spreadsheet-id';
    process.env.GOOGLE_SHEETS_API_KEY = 'test-api-key';
  });

  afterAll(async () => {
    await cleanupTestData();
    // Restore original fetch
    global.fetch = originalFetch;
    // Clean up env vars
    delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    delete process.env.GOOGLE_SHEETS_API_KEY;
  });

  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = originalFetch;
  });

  describe('GET /api/sheets/data', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest()
        .get('/api/sheets/data?range=Sheet1!A1:Z100')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if range parameter is missing', async () => {
      const response = await makeRequest()
        .get('/api/sheets/data')
        .set(getAuthHeaders(admin.cookies))
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Range parameter is required');
    });

    it('should fetch sheet data successfully', async () => {
      // Mock successful Google Sheets API response
      global.fetch = (async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          values: [
            ['Header1', 'Header2', 'Header3'],
            ['Value1', 'Value2', 'Value3'],
            ['Value4', 'Value5', 'Value6'],
          ],
        }),
      })) as any;

      const response = await makeRequest()
        .get('/api/sheets/data?range=Sheet1!A1:Z100')
        .set(getAuthHeaders(admin.cookies))
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2); // 2 data rows (excluding header)
      
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('Header1');
        expect(response.body[0].Header1).toBe('Value1');
      }
    });

    it('should handle 403 error from Google API', async () => {
      // Mock 403 error response
      global.fetch = (async () => ({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({
          error: {
            message: 'API key not valid',
            code: 403,
          },
        }),
      })) as any;

      const response = await makeRequest()
        .get('/api/sheets/data?range=Sheet1!A1:Z100')
        .set(getAuthHeaders(admin.cookies))
        .expect(403);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('access denied');
    });

    it('should handle 404 error from Google API', async () => {
      // Mock 404 error response
      global.fetch = (async () => ({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({
          error: {
            message: 'Spreadsheet not found',
            code: 404,
          },
        }),
      })) as any;

      const response = await makeRequest()
        .get('/api/sheets/data?range=Sheet1!A1:Z100')
        .set(getAuthHeaders(admin.cookies))
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    it('should handle 400 error from Google API', async () => {
      // Mock 400 error response
      global.fetch = (async () => ({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: {
            message: 'Invalid range',
            code: 400,
          },
        }),
      })) as any;

      const response = await makeRequest()
        .get('/api/sheets/data?range=InvalidRange')
        .set(getAuthHeaders(admin.cookies))
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid request');
    });

    it('should handle 429 throttling error', async () => {
      // Mock 429 throttling error
      global.fetch = (async () => ({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({
          error: {
            message: 'Quota exceeded',
            code: 429,
          },
        }),
      })) as any;

      const response = await makeRequest()
        .get('/api/sheets/data?range=Sheet1!A1:Z100')
        .set(getAuthHeaders(admin.cookies))
        .expect(500);
      
      expect(response.body).toHaveProperty('error');
    });

    it('should handle network failures', async () => {
      // Mock network error
      global.fetch = (async () => {
        throw new Error('Network error');
      }) as any;

      const response = await makeRequest()
        .get('/api/sheets/data?range=Sheet1!A1:Z100')
        .set(getAuthHeaders(admin.cookies))
        .expect(500);
      
      expect(response.body).toHaveProperty('error');
    });

    it('should parse data with type conversion', async () => {
      // Mock response with mixed data types
      global.fetch = (async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          values: [
            ['Name', 'Goals', 'Shots', 'Possession'],
            ['Team A', '2', '10', '60'],
            ['Team B', '1', '8', '40'],
          ],
        }),
      })) as any;

      const response = await makeRequest()
        .get('/api/sheets/data?range=Sheet1!A1:Z100')
        .set(getAuthHeaders(admin.cookies))
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      
      // Check type conversion (numbers should be numbers)
      if (response.body.length > 0) {
        expect(typeof response.body[0].Goals).toBe('number');
        expect(response.body[0].Goals).toBe(2);
        expect(typeof response.body[0].Shots).toBe('number');
        expect(response.body[0].Shots).toBe(10);
      }
    });
  });

  describe('GET /api/sheets/metadata', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest()
        .get('/api/sheets/metadata?range=Metadata!A1:Z100')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if range parameter is missing', async () => {
      const response = await makeRequest()
        .get('/api/sheets/metadata')
        .set(getAuthHeaders(admin.cookies))
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Range parameter is required');
    });

    it('should fetch metadata successfully', async () => {
      // Mock successful metadata response
      global.fetch = (async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          values: [
            ['Column', 'Type', 'Description'],
            ['Name', 'string', 'Team name'],
            ['Goals', 'number', 'Number of goals'],
          ],
        }),
      })) as any;

      const response = await makeRequest()
        .get('/api/sheets/metadata?range=Metadata!A1:Z100')
        .set(getAuthHeaders(admin.cookies))
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/sheets/append', () => {
    it('should return 401 or 403 without authentication', async () => {
      const response = await makeRequest()
        .post('/api/sheets/append')
        .send({
          sheetName: 'Sheet1',
          columnKeys: ['Name', 'Value'],
          rowData: { Name: 'Test', Value: 123 },
        });
      
      // POST requests require CSRF, so may return 403 instead of 401
      expect([401, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await makeRequest()
        .post('/api/sheets/append')
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .send({
          sheetName: 'Sheet1',
          // Missing columnKeys and rowData
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });

    it('should append row to sheet successfully', async () => {
      // Mock successful append response
      global.fetch = (async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          updates: {
            updatedRows: 1,
          },
        }),
      })) as any;

      const response = await makeRequest()
        .post('/api/sheets/append')
        .set(getAuthHeaders(admin.cookies, admin.csrfToken))
        .send({
          sheetName: 'Sheet1',
          columnKeys: ['Name', 'Value'],
          rowData: { Name: 'Test', Value: 123 },
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/sheets/test', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest()
        .get('/api/sheets/test')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });

    it('should return diagnostic info when env vars are set', async () => {
      // Mock successful test response
      global.fetch = (async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          values: [['Test']],
        }),
      })) as any;

      const response = await makeRequest()
        .get('/api/sheets/test')
        .set(getAuthHeaders(admin.cookies))
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('diagnostics');
      expect(response.body.diagnostics.envVarsSet).toBeDefined();
    });

    it('should return error when env vars are not set', async () => {
      // Temporarily remove env vars
      const originalSpreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
      const originalApiKey = process.env.GOOGLE_SHEETS_API_KEY;
      delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
      delete process.env.GOOGLE_SHEETS_API_KEY;

      const response = await makeRequest()
        .get('/api/sheets/test')
        .set(getAuthHeaders(admin.cookies))
        .expect(500);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Environment variables not set');
      
      // Restore env vars
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID = originalSpreadsheetId;
      process.env.GOOGLE_SHEETS_API_KEY = originalApiKey;
    });
  });
});
