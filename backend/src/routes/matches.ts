import express from 'express';
import {
  getMatches,
  getMatchById,
  createMatch,
  updateMatch,
  deleteMatch,
  getMatchEvents,
  createGameEvent,
} from '../services/matchService.js';
import { authenticateSession, canModifyMatch } from '../middleware/auth.js';
import { getUserTeamAssignments } from '../services/teamService.js';

const router = express.Router();

// All match routes require authentication
router.use(authenticateSession);

/**
 * GET /api/matches
 * Get all matches with optional filters
 * Query params: teamId, opponentName, startDate, endDate, competitionType
 */
router.get('/', async (req, res) => {
  try {
    const filters: any = {};
    
    if (req.query.teamId) {
      filters.teamId = parseInt(req.query.teamId as string);
    }
    if (req.query.opponentName) {
      filters.opponentName = req.query.opponentName as string;
    }
    if (req.query.startDate) {
      filters.startDate = req.query.startDate as string;
    }
    if (req.query.endDate) {
      filters.endDate = req.query.endDate as string;
    }
    if (req.query.competitionType) {
      filters.competitionType = req.query.competitionType as string;
    }

    // Role-based visibility:
    // - Admin: can view all matches
    // - Coach: can view only matches for assigned teams
    // - Viewer: (not used in UI yet) keep same as coach for safety (no access to other teams)
    if (req.userId && req.userRole && req.userRole !== 'admin') {
      const assignedTeamIds = await getUserTeamAssignments(req.userId);

      // If an explicit teamId is requested, enforce it is assigned
      if (filters.teamId && !assignedTeamIds.includes(filters.teamId)) {
        return res.status(403).json({ error: 'You can only view matches for your assigned teams' });
      }

      // Otherwise, scope to assigned teams
      if (!filters.teamId) {
        filters.teamIds = assignedTeamIds;
      }
    }

    const matches = await getMatches(Object.keys(filters).length > 0 ? filters : undefined);
    res.json(matches);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get matches' });
  }
});

/**
 * GET /api/matches/:id
 * Get a specific match by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const match = await getMatchById(matchId);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Coaches/viewers can only view their assigned teams' matches
    if (req.userId && req.userRole && req.userRole !== 'admin') {
      const assignedTeamIds = await getUserTeamAssignments(req.userId);
      if (match.teamId && !assignedTeamIds.includes(match.teamId)) {
        return res.status(403).json({ error: 'You can only view matches for your assigned teams' });
      }
    }

    res.json(match);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get match' });
  }
});

/**
 * POST /api/matches
 * Create a new match
 * Requires: Admin (any team) or Coach (assigned teams only)
 */
router.post('/', canModifyMatch, async (req, res) => {
  try {
    const {
      teamId,
      opponentName,
      matchDate,
      competitionType,
      result,
      statsJson,
      statsSource,
      statsComputedAt,
      statsManualFields,
      notes,
      venue,
      referee,
    } = req.body;

    if (!opponentName || !matchDate) {
      return res.status(400).json({ error: 'Opponent name and match date are required' });
    }

    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const match = await createMatch({
      teamId,
      opponentName,
      matchDate,
      competitionType,
      result,
      statsJson,
      statsSource,
      statsComputedAt,
      statsManualFields,
      notes,
      venue,
      referee,
      createdBy: req.userId,
    });

    res.status(201).json(match);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create match' });
  }
});

/**
 * PUT /api/matches/:id
 * Update a match
 * Requires: Admin (any team) or Coach (assigned teams only)
 */
router.put('/:id', canModifyMatch, async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const {
      teamId,
      opponentName,
      matchDate,
      competitionType,
      result,
      statsJson,
      statsSource,
      statsComputedAt,
      statsManualFields,
      notes,
      venue,
      referee,
    } = req.body;

    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const match = await updateMatch(matchId, {
      teamId,
      opponentName,
      matchDate,
      competitionType,
      result,
      statsJson,
      statsSource,
      statsComputedAt,
      statsManualFields,
      notes,
      venue,
      referee,
      lastModifiedBy: req.userId,
    });

    res.json(match);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update match' });
  }
});

/**
 * DELETE /api/matches/:id
 * Delete a match
 * Requires: Admin (any team) or Coach (assigned teams only)
 */
router.delete('/:id', canModifyMatch, async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    await deleteMatch(matchId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete match' });
  }
});

/**
 * GET /api/matches/:id/events
 * Get all game events for a match
 */
router.get('/:id/events', async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);

    // Enforce visibility via match access
    const match = await getMatchById(matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    if (req.userId && req.userRole && req.userRole !== 'admin') {
      const assignedTeamIds = await getUserTeamAssignments(req.userId);
      if (match.teamId && !assignedTeamIds.includes(match.teamId)) {
        return res.status(403).json({ error: 'You can only view matches for your assigned teams' });
      }
    }

    const events = await getMatchEvents(matchId);
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get match events' });
  }
});

/**
 * POST /api/matches/:id/events
 * Create a game event for a match
 * Requires: Admin (any team) or Coach (assigned teams only)
 */
router.post('/:id/events', canModifyMatch, async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const {
      eventType,
      eventCategory,
      timestamp,
      period,
      minute,
      second,
      fieldPosition,
      xCoordinate,
      yCoordinate,
      eventData,
      isJogaTeam,
      playerName,
      notes,
      tags,
    } = req.body;

    if (!eventType) {
      return res.status(400).json({ error: 'Event type is required' });
    }

    const event = await createGameEvent({
      matchId,
      eventType,
      eventCategory,
      timestamp,
      period,
      minute,
      second,
      fieldPosition,
      xCoordinate,
      yCoordinate,
      eventData,
      isJogaTeam,
      playerName,
      notes,
      tags,
    });

    res.status(201).json(event);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create game event' });
  }
});

export default router;
