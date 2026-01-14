import { db } from '../db/database.js';
import type { UsersTable } from '../db/schema.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { validatePassword } from '../utils/passwordValidation.js';

const SALT_ROUNDS = 12;
const SESSION_DURATION_DAYS = 7;
const SESSION_ID_LENGTH = 32;

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a session ID
 */
export function generateSessionId(): string {
  return generateToken(SESSION_ID_LENGTH);
}

/**
 * Get user by ID (clean with Kysely!)
 */
export async function getUserById(userId: number) {
  const user = await db
    .selectFrom('users')
    .select([
      'id',
      'email',
      'name',
      'role',
      'email_verified',
      'preferences',
      'is_active',
      'created_at',
      'updated_at',
      'last_login_at',
    ])
    .where('id', '=', userId)
    .executeTakeFirst();

  if (!user) return null;

  // Map database row to your app's User type
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
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
export async function getUserByEmailForAuth(email: string) {
  const user = await db
    .selectFrom('users')
    .selectAll()
    .where('email', '=', email.toLowerCase().trim())
    .executeTakeFirst();

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
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
 * Create a new user
 * @param password - Optional. If not provided, a password setup token will be generated and sent via email
 */
export async function createUser(
  email: string,
  password: string | null,
  name: string,
  role: 'admin' | 'coach' | 'viewer'
) {
  const emailVerificationToken = generateToken();
  const passwordSetupToken = password ? null : generateToken();
  const now = new Date().toISOString();
  
  // If password is provided, validate and hash it
  // If not provided, we'll use a placeholder hash (user must set password via email link)
  let passwordHash: string;
  if (password) {
    const validation = validatePassword(password);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid password');
    }
    passwordHash = await hashPassword(password);
  } else {
    // Generate a random hash that can never be matched (user must set password via email)
    // This ensures the user cannot login until they set a password
    passwordHash = await hashPassword(generateToken() + Date.now().toString());
  }

  // Set password reset token and expiry if password not provided (for password setup)
  const passwordResetExpires = passwordSetupToken 
    ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    : null;

  const result = await db
    .insertInto('users')
    .values({
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      name,
      role,
      email_verified: role === 'admin' ? 1 : 0,
      email_verification_token: emailVerificationToken,
      email_verification_sent_at: role === 'admin' ? null : now,
      password_reset_token: passwordSetupToken,
      password_reset_expires: passwordResetExpires,
      preferences: JSON.stringify({}),
      is_active: 1,
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  const user = await getUserById(result.id);
  
  // Send appropriate email based on whether password was provided
  if (user) {
    const { sendVerificationEmail, sendPasswordSetupEmail } = await import('./emailService.js');
    
    if (passwordSetupToken) {
      // No password provided - send password setup email (which also verifies email)
      sendPasswordSetupEmail(user.email, passwordSetupToken, user.name).catch(err => {
        console.error('Failed to send password setup email:', err);
        // Don't throw - user creation succeeded, email is optional
      });
    } else if (role !== 'admin' && emailVerificationToken) {
      // Password provided - send verification email only
      sendVerificationEmail(user.email, emailVerificationToken).catch(err => {
        console.error('Failed to send verification email:', err);
        // Don't throw - user creation succeeded, email is optional
      });
    }
  }

  return user;
}

/**
 * Check if any users exist
 */
export async function hasUsers(): Promise<boolean> {
  const result = await db
    .selectFrom('users')
    .select(db.fn.count('id').as('count'))
    .executeTakeFirst();

  return ((result?.count as number) || 0) > 0;
}

/**
 * Login a user
 */
export async function login(email: string, password: string) {
  const user = await getUserByEmailForAuth(email);

  if (!user || !user.isActive) {
    return null;
  }

  if (!user.emailVerified) {
    throw new Error('Email not verified. Please check your email and verify your account.');
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    return null;
  }

  // Update last login
  await db
    .updateTable('users')
    .set({ last_login_at: new Date().toISOString() })
    .where('id', '=', user.id)
    .execute();

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
 * Create a new session (7 days from now)
 */
export async function createSession(userId: number) {
  const sessionId = generateSessionId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await db
    .insertInto('sessions')
    .values({
      id: sessionId,
      user_id: userId,
      expires_at: expiresAt.toISOString(),
      last_activity_at: now.toISOString(),
    })
    .execute();

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
export async function getSession(sessionId: string) {
  const now = new Date().toISOString();

  const session = await db
    .selectFrom('sessions')
    .selectAll()
    .where('id', '=', sessionId)
    .where('expires_at', '>', now)
    .executeTakeFirst();

  if (!session) return null;

  // Update last activity
  await db
    .updateTable('sessions')
    .set({ last_activity_at: now })
    .where('id', '=', sessionId)
    .execute();

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
  await db
    .deleteFrom('sessions')
    .where('id', '=', sessionId)
    .execute();
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(userId: number): Promise<void> {
  await db
    .deleteFrom('sessions')
    .where('user_id', '=', userId)
    .execute();
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<void> {
  const now = new Date().toISOString();
  await db
    .deleteFrom('sessions')
    .where('expires_at', '<=', now)
    .execute();
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<boolean> {
  const result = await db
    .updateTable('users')
    .set({
      email_verified: 1,
      email_verification_token: null,
    })
    .where('email_verification_token', '=', token)
    .execute();

  return result.length > 0;
}

/**
 * Generate password reset token
 */
export async function generatePasswordResetToken(email: string): Promise<string | null> {
  const user = await db
    .selectFrom('users')
    .select('id')
    .where('email', '=', email.toLowerCase().trim())
    .where('is_active', '=', 1)
    .executeTakeFirst();

  if (!user) return null; // Don't reveal if user exists

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db
    .updateTable('users')
    .set({
      password_reset_token: token,
      password_reset_expires: expiresAt.toISOString(),
    })
    .where('id', '=', user.id)
    .execute();

  return token;
}

/**
 * Reset password with token
 * Also verifies email if it hasn't been verified yet (for new users setting initial password)
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  // Validate password
  const validation = validatePassword(newPassword);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid password');
  }

  const now = new Date().toISOString();

  // Trim token to handle any whitespace issues
  const trimmedToken = token.trim();
  
  const user = await db
    .selectFrom('users')
    .select(['id', 'email_verified', 'password_reset_token', 'password_reset_expires'])
    .where('password_reset_token', '=', trimmedToken)
    .where('password_reset_expires', '>', now)
    .where('is_active', '=', 1)
    .executeTakeFirst();

  if (!user) {
    console.error('Password reset failed:', {
      tokenLength: trimmedToken.length,
      tokenPreview: trimmedToken.substring(0, 10) + '...',
      now,
      reason: 'Token not found or expired'
    });
    return false;
  }

  const passwordHash = await hashPassword(newPassword);

  // If email hasn't been verified yet, verify it when setting password
  // This handles the case where admin creates user and they set password via email link
  await db
    .updateTable('users')
    .set({
      password_hash: passwordHash,
      password_reset_token: null,
      password_reset_expires: null,
      email_verified: user.email_verified ? 1 : 1, // Always verify email when setting password
      email_verification_token: null, // Clear verification token if it exists
      updated_at: now,
    })
    .where('id', '=', user.id)
    .execute();

  // Delete all existing sessions (force re-login)
  await deleteUserSessions(user.id);

  return true;
}

/**
 * Change password for logged-in user
 */
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  // Validate new password
  const validation = validatePassword(newPassword);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid password');
  }

  const user = await db
    .selectFrom('users')
    .select('password_hash')
    .where('id', '=', userId)
    .executeTakeFirst();

  if (!user) {
    throw new Error('User not found');
  }

  const isValidPassword = await verifyPassword(currentPassword, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Current password is incorrect');
  }

  const newPasswordHash = await hashPassword(newPassword);

  await db
    .updateTable('users')
    .set({
      password_hash: newPasswordHash,
      updated_at: new Date().toISOString(),
    })
    .where('id', '=', userId)
    .execute();
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: number,
  preferences: Record<string, any>
): Promise<void> {
  await db
    .updateTable('users')
    .set({
      preferences: JSON.stringify(preferences),
      updated_at: new Date().toISOString(),
    })
    .where('id', '=', userId)
    .execute();
}

/**
 * Create initial admin user (setup wizard)
 */
export async function createInitialAdmin(data: {
  email: string;
  password: string;
  name: string;
}) {
  const usersExist = await hasUsers();
  if (usersExist) {
    throw new Error('Users already exist. Cannot create initial admin.');
  }

  return createUser(data.email, data.password, data.name, 'admin');
}
