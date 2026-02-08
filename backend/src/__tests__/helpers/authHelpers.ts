import request from 'supertest';
import { getTestClient } from './testHelpers.js';
import { createTestUser, deleteTestUser } from './testHelpers.js';
import { db } from '../../db/database.js';
import crypto from 'crypto';

/**
 * Helper to make authenticated requests
 */
let client: any;
async function makeRequest() {
  if (!client) {
    client = await getTestClient();
  }
  return client;
}

/**
 * Create a test admin user with session
 * Uses robust retry logic and verification to ensure reliable test setup
 */
export async function createTestAdmin(
  email?: string,
  password: string = 'TestPassword123!',
  name: string = 'Test Admin'
) {
  const testEmail = email || `test-admin-${Date.now()}@example.com`;
  
  // Step 1: Create user in database
  const userId = await createTestUser(testEmail, password, name, 'admin', true, true);
  
  // Step 2: Wait for database commit and verify user exists with exponential backoff
  const { getUserByEmailForAuth } = await import('../../services/authService.js');
  let retries = 0;
  let createdUser = null;
  const maxRetries = 8;
  
  while (retries < maxRetries && !createdUser) {
    // Exponential backoff: 50ms, 100ms, 200ms, 400ms, etc.
    const delay = Math.min(50 * Math.pow(2, retries), 1000);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      createdUser = await getUserByEmailForAuth(testEmail);
      // Verify user is in expected state
      if (createdUser && !createdUser.isActive) {
        throw new Error(`User created but is not active: ${testEmail}`);
      }
      if (createdUser && !createdUser.emailVerified) {
        throw new Error(`User created but email not verified: ${testEmail}`);
      }
    } catch (error: any) {
      // If it's not a "user not found" error, rethrow
      if (!error.message?.includes('not found') && !error.message?.includes('User created but')) {
        throw error;
      }
    }
    retries++;
  }
  
  if (!createdUser) {
    throw new Error(
      `❌ Test setup failed: User was not created after ${maxRetries} retries. ` +
      `Email: ${testEmail}, UserId: ${userId}. ` +
      `This indicates a database transaction issue.`
    );
  }
  
  // Step 3: Additional delay to ensure all database operations are committed
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Step 4: Attempt login with robust retry logic
  let loginResponse;
  let loginRetries = 0;
  const maxLoginRetries = 5;
  
  while (loginRetries < maxLoginRetries) {
    loginResponse = await (await makeRequest())
      .post('/api/auth/login')
      .send({ email: testEmail, password });
    
    // Success - break out of retry loop
    if (loginResponse.status === 200) {
      break;
    }
    
    // Rate limiting is disabled in test environment, so 429 should not occur
    // If it does, fail immediately to surface configuration issues
    if (loginResponse.status === 429) {
      throw new Error('Rate limiting occurred in test environment - check rate limiter configuration');
    }
    
    // Authentication failed - might be timing issue (database commit delay)
    if (loginResponse.status === 401) {
      // Exponential backoff for auth failures (reduced delay since rate limiting is disabled)
      const authDelay = Math.min(100 * Math.pow(2, loginRetries), 500);
      await new Promise(resolve => setTimeout(resolve, authDelay));
      loginRetries++;
      continue;
    }
    
    // Unexpected status - don't retry
    break;
  }
  
  // Step 5: Verify login succeeded
  if (!loginResponse || loginResponse.status !== 200) {
    // Verify user still exists and is in correct state
    const verifyUser = await getUserByEmailForAuth(testEmail);
    throw new Error(
      `❌ Test setup failed: Could not login admin user after ${maxLoginRetries} attempts. ` +
      `Status: ${loginResponse?.status || 'no response'}, ` +
      `Response: ${JSON.stringify(loginResponse?.body || {})}. ` +
      `User exists: ${!!verifyUser}, ` +
      `User active: ${verifyUser?.isActive}, ` +
      `User verified: ${verifyUser?.emailVerified}, ` +
      `Email: ${testEmail}. ` +
      `This indicates a login/auth service issue.`
    );
  }
  
  // Step 6: Extract and verify session cookies
  const cookies = extractCookies(loginResponse);
  const csrfToken = extractCsrfToken(cookies);
  
  if (cookies.length === 0) {
    throw new Error(
      `❌ Test setup failed: Login succeeded but no session cookies returned. ` +
      `Email: ${testEmail}. This indicates a session creation issue.`
    );
  }
  
  // Step 7: Verify session exists in database
  const sessionCookie = cookies.find((c: string) => c.startsWith('sessionId='));
  if (sessionCookie) {
    const sessionId = sessionCookie.split(';')[0].split('=')[1];
    const session = await db
      .selectFrom('sessions')
      .select('id')
      .where('id', '=', sessionId)
      .executeTakeFirst();
    
    if (!session) {
      throw new Error(
        `❌ Test setup failed: Session cookie created but session not found in database. ` +
        `SessionId: ${sessionId}, Email: ${testEmail}.`
      );
    }
  }
  
  return {
    userId,
    email: testEmail,
    password,
    name,
    role: 'admin' as const,
    cookies,
    csrfToken,
    cleanup: () => deleteTestUser(testEmail),
  };
}

/**
 * Create a test coach user with session
 * Uses robust retry logic and verification to ensure reliable test setup
 */
export async function createTestCoach(
  email?: string,
  password: string = 'TestPassword123!',
  name: string = 'Test Coach'
) {
  const testEmail = email || `test-coach-${Date.now()}@example.com`;
  
  // Step 1: Create user in database
  const userId = await createTestUser(testEmail, password, name, 'coach', true, true);
  
  // Step 2: Wait for database commit and verify user exists with exponential backoff
  const { getUserByEmailForAuth } = await import('../../services/authService.js');
  let retries = 0;
  let createdUser = null;
  const maxRetries = 8;
  
  while (retries < maxRetries && !createdUser) {
    // Exponential backoff: 50ms, 100ms, 200ms, 400ms, etc.
    const delay = Math.min(50 * Math.pow(2, retries), 1000);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      createdUser = await getUserByEmailForAuth(testEmail);
      // Verify user is in expected state
      if (createdUser && !createdUser.isActive) {
        throw new Error(`User created but is not active: ${testEmail}`);
      }
      if (createdUser && !createdUser.emailVerified) {
        throw new Error(`User created but email not verified: ${testEmail}`);
      }
    } catch (error: any) {
      // If it's not a "user not found" error, rethrow
      if (!error.message?.includes('not found') && !error.message?.includes('User created but')) {
        throw error;
      }
    }
    retries++;
  }
  
  if (!createdUser) {
    throw new Error(
      `❌ Test setup failed: User was not created after ${maxRetries} retries. ` +
      `Email: ${testEmail}, UserId: ${userId}. ` +
      `This indicates a database transaction issue.`
    );
  }
  
  // Step 3: Additional delay to ensure all database operations are committed
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Step 4: Attempt login with robust retry logic
  let loginResponse;
  let loginRetries = 0;
  const maxLoginRetries = 5;
  
  while (loginRetries < maxLoginRetries) {
    loginResponse = await (await makeRequest())
      .post('/api/auth/login')
      .send({ email: testEmail, password });
    
    // Success - break out of retry loop
    if (loginResponse.status === 200) {
      break;
    }
    
    // Rate limiting is disabled in test environment, so 429 should not occur
    // If it does, fail immediately to surface configuration issues
    if (loginResponse.status === 429) {
      throw new Error('Rate limiting occurred in test environment - check rate limiter configuration');
    }
    
    // Authentication failed - might be timing issue (database commit delay)
    if (loginResponse.status === 401) {
      // Exponential backoff for auth failures (reduced delay since rate limiting is disabled)
      const authDelay = Math.min(100 * Math.pow(2, loginRetries), 500);
      await new Promise(resolve => setTimeout(resolve, authDelay));
      loginRetries++;
      continue;
    }
    
    // Unexpected status - don't retry
    break;
  }
  
  // Step 5: Verify login succeeded
  if (!loginResponse || loginResponse.status !== 200) {
    // Verify user still exists and is in correct state
    const verifyUser = await getUserByEmailForAuth(testEmail);
    throw new Error(
      `❌ Test setup failed: Could not login coach user after ${maxLoginRetries} attempts. ` +
      `Status: ${loginResponse?.status || 'no response'}, ` +
      `Response: ${JSON.stringify(loginResponse?.body || {})}. ` +
      `User exists: ${!!verifyUser}, ` +
      `User active: ${verifyUser?.isActive}, ` +
      `User verified: ${verifyUser?.emailVerified}, ` +
      `Email: ${testEmail}. ` +
      `This indicates a login/auth service issue.`
    );
  }
  
  // Step 6: Extract and verify session cookies
  const cookies = extractCookies(loginResponse);
  const csrfToken = extractCsrfToken(cookies);
  
  if (cookies.length === 0) {
    throw new Error(
      `❌ Test setup failed: Login succeeded but no session cookies returned. ` +
      `Email: ${testEmail}. This indicates a session creation issue.`
    );
  }
  
  // Step 7: Verify session exists in database
  const sessionCookie = cookies.find((c: string) => c.startsWith('sessionId='));
  if (sessionCookie) {
    const sessionId = sessionCookie.split(';')[0].split('=')[1];
    const session = await db
      .selectFrom('sessions')
      .select('id')
      .where('id', '=', sessionId)
      .executeTakeFirst();
    
    if (!session) {
      throw new Error(
        `❌ Test setup failed: Session cookie created but session not found in database. ` +
        `SessionId: ${sessionId}, Email: ${testEmail}.`
      );
    }
  }
  
  return {
    userId,
    email: testEmail,
    password,
    name,
    role: 'coach' as const,
    cookies,
    csrfToken,
    cleanup: () => deleteTestUser(testEmail),
  };
}

/**
 * Create a test viewer user with session
 * Uses robust retry logic and verification to ensure reliable test setup
 */
export async function createTestViewer(
  email?: string,
  password: string = 'TestPassword123!',
  name: string = 'Test Viewer'
) {
  const testEmail = email || `test-viewer-${Date.now()}@example.com`;
  
  // Step 1: Create user in database
  const userId = await createTestUser(testEmail, password, name, 'viewer', true, true);
  
  // Step 2: Wait for database commit and verify user exists with exponential backoff
  const { getUserByEmailForAuth } = await import('../../services/authService.js');
  let retries = 0;
  let createdUser = null;
  const maxRetries = 8;
  
  while (retries < maxRetries && !createdUser) {
    // Exponential backoff: 50ms, 100ms, 200ms, 400ms, etc.
    const delay = Math.min(50 * Math.pow(2, retries), 1000);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      createdUser = await getUserByEmailForAuth(testEmail);
      // Verify user is in expected state
      if (createdUser && !createdUser.isActive) {
        throw new Error(`User created but is not active: ${testEmail}`);
      }
      if (createdUser && !createdUser.emailVerified) {
        throw new Error(`User created but email not verified: ${testEmail}`);
      }
    } catch (error: any) {
      // If it's not a "user not found" error, rethrow
      if (!error.message?.includes('not found') && !error.message?.includes('User created but')) {
        throw error;
      }
    }
    retries++;
  }
  
  if (!createdUser) {
    throw new Error(
      `❌ Test setup failed: User was not created after ${maxRetries} retries. ` +
      `Email: ${testEmail}, UserId: ${userId}. ` +
      `This indicates a database transaction issue.`
    );
  }
  
  // Step 3: Additional delay to ensure all database operations are committed
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Step 4: Attempt login with robust retry logic
  let loginResponse;
  let loginRetries = 0;
  const maxLoginRetries = 5;
  
  while (loginRetries < maxLoginRetries) {
    loginResponse = await (await makeRequest())
      .post('/api/auth/login')
      .send({ email: testEmail, password });
    
    // Success - break out of retry loop
    if (loginResponse.status === 200) {
      break;
    }
    
    // Rate limiting is disabled in test environment, so 429 should not occur
    // If it does, fail immediately to surface configuration issues
    if (loginResponse.status === 429) {
      throw new Error('Rate limiting occurred in test environment - check rate limiter configuration');
    }
    
    // Authentication failed - might be timing issue (database commit delay)
    if (loginResponse.status === 401) {
      // Exponential backoff for auth failures (reduced delay since rate limiting is disabled)
      const authDelay = Math.min(100 * Math.pow(2, loginRetries), 500);
      await new Promise(resolve => setTimeout(resolve, authDelay));
      loginRetries++;
      continue;
    }
    
    // Unexpected status - don't retry
    break;
  }
  
  // Step 5: Verify login succeeded
  if (!loginResponse || loginResponse.status !== 200) {
    // Verify user still exists and is in correct state
    const verifyUser = await getUserByEmailForAuth(testEmail);
    throw new Error(
      `❌ Test setup failed: Could not login viewer user after ${maxLoginRetries} attempts. ` +
      `Status: ${loginResponse?.status || 'no response'}, ` +
      `Response: ${JSON.stringify(loginResponse?.body || {})}. ` +
      `User exists: ${!!verifyUser}, ` +
      `User active: ${verifyUser?.isActive}, ` +
      `User verified: ${verifyUser?.emailVerified}, ` +
      `Email: ${testEmail}. ` +
      `This indicates a login/auth service issue.`
    );
  }
  
  // Step 6: Extract and verify session cookies
  const cookies = extractCookies(loginResponse);
  const csrfToken = extractCsrfToken(cookies);
  
  if (cookies.length === 0) {
    throw new Error(
      `❌ Test setup failed: Login succeeded but no session cookies returned. ` +
      `Email: ${testEmail}. This indicates a session creation issue.`
    );
  }
  
  // Step 7: Verify session exists in database
  const sessionCookie = cookies.find((c: string) => c.startsWith('sessionId='));
  if (sessionCookie) {
    const sessionId = sessionCookie.split(';')[0].split('=')[1];
    const session = await db
      .selectFrom('sessions')
      .select('id')
      .where('id', '=', sessionId)
      .executeTakeFirst();
    
    if (!session) {
      throw new Error(
        `❌ Test setup failed: Session cookie created but session not found in database. ` +
        `SessionId: ${sessionId}, Email: ${testEmail}.`
      );
    }
  }
  
  return {
    userId,
    email: testEmail,
    password,
    name,
    role: 'viewer' as const,
    cookies,
    csrfToken,
    cleanup: () => deleteTestUser(testEmail),
  };
}

/**
 * Login as a user and return session cookies
 */
export async function loginAs(email: string, password: string) {
  const loginResponse = await (await makeRequest())
    .post('/api/auth/login')
    .send({ email, password });
  
  if (loginResponse.status !== 200) {
    throw new Error(`Login failed: ${loginResponse.status} - ${JSON.stringify(loginResponse.body)}`);
  }
  
  const cookies = extractCookies(loginResponse);
  const csrfToken = extractCsrfToken(cookies);
  
  return { cookies, csrfToken };
}

/**
 * Get auth headers for authenticated requests
 */
export function getAuthHeaders(cookies: string[], csrfToken?: string) {
  const headers: Record<string, string> = {};
  
  if (cookies.length > 0) {
    // Join cookies with '; ' separator (standard Cookie header format)
    const cookieHeader = cookies.join('; ');
    headers['Cookie'] = cookieHeader;
    
    // Debug: Log cookie header being sent
    if (process.env.DEBUG_TESTS) {
      console.log('🔍 Setting Cookie header:', cookieHeader);
    }
  }
  
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
    
    // Debug: Log CSRF token being sent
    if (process.env.DEBUG_TESTS) {
      console.log('🔍 Setting X-CSRF-Token header:', csrfToken);
    }
  }
  
  return headers;
}

/**
 * Extract cookies from response
 */
function extractCookies(response: any): string[] {
  const setCookieHeader = response.headers['set-cookie'];
  if (!setCookieHeader) {
    return [];
  }
  const rawCookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  // Supertest expects Cookie header to be "name=value; name2=value2"
  // Strip attributes (Path, HttpOnly, SameSite, etc.)
  return rawCookies.map((c: string) => c.split(';')[0]).filter(Boolean);
}

/**
 * Extract CSRF token from cookies
 */
function extractCsrfToken(cookies: string[]): string | undefined {
  const csrfCookie = cookies.find((c: string) => c.startsWith('csrfToken='));
  if (csrfCookie) {
    return csrfCookie.split(';')[0].split('=')[1];
  }
  return undefined;
}

/**
 * Generate a session ID (matching authService pattern)
 */
function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a session directly in the database (for testing middleware)
 */
export async function createSession(userId: number, expiresInHours: number = 24): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);
  
  await db
    .insertInto('sessions')
    .values({
      id: sessionId,
      user_id: userId,
      expires_at: expiresAt.toISOString(),
    })
    .execute();
  
  return sessionId;
}

/**
 * Delete a session from the database
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await db
    .deleteFrom('sessions')
    .where('id', '=', sessionId)
    .execute();
}
