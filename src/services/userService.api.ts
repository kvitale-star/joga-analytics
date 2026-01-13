/**
 * API-based user service
 * Uses backend API instead of direct database access
 */

import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import { User, UserRole } from '../types/auth';
import { validatePassword } from '../utils/passwordValidation';

/**
 * Get all users
 */
export async function getAllUsers(): Promise<User[]> {
  const users = await apiGet<User[]>('/users');
  
  // Convert date strings to Date objects
  return users.map(user => ({
    ...user,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
    lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
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
  await apiPut(`/users/${userId}`, updates);
}

/**
 * Delete user (admin only)
 */
export async function deleteUser(userId: number): Promise<void> {
  await apiDelete(`/users/${userId}`);
}

/**
 * Create user (admin only)
 */
export async function createUserByAdmin(
  email: string,
  password: string,
  name: string,
  role: UserRole
): Promise<User> {
  // Validate password on frontend (backend also validates)
  const validation = validatePassword(password);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid password');
  }

  const user = await apiPost<User>('/users', {
    email,
    password,
    name,
    role,
  });

  // Convert date strings to Date objects
  return {
    ...user,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
    lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
  };
}

/**
 * Reset user password (admin only)
 */
export async function resetUserPassword(userId: number, newPassword: string): Promise<void> {
  // Validate password on frontend (backend also validates)
  const validation = validatePassword(newPassword);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid password');
  }

  await apiPost(`/users/${userId}/reset-password`, { password: newPassword });
}
