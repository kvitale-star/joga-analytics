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
    console.log('hasUsers check result:', response);
    return !response.setupRequired;
  } catch (error) {
    console.error('Error checking for users:', error);
    // If API call fails, we can't determine if users exist
    // Return false to show setup wizard (safer than assuming users exist)
    return false;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(_userId: number): Promise<User | null> {
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
    
    if (response && response.user) {
      // Session ID is now in HttpOnly cookie, not in response
      // Create session object for frontend state
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
      
      // Convert date strings to Date objects
      return {
        user: {
          ...response.user,
          createdAt: new Date(response.user.createdAt),
          updatedAt: new Date(response.user.updatedAt),
          lastLoginAt: response.user.lastLoginAt ? new Date(response.user.lastLoginAt) : null,
        },
        session: {
          id: 'cookie-based', // Placeholder - actual ID is in HttpOnly cookie
          userId: response.user.id,
          expiresAt,
          lastActivityAt: new Date(),
          createdAt: new Date(),
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
 * In API mode, session is validated via HttpOnly cookie
 * sessionId parameter is kept for backward compatibility but not used
 */
export async function getSession(_sessionId: string): Promise<Session | null> {
  try {
    // The backend validates the session automatically via HttpOnly cookie
    // So we just need to check if we can get the current user
    const user = await apiGet<User>('/auth/me');
    
    if (user) {
      // Session is valid, return a session object
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
      
      return {
        id: 'cookie-based', // Placeholder - actual ID is in HttpOnly cookie
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
export async function deleteSession(_sessionId: string): Promise<void> {
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
    
    if (response && response.user) {
      // Session ID is now in HttpOnly cookie, not in response body
      // Convert date strings to Date objects and return just the user
      // The session cookie is already set by the backend
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
    console.log('📡 Calling API: POST /auth/reset-password');
    const response = await apiPost<{ success: boolean; error?: string }>('/auth/reset-password', {
      token,
      password: newPassword,
    });
    console.log('📥 API Response:', response);
    if (response.success) {
      console.log('✅ Password reset successful!');
      return true;
    }
    // If there's an error message, throw it so the UI can display it
    if (response.error) {
      console.error('❌ API returned error:', response.error);
      throw new Error(response.error);
    }
    console.warn('⚠️ API returned success=false without error message');
    return false;
  } catch (error) {
    console.error('❌ API call failed:', error);
    // Re-throw the error so the UI can display the actual error message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to reset password');
  }
}

/**
 * Change password for logged-in user
 */
export async function changePassword(
  _userId: number,
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
  _userId: number,
  preferences: Record<string, any>
): Promise<void> {
  try {
    const response = await apiPut<{ success?: boolean }>('/preferences', { preferences });
    // Backend returns { success: true } on success
    // If success is explicitly false, that's an error
    if (response && response.success === false) {
      throw new Error('Failed to update preferences: Server returned error');
    }
    // If response exists (even without success field), consider it successful
    // The apiClient already throws on HTTP errors, so if we get here, it's likely successful
  } catch (error) {
    // Re-throw with more context if it's an API error
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to update preferences: Unknown error');
  }
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
export async function hashPassword(_password: string): Promise<string> {
  throw new Error('hashPassword should not be called in API mode - backend handles password hashing');
}

export async function verifyPassword(_password: string, _hash: string): Promise<boolean> {
  throw new Error('verifyPassword should not be called in API mode - backend handles password verification');
}

export async function createSession(_userId: number): Promise<Session> {
  throw new Error('createSession should not be called directly in API mode - use login() instead');
}

export async function deleteUserSessions(_userId: number): Promise<void> {
  // Not needed in API mode - backend handles this
  return Promise.resolve();
}

export async function cleanupExpiredSessions(): Promise<void> {
  // Not needed in API mode - backend handles this
}

export async function resetAuthDatabase(): Promise<void> {
  throw new Error('resetAuthDatabase not available in API mode');
}

export async function createUser(
  _email: string,
  _password: string,
  _name: string,
  _role: UserRole
): Promise<User> {
  throw new Error('createUser not available in API mode - use admin endpoints');
}

export async function getUserByEmailForAuth(_email: string): Promise<any> {
  throw new Error('getUserByEmailForAuth not available in API mode - backend handles authentication');
}
