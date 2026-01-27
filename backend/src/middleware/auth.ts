import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getSession, getUserById } from '../services/authService.js';
import { getUserTeamAssignments } from '../services/teamService.js';

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
 * Authenticate using session token (from HttpOnly cookie)
 * Falls back to header for backward compatibility during migration
 */
export async function authenticateSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Try cookie first (new approach), then header (backward compatibility)
  const sessionId = (req.cookies?.sessionId as string) || 
                    (req.headers['x-session-id'] as string);

  if (!sessionId) {
    // Debug: Log what cookies we received
    const cookieNames = Object.keys(req.cookies || {});
    const cookieHeader = req.headers['cookie'] || '';
    console.warn('⚠️ No sessionId found in request. Available cookies:', cookieNames);
    console.warn('⚠️ Cookie header (first 200 chars):', cookieHeader.substring(0, 200));
    console.warn('⚠️ Request origin:', req.headers['origin']);
    console.warn('⚠️ Request referer:', req.headers['referer']);
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

/**
 * Check if user can modify a match
 * - Admins can modify any match
 * - Coaches can modify matches for their assigned teams
 * - Viewers cannot modify matches
 */
export async function canModifyMatch(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.userId || !req.userRole) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Admins can modify any match
  if (req.userRole === 'admin') {
    return next();
  }

  // Viewers cannot modify matches
  if (req.userRole === 'viewer') {
    return res.status(403).json({ error: 'Viewers cannot modify matches' });
  }

  // For coaches, check if they have access to the match's team
  // Get teamId from request body (for create) or from match ID (for update/delete/events)
  let teamId: number | null | undefined;

  // Check if this is creating a new match (POST to /) vs modifying existing match (PUT/DELETE /:id or POST /:id/events)
  const isCreatingNewMatch = req.method === 'POST' && !req.params.id;
  
  if (isCreatingNewMatch) {
    // Creating a new match - check teamId in body
    teamId = req.body.teamId;
  } else {
    // Updating, deleting, or creating events - need to get match first to check its teamId
    // Match ID is in params.id (for PUT/DELETE /:id) or params.id (for POST /:id/events)
    const matchId = parseInt(req.params.id);
    if (isNaN(matchId)) {
      return res.status(400).json({ error: 'Invalid match ID' });
    }

    try {
      const { getMatchById } = await import('../services/matchService.js');
      const match = await getMatchById(matchId);
      
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      teamId = match.teamId;
    } catch (error) {
      return res.status(500).json({ error: 'Failed to verify match access' });
    }
  }

  // If no teamId specified, allow (matches without teams can be modified by coaches)
  if (!teamId) {
    return next();
  }

  // Check if coach has access to this team
  try {
    const userTeamIds = await getUserTeamAssignments(req.userId);
    
    if (!userTeamIds.includes(teamId)) {
      return res.status(403).json({ 
        error: 'You can only modify matches for your assigned teams' 
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to verify team access' });
  }
}
