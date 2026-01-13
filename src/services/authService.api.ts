/**
 * API-based authentication service
 * Uses backend API instead of direct database access
 */

import { apiGet, apiPost, apiPut, sessionHelpers } from './apiClient';
import { User, UserRole, LoginCredentials, Session, SetupWizardData } from '../types/auth';

/**
 * Check if any users exist
 */
export async function hasUsers(): Promise<boolean> {
  try {
    const response = await apiGet<{ setupRequired: boolean }>('/auth/setup-required');
    return !response.setupRequired;
  } catch (error) {
    console.error('Error checking for users:', error);
    return false;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number): Promise<User | null> {
  try {
    const userData = await apiGet<User>('/auth/me');
    // Convert date strings to Date objects
    return {
      ...userData,
      createdAt: new Date(userData.createdAt),
      updatedAt: new Date(userData.updatedAt),
      lastLoginAt: userData.lastLoginAt ? new Date(userData.lastLoginAt) : null,
    };
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

/**
 * Login a user
 */
export async function login(credentials: LoginCredentials): Promise<{ user: User; session: Session } | null> {
  try {
    const response = await apiPost<{ user: User; session: Session }>('/auth/login', credentials);
    
    if (response && response.user && response.session) {
      // Store session ID
      sessionHelpers.setSessionId(response.session.id);
      
      // Convert date strings to Date objects
      return {
        user: {
          ...response.user,
          createdAt: new Date(response.user.createdAt),
          updatedAt: new Date(response.user.updatedAt),
          lastLoginAt: response.user.lastLoginAt ? new Date(response.user.lastLoginAt) : null,
        },
        session: {
          ...response.session,
          expiresAt: new Date(response.session.expiresAt),
          lastActivityAt: new Date(response.session.lastActivityAt),
          createdAt: new Date(response.session.createdAt),
        },
      };
    }
    
    return null;
  } catch (error: any) {
    if (error.message?.includes('Invalid email or password')) {
      return null;
    }
    throw error;
  }
}

/**
 * Get session by ID and validate it
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  try {
    // The backend validates the session automatically via the X-Session-ID header
    // So we just need to check if we can get the current user
    const user = await apiGet<User>('/auth/me');
    
    if (user) {
      // Session is valid, return a session object
      // Note: We don't get full session details from /auth/me, so we construct it
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
      
      return {
        id: sessionId,
        userId: user.id,
        expiresAt,
        lastActivityAt: new Date(),
        createdAt: new Date(),
      };
    }
    
    return null;
  } catch (error) {
    // Session invalid or expired
    return null;
  }
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    await apiPost('/auth/logout', {});
    sessionHelpers.removeSessionId();
  } catch (error) {
    // Even if API call fails, remove session locally
    sessionHelpers.removeSessionId();
    console.error('Error deleting session:', error);
  }
}

/**
 * Create initial admin user (setup wizard)
 */
export async function createInitialAdmin(data: SetupWizardData): Promise<User> {
  try {
    const response = await apiPost<{ user: User; session: Session }>('/auth/setup', data);
    
    if (response && response.user && response.session) {
      // Store session ID
      sessionHelpers.setSessionId(response.session.id);
      
      // Convert date strings to Date objects
      return {
        ...response.user,
        createdAt: new Date(response.user.createdAt),
        updatedAt: new Date(response.user.updatedAt),
        lastLoginAt: response.user.lastLoginAt ? new Date(response.user.lastLoginAt) : null,
      };
    }
    
    throw new Error('Failed to create admin user');
  } catch (error: any) {
    if (error.message?.includes('already exist')) {
      throw new Error('Users already exist. Cannot create initial admin.');
    }
    throw error;
  }
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<boolean> {
  try {
    const response = await apiPost<{ success: boolean }>('/auth/verify-email', { token });
    return response.success;
  } catch (error) {
    return false;
  }
}

/**
 * Generate password reset token
 */
export async function generatePasswordResetToken(email: string): Promise<string | null> {
  try {
    await apiPost('/auth/request-password-reset', { email });
    // Backend doesn't return the token (security), but we return a placeholder
    // The actual token is sent via email
    return 'token-sent'; // Indicates email was sent
  } catch (error) {
    // Don't reveal if user exists
    return null;
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  try {
    const response = await apiPost<{ success: boolean }>('/auth/reset-password', {
      token,
      password: newPassword,
    });
    return response.success;
  } catch (error) {
    return false;
  }
}

/**
 * Change password for logged-in user
 */
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await apiPost('/auth/change-password', {
    currentPassword,
    newPassword,
  });
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: number,
  preferences: Record<string, any>
): Promise<void> {
  await apiPut('/preferences', { preferences });
}

// Helper functions that don't need API (client-side only)
export function generateToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function generateSessionId(): string {
  return generateToken(32);
}

// Functions not needed in API version (handled by backend)
export async function hashPassword(password: string): Promise<string> {
  throw new Error('hashPassword should not be called in API mode - backend handles password hashing');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  throw new Error('verifyPassword should not be called in API mode - backend handles password verification');
}

export async function createSession(userId: number): Promise<Session> {
  throw new Error('createSession should not be called directly in API mode - use login() instead');
}

export async function deleteUserSessions(userId: number): Promise<void> {
  // Not needed in API mode - backend handles this
}

export async function cleanupExpiredSessions(): Promise<void> {
  // Not needed in API mode - backend handles this
}

export async function resetAuthDatabase(): Promise<void> {
  throw new Error('resetAuthDatabase not available in API mode');
}

export async function createUser(
  email: string,
  password: string,
  name: string,
  role: UserRole
): Promise<User> {
  throw new Error('createUser not available in API mode - use admin endpoints');
}

export async function getUserByEmailForAuth(email: string): Promise<any> {
  throw new Error('getUserByEmailForAuth not available in API mode - backend handles authentication');
}
