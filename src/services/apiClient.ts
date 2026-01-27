/**
 * API Client for backend communication
 * Replaces direct database calls with HTTP requests to the backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Store CSRF token from response headers (fallback for cross-origin)
let csrfTokenFromHeader: string | null = null;

/**
 * Get CSRF token from stored header value or cookie
 * In cross-origin scenarios (Railway), cookies aren't accessible to JavaScript,
 * so we prioritize the header value which is set by the backend on every response
 */
function getCsrfToken(): string | null {
  // Prioritize stored header value (works in cross-origin scenarios)
  if (csrfTokenFromHeader) {
    return csrfTokenFromHeader;
  }
  
  // Fallback to cookie (works in same-origin scenarios like local dev)
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
  
  // For state-changing requests, ALWAYS ensure we have a CSRF token
  // In cross-origin scenarios (Railway), we can't read cookies, so we must fetch from header
  let csrfToken = (needsCsrf && !shouldSkipCsrf) ? getCsrfToken() : null;
  
  // CRITICAL: In cross-origin scenarios (Railway), cookies aren't accessible to JavaScript
  // We MUST fetch the token from the response header via /auth/me
  // Always fetch if we don't have a token, or if we're in production (likely cross-origin)
  const isProduction = import.meta.env.PROD || import.meta.env.VITE_API_URL?.includes('railway');
  const shouldFetchToken = needsCsrf && !shouldSkipCsrf && (!csrfToken || isProduction);
  
  if (shouldFetchToken) {
    try {
      // Make a lightweight GET request to get CSRF token in response header
      // This is the ONLY reliable way to get the token in cross-origin scenarios
      const tokenResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        credentials: 'include',
      });
      
      // Check if request was successful
      if (!tokenResponse.ok) {
        throw new Error(`Failed to get CSRF token: ${tokenResponse.status} ${tokenResponse.statusText}`);
      }
      
      // ALWAYS get token from response header (works in cross-origin)
      const tokenHeader = tokenResponse.headers.get('X-CSRF-Token');
      if (tokenHeader) {
        csrfTokenFromHeader = tokenHeader;
        csrfToken = tokenHeader;
      } else if (!isProduction) {
        // If no header but response is OK, try cookie as fallback (same-origin only, local dev)
        await new Promise(resolve => setTimeout(resolve, 100));
        csrfToken = getCsrfToken();
      } else {
        // In production, if no header, we can't proceed - this is a critical error
        throw new Error('CSRF token not found in response header. This is required for cross-origin requests.');
      }
    } catch (e) {
      // If fetching token fails in production, we MUST fail the request
      // In local dev, try cookie as last resort
      if (isProduction) {
        console.error('❌ CRITICAL: Failed to fetch CSRF token in production:', e);
        throw new Error('Failed to get CSRF token. Please refresh the page and try again.');
      } else {
        console.warn('⚠️ Failed to fetch CSRF token from /auth/me, trying cookie:', e);
        csrfToken = getCsrfToken();
      }
    }
    
    // Final check: if we still don't have a token and we need one, fail
    if (needsCsrf && !shouldSkipCsrf && !csrfToken) {
      throw new Error('CSRF token is required but could not be obtained. Please refresh the page and try again.');
    }
  }
  
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

    // Handle non-JSON responses (this should not happen for our API).
    // Previously we returned `{}` which caused subtle runtime failures (e.g., `matchData.forEach is not a function`).
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const bodyText = await response.text().catch(() => '');
      const snippet = bodyText.slice(0, 200);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} (${snippet})`);
      }
      throw new Error(`Unexpected non-JSON response from API (${snippet})`);
    }

    // ALWAYS store CSRF token from response header (critical for cross-origin scenarios)
    // The backend sets this header on every response, so we can always get a fresh token
    const csrfTokenHeader = response.headers.get('X-CSRF-Token');
    if (csrfTokenHeader) {
      csrfTokenFromHeader = csrfTokenHeader;
      // Update the token if we're making a state-changing request and didn't have one
      if (needsCsrf && !shouldSkipCsrf && !csrfToken) {
        csrfToken = csrfTokenHeader;
      }
    }

    const data = await response.json();

    // Handle errors
    if (!response.ok) {
      // If we got a 403 CSRF error, try to refresh the token and retry once
      if (response.status === 403 && (data.error?.includes('CSRF') || data.error?.includes('csrf'))) {
        // Try to get a fresh token
        try {
          const tokenResponse = await fetch(`${API_BASE_URL}/auth/me`, {
            method: 'GET',
            credentials: 'include',
          });
          const freshToken = tokenResponse.headers.get('X-CSRF-Token') || getCsrfToken();
          if (freshToken) {
            csrfTokenFromHeader = freshToken;
            // Retry the original request with the fresh token
            const retryHeaders: HeadersInit = {
              'Content-Type': 'application/json',
              'X-CSRF-Token': freshToken,
              ...options.headers,
            };
            const retryResponse = await fetch(url, {
              ...options,
              headers: retryHeaders,
              credentials: 'include',
            });
            
            // Store token from retry response header
            const retryTokenHeader = retryResponse.headers.get('X-CSRF-Token');
            if (retryTokenHeader) {
              csrfTokenFromHeader = retryTokenHeader;
            }
            
            // Handle retry response
            const retryContentType = retryResponse.headers.get('content-type') || '';
            if (!retryContentType.includes('application/json')) {
              const retryBodyText = await retryResponse.text().catch(() => '');
              const retrySnippet = retryBodyText.slice(0, 200);
              if (!retryResponse.ok) {
                throw new Error(`HTTP error! status: ${retryResponse.status} (${retrySnippet})`);
              }
              throw new Error(`Unexpected non-JSON response from API (${retrySnippet})`);
            }
            
            const retryData = await retryResponse.json();
            if (!retryResponse.ok) {
              const retryErrorMessage = retryData.error || `HTTP error! status: ${retryResponse.status}`;
              throw new Error(retryErrorMessage);
            }
            
            return retryData;
          }
        } catch (retryError) {
          // If retry fails, fall through to original error
          console.warn('CSRF token retry failed:', retryError);
        }
      }
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
