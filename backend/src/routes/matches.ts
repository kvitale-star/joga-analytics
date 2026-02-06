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
import { computeMatchStats, normalizeFieldNames } from '../services/matchStatsService.js';
import { normalizeOpponentName, opponentNamesMatch, findBestOpponentMatch, calculateOpponentSimilarity } from '../utils/opponentMatching.js';

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
 * Convert date string from MM/DD/YYYY to YYYY-MM-DD format for database queries
 */
function convertDateForQuery(dateStr: string): string {
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Try to parse MM/DD/YYYY format
  const mmddyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const month = mmddyyyy[1].padStart(2, '0');
    const day = mmddyyyy[2].padStart(2, '0');
    const year = mmddyyyy[3];
    return `${year}-${month}-${day}`;
  }
  
  // Try to parse as Date object and convert (use local date methods to avoid timezone shifts)
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    // Use local date methods instead of toISOString to avoid timezone conversion
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Fallback: return as-is (might work for some database formats)
  return dateStr;
}

/**
 * GET /api/matches/find-existing
 * Find existing match by Team ID + Opponent + Date (fuzzy opponent matching)
 * Query params: teamId, opponentName, matchDate (accepts MM/DD/YYYY or YYYY-MM-DD)
 */
router.get('/find-existing', async (req, res) => {
  try {
    const { teamId, opponentName, matchDate } = req.query;
    
    if (!teamId || !opponentName || !matchDate) {
      return res.status(400).json({ 
        error: 'teamId, opponentName, and matchDate are required' 
      });
    }
    
    // Convert date to YYYY-MM-DD format for database query
    const dateForQuery = convertDateForQuery(matchDate as string);
    
    // Get all matches for this team and date
    const matches = await getMatches({
      teamId: parseInt(teamId as string),
      startDate: dateForQuery,
      endDate: dateForQuery,
    });
    
    // Find match with matching opponent (fuzzy - uses similarity threshold)
    // Try exact match first, then fuzzy match
    const normalizedInput = normalizeOpponentName(opponentName as string);
    let existingMatch = matches.find(match => 
      normalizeOpponentName(match.opponentName) === normalizedInput
    );
    
    // If no exact match, try fuzzy matching with 70% similarity threshold
    if (!existingMatch) {
      existingMatch = matches.find(match => 
        opponentNamesMatch(match.opponentName, opponentName as string, 0.7)
      );
    }
    
    if (existingMatch) {
      // Return the full match data for pre-filling
      const fullMatch = await getMatchById(existingMatch.id);
      
      if (!fullMatch) {
        return res.json({ match: null, found: false });
      }
      
      // Coaches/viewers can only view their assigned teams' matches
      if (req.userId && req.userRole && req.userRole !== 'admin') {
        const assignedTeamIds = await getUserTeamAssignments(req.userId);
        if (fullMatch.teamId && !assignedTeamIds.includes(fullMatch.teamId)) {
          return res.status(403).json({ error: 'You can only view matches for your assigned teams' });
        }
      }
      
      return res.json({ match: fullMatch, found: true });
    }
    
    return res.json({ match: null, found: false });
  } catch (error: any) {
    console.error('Error finding existing match:', error);
    return res.status(500).json({ error: error.message || 'Failed to find existing match' });
  }
});

/**
 * GET /api/matches/opponents/suggestions
 * Get opponent name suggestions based on partial input
 * Query params: query (partial opponent name), teamId (optional), limit (default 10)
 */
router.get('/opponents/suggestions', async (req, res) => {
  try {
    const { query: searchQuery, teamId, limit = '10' } = req.query;
    
    if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.trim().length === 0) {
      return res.json({ suggestions: [] });
    }
    
    const limitNum = parseInt(limit as string, 10) || 10;
    const searchTerm = searchQuery.trim();
    
    // Get all matches (optionally filtered by team)
    const filters: any = {};
    if (teamId) {
      filters.teamId = parseInt(teamId as string);
    }
    
    const matches = await getMatches(filters);
    
    // Extract unique opponent names
    const opponentSet = new Set<string>();
    matches.forEach(match => {
      if (match.opponentName && match.opponentName.trim()) {
        opponentSet.add(match.opponentName.trim());
      }
    });
    
    const allOpponents = Array.from(opponentSet);
    
    // Find best matches using fuzzy matching
    const suggestions: Array<{ name: string; similarity: number }> = [];
    
    for (const opponent of allOpponents) {
      const similarity = calculateOpponentSimilarity(searchTerm, opponent);
      if (similarity > 0.3) { // Lower threshold for suggestions (30% similarity)
        suggestions.push({ name: opponent, similarity });
      }
    }
    
    // Sort by similarity (highest first), then alphabetically
    suggestions.sort((a, b) => {
      if (Math.abs(a.similarity - b.similarity) > 0.1) {
        return b.similarity - a.similarity;
      }
      return a.name.localeCompare(b.name);
    });
    
    // Also include exact/prefix matches at the top
    const exactMatches = allOpponents.filter(opp => {
      const normOpp = normalizeOpponentName(opp);
      const normSearch = normalizeOpponentName(searchTerm);
      return normOpp.includes(normSearch) || normSearch.includes(normOpp);
    }).slice(0, limitNum);
    
    // Combine and deduplicate
    const result: string[] = [];
    const seen = new Set<string>();
    
    // Add exact/prefix matches first
    for (const name of exactMatches) {
      if (!seen.has(name)) {
        result.push(name);
        seen.add(name);
      }
    }
    
    // Add fuzzy matches
    for (const { name } of suggestions) {
      if (!seen.has(name) && result.length < limitNum) {
        result.push(name);
        seen.add(name);
      }
    }
    
    return res.json({ suggestions: result });
  } catch (error: any) {
    console.error('Error getting opponent suggestions:', error);
    return res.status(500).json({ error: error.message || 'Failed to get opponent suggestions' });
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
 * POST /api/matches/preview
 * Preview computed stats without saving
 * Requires: Authentication
 */
router.post('/preview', async (req, res) => {
  try {
    const {
      teamId,
      opponentName,
      matchDate,
      competitionType,
      result,
      isHome,
      venue,
      referee,
      notes,
      rawStats,
    } = req.body;

    if (!opponentName || !matchDate) {
      return res.status(400).json({ error: 'Opponent name and match date are required' });
    }

    // Normalize field names from form input
    const normalizedStats = normalizeFieldNames({
      ...rawStats,
      teamId,
      opponentName,
      matchDate,
      competitionType,
      result,
      venue,
      referee,
      notes,
    });

    // Compute all derived metrics
    const computedStats = computeMatchStats(normalizedStats);

    // Combine raw + computed for preview
    const previewStats = {
      ...normalizedStats,
      ...computedStats,
    };

    res.json({
      gameInfo: {
        teamId,
        opponentName,
        matchDate,
        competitionType,
        result,
        isHome,
        venue,
        referee,
        notes,
      },
      rawStats: normalizedStats,
      computedStats,
      allStats: previewStats,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to preview match stats' });
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
      isHome,
      statsJson, // If provided, use as-is (for backward compatibility)
      statsSource,
      statsComputedAt,
      statsManualFields,
      notes,
      venue,
      referee,
      // Raw stats from form (if statsJson not provided)
      rawStats,
    } = req.body;

    if (!opponentName || !matchDate) {
      return res.status(400).json({ error: 'Opponent name and match date are required' });
    }

    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    let finalStatsJson = statsJson;
    let finalStatsComputedAt = statsComputedAt;

    // If rawStats provided instead of statsJson, compute derived metrics
    if (rawStats && !statsJson) {
      // Normalize field names from form input
      const normalizedStats = normalizeFieldNames({
        ...rawStats,
        teamId,
        opponentName,
        matchDate,
        competitionType,
        result,
        venue,
        referee,
        notes,
      });

      // Compute all derived metrics
      const computedStats = computeMatchStats(normalizedStats);

      // Combine raw + computed into final stats
      finalStatsJson = {
        ...normalizedStats,
        ...computedStats,
      };

      // Mark as computed
      finalStatsComputedAt = new Date().toISOString();
    }

    const match = await createMatch({
      teamId,
      opponentName,
      matchDate,
      competitionType,
      result,
      isHome,
      statsJson: finalStatsJson,
      statsSource: statsSource || 'manual',
      statsComputedAt: finalStatsComputedAt,
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
      isHome,
      statsJson,
      statsSource,
      statsComputedAt,
      statsManualFields,
      notes,
      venue,
      referee,
      // Raw stats from form (if statsJson not provided)
      rawStats,
    } = req.body;

    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get existing match to merge stats
    const existingMatch = await getMatchById(matchId);
    
    if (!existingMatch) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    let finalStatsJson = statsJson;

    // If rawStats provided instead of statsJson, compute derived metrics and merge with existing
    if (rawStats && !statsJson) {
      // Normalize field names from form input
      const normalizedStats = normalizeFieldNames({
        ...rawStats,
        teamId,
        opponentName,
        matchDate,
        competitionType,
        result,
        venue,
        referee,
        notes,
      });

      // Merge with existing stats (0s in rawStats mean "don't update" - keep existing value)
      const existingStats = existingMatch.statsJson || {};
      const mergedStats: Record<string, any> = { ...existingStats };
      
      // Only update fields that have non-zero values (0s act as placeholders)
      Object.entries(normalizedStats).forEach(([key, value]) => {
        if (value !== 0 && value !== '' && value !== null && value !== undefined) {
          mergedStats[key] = value;
        }
        // If value is 0, keep existing value (don't update)
      });

      // Normalize merged stats to ensure proper type for computeMatchStats
      const normalizedMergedStats = normalizeFieldNames(mergedStats);
      
      // Compute all derived metrics from merged stats
      const computedStats = computeMatchStats(normalizedMergedStats);

      // Combine merged raw + computed for final stats
      finalStatsJson = {
        ...mergedStats,
        ...computedStats,
      };
    }

    const match = await updateMatch(matchId, {
      teamId,
      opponentName,
      matchDate,
      competitionType,
      result,
      isHome,
      statsJson: finalStatsJson,
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
