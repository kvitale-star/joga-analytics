import { getDatabase, execute, queryAll } from '../db/database';
import { User, UserRole } from '../types/auth';
import { hashPassword } from './authService';
import { validatePassword } from '../utils/passwordValidation';

/**
 * Get all users
 */
export async function getAllUsers(): Promise<User[]> {
  const db = await getDatabase();
  const users = await queryAll<{
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
     ORDER BY created_at DESC`
  );

  return users.map(user => ({
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
  }));
}

/**
 * Update user (admin only)
 */
export async function updateUser(
  userId: number,
  updates: {
    name?: string;
    email?: string;
    role?: UserRole;
    isActive?: boolean;
  }
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }

  if (updates.email !== undefined) {
    fields.push('email = ?');
    values.push(updates.email.toLowerCase().trim());
  }

  if (updates.role !== undefined) {
    fields.push('role = ?');
    values.push(updates.role);
  }

  if (updates.isActive !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.isActive ? 1 : 0);
  }

  if (fields.length === 0) {
    return; // No updates
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(userId);

  await execute(
    db,
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

/**
 * Delete user (admin only)
 */
export async function deleteUser(userId: number): Promise<void> {
  const db = await getDatabase();
  
  // Delete user (cascade will handle sessions and user_teams)
  await execute(db, 'DELETE FROM users WHERE id = ?', [userId]);
}

/**
 * Create user (admin only)
 */
export async function createUserByAdmin(
  email: string,
  password: string | null,
  name: string,
  role: UserRole
): Promise<User> {
  // Browser mode doesn't support email sending, so password is required
  if (!password) {
    throw new Error('Password is required in browser mode (email service not available)');
  }
  const { createUser } = await import('./authService');
  return createUser(email, password, name, role);
}

/**
 * Reset user password (admin only)
 */
export async function resetUserPassword(userId: number, newPassword: string): Promise<void> {
  // Validate password
  const validation = validatePassword(newPassword);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid password');
  }

  const db = await getDatabase();
  const passwordHash = await hashPassword(newPassword);
  const now = new Date().toISOString();

  await execute(
    db,
    `UPDATE users
     SET password_hash = ?,
         updated_at = ?
     WHERE id = ?`,
    [passwordHash, now, userId]
  );

  // Delete all existing sessions (force re-login)
  const { deleteUserSessions } = await import('./authService');
  await deleteUserSessions(userId);
}
