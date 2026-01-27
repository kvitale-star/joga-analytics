import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * CSRF Token Middleware
 * Generates and validates CSRF tokens to prevent cross-site request forgery
 */

// Store CSRF tokens in memory (in production, consider Redis)
const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

// Clean up expired tokens every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expiresAt < now) {
      csrfTokens.delete(key);
    }
  }
}, 60 * 60 * 1000); // 1 hour

/**
 * Generate a CSRF token for a session
 */
export function generateCsrfToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  csrfTokens.set(sessionId, { token, expiresAt });
  
  return token;
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId);
  
  if (!stored) {
    return false;
  }
  
  if (stored.expiresAt < Date.now()) {
    csrfTokens.delete(sessionId);
    return false;
  }
  
  return stored.token === token;
}

/**
 * Middleware to require CSRF token for state-changing requests
 */
export function requireCsrfToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Only require CSRF for state-changing methods
  const stateChangingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  
  if (!stateChangingMethods.includes(req.method)) {
    return next();
  }
  
  // Skip CSRF for certain endpoints (like login, setup, email verification, password reset, logout)
  // These endpoints don't require authentication, or need to work even when session is invalid
  // Logout is included so clients can always clear cookies even after session expires
  const skipCsrfPaths = ['/auth/login', '/auth/setup', '/auth/verify-email', '/auth/reset-password', '/auth/request-password-reset', '/auth/logout'];
  if (skipCsrfPaths.some(path => req.path.includes(path))) {
    return next();
  }
  
  // Also check for common typos (sessionld instead of sessionId)
  const sessionId = (req.cookies?.sessionId as string) || 
                    (req.cookies?.sessionld as string); // Handle typo: sessionld
  const csrfToken = req.headers['x-csrf-token'] as string;
  
  if (!sessionId || !csrfToken) {
    return res.status(403).json({ error: 'CSRF token required' });
  }
  
  if (!validateCsrfToken(sessionId, csrfToken)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  next();
}

/**
 * Middleware to set CSRF token cookie (non-HttpOnly so JS can read it)
 * Only generates a new token if one doesn't exist or is expired
 */
export function setCsrfTokenCookie(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Also check for common typos (sessionld instead of sessionId)
  const sessionId = (req.cookies?.sessionId as string) || 
                    (req.cookies?.sessionld as string) || // Handle typo: sessionld
                    (req.headers['x-session-id'] as string);
  
  if (sessionId) {
    // Check if we already have a valid token for this session
    const stored = csrfTokens.get(sessionId);
    const existingToken = req.cookies?.csrfToken as string;
    
    // Only generate a new token if:
    // 1. We don't have a stored token, OR
    // 2. The stored token is expired, OR
    // 3. The cookie token doesn't match the stored token (token was cleared/reset)
    const needsNewToken = !stored || 
                          stored.expiresAt < Date.now() ||
                          (existingToken && existingToken !== stored.token);
    
    let csrfToken: string;
    if (needsNewToken) {
      csrfToken = generateCsrfToken(sessionId);
    } else {
      csrfToken = stored.token;
    }
    
    const isProduction = process.env.NODE_ENV === 'production';
    // Use 'none' for cross-origin requests (Railway frontend/backend on different domains)
    // 'none' requires 'secure: true' which is set in production
    const sameSite = isProduction ? 'none' : 'strict';
    
    // Set CSRF token in a non-HttpOnly cookie so JavaScript can read it
    res.cookie('csrfToken', csrfToken, {
      httpOnly: false, // Must be readable by JavaScript
      secure: isProduction, // Required for sameSite: 'none' in production
      sameSite: sameSite as 'none' | 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });
    
    // Also set in response header as fallback for cross-origin scenarios
    // Frontend can read this if cookie isn't accessible
    res.setHeader('X-CSRF-Token', csrfToken);
  } else {
    // CRITICAL: Even if there's no session, we should log this for debugging
    // In cross-origin scenarios, cookies might not be sent, so we need to handle this
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      console.warn('⚠️ No sessionId found in request cookies or headers. Cookies:', Object.keys(req.cookies || {}), 'Headers:', req.headers['x-session-id'] ? 'x-session-id present' : 'x-session-id missing');
    }
  }
  
  next();
}
