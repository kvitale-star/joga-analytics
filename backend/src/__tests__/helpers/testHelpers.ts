import { db } from '../../db/database.js';
import { cleanupTestData as cleanupExtended } from './dataHelpers.js';
import request from 'supertest';
import { app, initializeDatabase } from '../../server.js';

let isDbInitialized = false;

/**
 * Test helper to get the API base URL
 * Works for both local and Railway environments
 * 
 * Usage:
 * - Local: Ensure server is running, or set API_URL=http://localhost:3001
 * - Railway: Set API_URL=https://your-app.railway.app
 */
export function getApiBaseUrl(): string {
  // Check if API_URL is set (for Railway or custom deployments)
  if (process.env.API_URL) {
    return process.env.API_URL.replace(/\/$/, ''); // Remove trailing slash
  }
  
  // Default to local development
  const port = process.env.PORT || 3001;
  return `http://localhost:${port}`;
}

/**
 * Get a Supertest client.
 * - If API_URL is set, uses that remote base URL (Railway).
 * - Otherwise, uses the local Express app instance (no server required).
 */
export async function getTestClient() {
  if (process.env.API_URL) {
    return request(getApiBaseUrl());
  }

  if (!isDbInitialized) {
    await initializeDatabase();
    isDbInitialized = true;
  }

  return request(app);
}

/**
 * Clean up test data from database
 * Now uses extended cleanup from dataHelpers
 */
export async function cleanupTestData() {
  await cleanupExtended();
}

/**
 * Create a test user in the database
 */
export async function createTestUser(
  email: string,
  password: string,
  name: string = 'Test User',
  role: 'admin' | 'coach' | 'viewer' = 'coach',
  isActive: boolean = true,
  emailVerified: boolean = true
) {
  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.default.hash(password, 12);
  
  const now = new Date().toISOString();
  const result = await db
    .insertInto('users')
    .values({
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      name,
      role,
      email_verified: emailVerified ? 1 : 0,
      is_active: isActive ? 1 : 0,
      preferences: JSON.stringify({}),
      created_at: now,
      updated_at: now,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  
  return result.id;
}

/**
 * Delete a test user by email
 */
export async function deleteTestUser(email: string) {
  if (!email) return;
  await db
    .deleteFrom('users')
    .where('email', '=', email.toLowerCase().trim())
    .execute();
}
