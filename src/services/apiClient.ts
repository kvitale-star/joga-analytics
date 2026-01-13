/**
 * API Client for backend communication
 * Replaces direct database calls with HTTP requests to the backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const SESSION_STORAGE_KEY = 'joga_session_id';

/**
 * Get the current session ID from localStorage
 */
function getSessionId(): string | null {
  return localStorage.getItem(SESSION_STORAGE_KEY);
}

/**
 * Set the session ID in localStorage
 */
function setSessionId(sessionId: string): void {
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
}

/**
 * Remove the session ID from localStorage
 */
function removeSessionId(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Make an API request to the backend
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const sessionId = getSessionId();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(sessionId && { 'X-Session-ID': sessionId }),
    ...options.headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
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
 * Session management helpers (exported for use in authService)
 */
export const sessionHelpers = {
  getSessionId,
  setSessionId,
  removeSessionId,
};
