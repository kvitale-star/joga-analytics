import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getSession, getUserById } from '../services/authService.js';

// Extend Express Request type to include user info
declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userRole?: 'admin' | 'coach' | 'viewer';
    }
  }
}

/**
 * Authenticate using session token (from localStorage)
 */
export async function authenticateSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const sessionId = req.headers['x-session-id'] as string;

  if (!sessionId) {
    return res.status(401).json({ error: 'No session provided' });
  }

  try {
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.userId = session.userId;
    
    // Get user role for authorization checks
    const user = await getUserById(session.userId);
    if (user) {
      req.userRole = user.role;
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Authenticate using JWT token (alternative approach)
 */
export function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  });
}

/**
 * Require admin role
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
