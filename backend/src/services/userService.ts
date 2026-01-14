import { db } from '../db/database.js';
import { hashPassword } from './authService.js';
import { validatePassword } from '../utils/passwordValidation.js';

/**
 * Get all users
 */
export async function getAllUsers() {
  const users = await db
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
    .orderBy('created_at', 'desc')
    .execute();

  return users.map(user => ({
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
    role?: 'admin' | 'coach' | 'viewer';
    isActive?: boolean;
  }
) {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.email !== undefined) updateData.email = updates.email.toLowerCase().trim();
  if (updates.role !== undefined) updateData.role = updates.role;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive ? 1 : 0;

  await db
    .updateTable('users')
    .set(updateData)
    .where('id', '=', userId)
    .execute();
}

/**
 * Delete user (admin only)
 */
export async function deleteUser(userId: number): Promise<void> {
  await db
    .deleteFrom('users')
    .where('id', '=', userId)
    .execute();
}

/**
 * Create user (admin only)
 * @param password - Optional. If not provided, user will receive email to set password
 */
export async function createUserByAdmin(
  email: string,
  password: string | null,
  name: string,
  role: 'admin' | 'coach' | 'viewer'
) {
  const { createUser } = await import('./authService.js');
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

  const passwordHash = await hashPassword(newPassword);
  const now = new Date().toISOString();

  await db
    .updateTable('users')
    .set({
      password_hash: passwordHash,
      updated_at: now,
    })
    .where('id', '=', userId)
    .execute();

  // Delete all existing sessions (force re-login)
  await db
    .deleteFrom('sessions')
    .where('user_id', '=', userId)
    .execute();
}
