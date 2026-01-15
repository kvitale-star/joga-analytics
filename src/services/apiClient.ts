/**
 * API Client for backend communication
 * Replaces direct database calls with HTTP requests to the backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Get CSRF token from cookie (non-HttpOnly cookie)
 */
function getCsrfToken(): string | null {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrfToken') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Make an API request to the backend
 * Uses HttpOnly cookies for session management (more secure than localStorage)
 * Includes CSRF token for state-changing requests
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = options.method || 'GET';
  const stateChangingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  const needsCsrf = stateChangingMethods.includes(method);
  
  // Skip CSRF for certain endpoints that don't require it
  const skipCsrfPaths = ['/auth/login', '/auth/setup', '/auth/verify-email', '/auth/reset-password'];
  const shouldSkipCsrf = skipCsrfPaths.some(path => endpoint.includes(path));
  
  const csrfToken = (needsCsrf && !shouldSkipCsrf) ? getCsrfToken() : null;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
    ...options.headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Required to send/receive cookies
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return {} as T;
    }

    const data = await response.json();

    // Handle errors
    if (!response.ok) {
      const errorMessage = data.error || `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    // Network errors or other fetch errors
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error: Failed to connect to backend API');
  }
}

/**
 * GET request
 */
export async function apiGet<T = any>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
export async function apiPost<T = any>(endpoint: string, body?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request
 */
export async function apiPut<T = any>(endpoint: string, body?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request
 */
export async function apiDelete<T = any>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'DELETE' });
}

/**
 * Session management helpers (no longer needed - using HttpOnly cookies)
 * Kept for backward compatibility but functions are no-ops
 */
export const sessionHelpers = {
  getSessionId: () => null, // Cookies are handled automatically
  setSessionId: () => {}, // Cookies are set by backend
  removeSessionId: () => {}, // Cookies are cleared by backend on logout
};
