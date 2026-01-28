/**
 * Browser-based authentication service
 * Uses SQL.js (browser database) for all operations
 * This is the original implementation before backend API migration
 * 
 * NOTE: This file is only used when VITE_USE_BACKEND_API=false (browser mode)
 * In production, the backend API is always used, so this file is not executed.
 */

import { getDatabase, execute, queryOne } from '../db/database';
import { User, UserRole, LoginCredentials, Session, SetupWizardData, UserWithPassword } from '../types/auth';
import { validatePassword } from '../utils/passwordValidation';

const SALT_ROUNDS = 12;
const SESSION_DURATION_DAYS = 7;
const SESSION_ID_LENGTH = 32;

// Use a type-only import for bcryptjs to avoid bundling it
// In production builds, this will be replaced with a stub
type BcryptModule = {
  hash: (data: string, saltRounds: number) => Promise<string>;
  compare: (data: string, hash: string) => Promise<boolean>;
};

// Stub implementation for production builds
// This file should never be executed in production (backend API is used instead)
const bcryptStub: BcryptModule = {
  hash: async () => {
    throw new Error('bcryptjs not available - browser auth service should not be used in production');
  },
  compare: async () => {
    throw new Error('bcryptjs not available - browser auth service should not be used in production');
  },
};

// In browser mode, bcryptjs will be loaded dynamically
// In production builds, this will use the stub
let bcryptImpl: BcryptModule | null = null;

async function getBcrypt(): Promise<BcryptModule> {
  if (bcryptImpl) {
    return bcryptImpl;
  }
  
  // Check if we're in production (backend API mode)
  const USE_BACKEND_API = import.meta.env.VITE_USE_BACKEND_API === 'true';
  if (USE_BACKEND_API || import.meta.env.PROD) {
    // Should never happen in production, but provide stub as fallback
    return bcryptStub;
  }
  
  // Browser mode - try to load bcryptjs
  try {
    // Use a type assertion to avoid static analysis issues
    const bcryptModule = await import('bcryptjs' as any);
    bcryptImpl = (bcryptModule.default || bcryptModule) as BcryptModule;
    return bcryptImpl;
  } catch (error) {
    console.error('Failed to load bcryptjs:', error);
    throw new Error('bcryptjs is required for browser mode but could not be loaded');
  }
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await getBcrypt();
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await getBcrypt();
  return bcrypt.compare(password, hash);
}

/**
 * Generate a random token (browser-compatible)
 */
export function generateToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a session ID
 */
export function generateSessionId(): string {
  return generateToken(SESSION_ID_LENGTH);
}

/**
 * Create a new session (7 days from now)
 */
export async function createSession(userId: number): Promise<Session> {
  const db = await getDatabase();
  const sessionId = generateSessionId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await execute(
    db,
    `INSERT INTO sessions (id, user_id, expires_at, last_activity_at)
     VALUES (?, ?, ?, ?)`,
    [sessionId, userId, expiresAt.toISOString(), now.toISOString()]
  );

  return {
    id: sessionId,
    userId,
    expiresAt,
    lastActivityAt: now,
    createdAt: now,
  };
}

/**
 * Get session by ID and validate it
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  const db = await getDatabase();
  const now = new Date();

  const session = await queryOne<{
    id: string;
    user_id: number;
    expires_at: string;
    last_activity_at: string;
    created_at: string;
  }>(
    db,
    `SELECT id, user_id, expires_at, last_activity_at, created_at
     FROM sessions
     WHERE id = ? AND expires_at > ?`,
    [sessionId, now.toISOString()]
  );

  if (!session) {
    return null;
  }

  // Update last activity
  await execute(
    db,
    `UPDATE sessions 
     SET last_activity_at = ?
     WHERE id = ?`,
    [now.toISOString(), sessionId]
  );

  return {
    id: session.id,
    userId: session.user_id,
    expiresAt: new Date(session.expires_at),
    lastActivityAt: new Date(session.last_activity_at),
    createdAt: new Date(session.created_at),
  };
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const db = await getDatabase();
  await execute(db, 'DELETE FROM sessions WHERE id = ?', [sessionId]);
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(userId: number): Promise<void> {
  const db = await getDatabase();
  await execute(db, 'DELETE FROM sessions WHERE user_id = ?', [userId]);
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<void> {
  const db = await getDatabase();
  const now = new Date();
  await execute(db, 'DELETE FROM sessions WHERE expires_at <= ?', [now.toISOString()]);
}

/**
 * Reset auth database - clears ONLY users and sessions (not match data)
 * This allows testing the setup wizard without losing Google Sheets data
 */
export async function resetAuthDatabase(): Promise<void> {
  const db = await getDatabase();
  
  // Delete all sessions first (foreign key constraint)
  await execute(db, 'DELETE FROM sessions', []);
  
  // Delete all user-team assignments (foreign key constraint)
  await execute(db, 'DELETE FROM user_teams', []);
  
  // Delete all users
  await execute(db, 'DELETE FROM users', []);
  
  // Clear session from localStorage
  localStorage.removeItem('joga_session_id');
  
  console.log('Auth database reset complete. Users and sessions cleared.');
}

/**
 * Create a new user
 */
export async function createUser(
  email: string,
  password: string,
  name: string,
  role: UserRole
): Promise<User> {
  // Validate password
  const validation = validatePassword(password);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid password');
  }

  const db = await getDatabase();
  const passwordHash = await hashPassword(password);
  const emailVerificationToken = generateToken();
  const now = new Date();

  const result = await execute(
    db,
    `INSERT INTO users (
      email, password_hash, name, role, email_verified,
      email_verification_token, email_verification_sent_at,
      preferences, is_active, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      email.toLowerCase().trim(),
      passwordHash,
      name,
      role,
      role === 'admin' ? 1 : 0, // Auto-verify admin emails
      emailVerificationToken,
      role === 'admin' ? null : now.toISOString(),
      JSON.stringify({}),
      1,
      now.toISOString(),
      now.toISOString(),
    ]
  );

  const user = await getUserById(result.lastInsertRowid);
  if (!user) {
    throw new Error('Failed to retrieve created user');
  }
  return user;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number): Promise<User | null> {
  const db = await getDatabase();
  const user = await queryOne<{
    id: number;
    email: string;
    name: string;
    role: string;
    email_verified: number;
    preferences: string;
    is_active: number;
    created_at: string;
    updated_at: string;
    last_login_at: string | null;
  }>(
    db,
    `SELECT id, email, name, role, email_verified, preferences,
            is_active, created_at, updated_at, last_login_at
     FROM users
     WHERE id = ?`,
    [userId]
  );

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    emailVerified: Boolean(user.email_verified),
    preferences: JSON.parse(user.preferences || '{}'),
    isActive: Boolean(user.is_active),
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at),
    lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : null,
  };
}

/**
 * Get user by email (with password hash for verification)
 */
export async function getUserByEmailForAuth(email: string): Promise<UserWithPassword | null> {
  const db = await getDatabase();
  const user = await queryOne<{
    id: number;
    email: string;
    name: string;
    role: string;
    password_hash: string;
    email_verified: number;
    email_verification_token: string | null;
    email_verification_sent_at: string | null;
    password_reset_token: string | null;
    password_reset_expires: string | null;
    preferences: string;
    is_active: number;
    created_at: string;
    updated_at: string;
    last_login_at: string | null;
  }>(
    db,
    `SELECT id, email, name, role, password_hash, email_verified,
            email_verification_token, email_verification_sent_at,
            password_reset_token, password_reset_expires,
            preferences, is_active, created_at, updated_at, last_login_at
     FROM users
     WHERE email = ?`,
    [email.toLowerCase().trim()]
  );

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    passwordHash: user.password_hash,
    emailVerified: Boolean(user.email_verified),
    emailVerificationToken: user.email_verification_token,
    emailVerificationSentAt: user.email_verification_sent_at
      ? new Date(user.email_verification_sent_at)
      : null,
    passwordResetToken: user.password_reset_token,
    passwordResetExpires: user.password_reset_expires
      ? new Date(user.password_reset_expires)
      : null,
    preferences: JSON.parse(user.preferences || '{}'),
    isActive: Boolean(user.is_active),
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at),
    lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : null,
  };
}

/**
 * Check if any users exist
 */
export async function hasUsers(): Promise<boolean> {
  try {
    const db = await getDatabase();
    const result = await queryOne<{ count: number }>(
      db,
      'SELECT COUNT(*) as count FROM users'
    );
    return (result?.count || 0) > 0;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes('no such table')) {
      // Table doesn't exist yet - migrations haven't run or failed
      console.warn('users table does not exist. Migrations may not have completed.');
      return false;
    }
    throw error;
  }
}

/**
 * Login a user
 */
export async function login(credentials: LoginCredentials): Promise<{ user: User; session: Session } | null> {
  const user = await getUserByEmailForAuth(credentials.email);

  if (!user || !user.isActive) {
    return null;
  }

  // Check email verification
  if (!user.emailVerified) {
    throw new Error('Email not verified. Please check your email and verify your account.');
  }

  // Verify password
  const isValidPassword = await verifyPassword(credentials.password, user.passwordHash);
  if (!isValidPassword) {
    return null;
  }

  // Update last login
  const db = await getDatabase();
  await execute(
    db,
    'UPDATE users SET last_login_at = ? WHERE id = ?',
    [new Date().toISOString(), user.id]
  );

  // Create session
  const session = await createSession(user.id);

  // Return user without sensitive data
  const { passwordHash, emailVerificationToken, passwordResetToken, ...safeUser } = user;

  return {
    user: safeUser,
    session,
  };
}

/**
 * Create initial admin user (setup wizard)
 */
export async function createInitialAdmin(data: SetupWizardData): Promise<User> {
  const usersExist = await hasUsers();
  if (usersExist) {
    throw new Error('Users already exist. Cannot create initial admin.');
  }

  return createUser(data.email, data.password, data.name, 'admin');
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await execute(
    db,
    `UPDATE users
     SET email_verified = 1, email_verification_token = NULL
     WHERE email_verification_token = ?`,
    [token]
  );

  return result.changes > 0;
}

/**
 * Generate password reset token
 */
export async function generatePasswordResetToken(email: string): Promise<string | null> {
  const db = await getDatabase();
  const user = await getUserByEmailForAuth(email);

  if (!user || !user.isActive) {
    return null; // Don't reveal if user exists
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await execute(
    db,
    `UPDATE users
     SET password_reset_token = ?, password_reset_expires = ?
     WHERE email = ?`,
    [token, expiresAt.toISOString(), email.toLowerCase().trim()]
  );

  return token;
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  // Validate password
  const validation = validatePassword(newPassword);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid password');
  }

  const db = await getDatabase();
  const now = new Date();

  const user = await queryOne<{ id: number }>(
    db,
    `SELECT id FROM users
     WHERE password_reset_token = ?
     AND password_reset_expires > ?
     AND is_active = 1`,
    [token, now.toISOString()]
  );

  if (!user) {
    return false;
  }

  const passwordHash = await hashPassword(newPassword);

  await execute(
    db,
    `UPDATE users
     SET password_hash = ?,
         password_reset_token = NULL,
         password_reset_expires = NULL,
         updated_at = ?
     WHERE id = ?`,
    [passwordHash, now.toISOString(), user.id]
  );

  // Delete all existing sessions (force re-login)
  await deleteUserSessions(user.id);

  return true;
}

/**
 * Change password for logged-in user
 */
export async function changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
  // Validate new password
  const validation = validatePassword(newPassword);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid password');
  }

  const db = await getDatabase();
  
  // Get current user with password hash
  const user = await getUserByEmailForAuth(
    (await getUserById(userId))?.email || ''
  );

  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValidPassword) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const newPasswordHash = await hashPassword(newPassword);

  // Update password
  await execute(
    db,
    `UPDATE users
     SET password_hash = ?,
         updated_at = ?
     WHERE id = ?`,
    [newPasswordHash, new Date().toISOString(), userId]
  );
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(userId: number, preferences: Record<string, any>): Promise<void> {
  const db = await getDatabase();
  
  await execute(
    db,
    `UPDATE users
     SET preferences = ?,
         updated_at = ?
     WHERE id = ?`,
    [JSON.stringify(preferences), new Date().toISOString(), userId]
  );
}
