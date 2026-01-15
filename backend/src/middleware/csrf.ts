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
  
  // Skip CSRF for certain endpoints (like login, setup, email verification, password reset)
  // These endpoints don't require authentication, so CSRF is less critical
  const skipCsrfPaths = ['/auth/login', '/auth/setup', '/auth/verify-email', '/auth/reset-password', '/auth/request-password-reset'];
  if (skipCsrfPaths.some(path => req.path.includes(path))) {
    return next();
  }
  
  const sessionId = req.cookies?.sessionId as string;
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
 */
export function setCsrfTokenCookie(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const sessionId = req.cookies?.sessionId as string;
  
  if (sessionId) {
    const csrfToken = generateCsrfToken(sessionId);
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Set CSRF token in a non-HttpOnly cookie so JavaScript can read it
    res.cookie('csrfToken', csrfToken, {
      httpOnly: false, // Must be readable by JavaScript
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });
  }
  
  next();
}
