import express from 'express';
import { authenticateSession } from '../middleware/auth.js';
import { getUserTeamAssignments, getAllTeams } from '../services/teamService.js';
import { generateInsightsForMatch, getActiveInsights } from '../services/insightsService.js';
import { db } from '../db/database.js';

const router = express.Router();

// All insight routes require authentication
router.use(authenticateSession);

/**
 * GET /api/insights
 * Get insights for the authenticated coach's teams
 * Query params: teamId (optional, filter by specific team)
 */
router.get('/', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { teamId } = req.query;
    const userId = req.userId;

    // Admins have access to all teams; coaches use their assignments
    let userTeamIds: number[];
    if (req.userRole === 'admin') {
      const teams = await getAllTeams();
      userTeamIds = teams.map((t) => t.id);
    } else {
      userTeamIds = await getUserTeamAssignments(userId);
    }

    if (userTeamIds.length === 0) {
      return res.json([]);
    }

    // If teamId specified, verify user has access
    if (teamId) {
      const teamIdNum = parseInt(String(teamId));
      if (!userTeamIds.includes(teamIdNum)) {
        return res.status(403).json({ error: 'Access denied to this team' });
      }

      // Get insights for specific team
      const insights = await getActiveInsights(teamIdNum);
      return res.json(insights);
    }

    // Get insights for all user's teams
    const allInsights = await Promise.all(
      userTeamIds.map((tid) => getActiveInsights(tid))
    );

    // Flatten and sort by severity, then date
    const flattened = allInsights.flat().sort((a, b) => {
      if (b.severity !== a.severity) {
        return b.severity - a.severity;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    res.json(flattened);
  } catch (error: any) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch insights' });
  }
});

/**
 * GET /api/insights/team/:teamId
 * Get insights for a specific team
 */
router.get('/team/:teamId', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const teamId = parseInt(req.params.teamId);

    // Admins have access to all teams
    if (req.userRole !== 'admin') {
      const userTeamIds = await getUserTeamAssignments(req.userId!);
      if (!userTeamIds.includes(teamId)) {
        return res.status(403).json({ error: 'Access denied to this team' });
      }
    }

    const insights = await getActiveInsights(teamId);
    res.json(insights);
  } catch (error: any) {
    console.error('Error fetching team insights:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch team insights' });
  }
});

/**
 * GET /api/insights/match/:matchId
 * Get insights triggered by a specific match
 */
router.get('/match/:matchId', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const matchId = parseInt(req.params.matchId);

    // Get match to verify team access
    const match = await db
      .selectFrom('matches')
      .select('team_id')
      .where('id', '=', matchId)
      .executeTakeFirst();

    if (!match || !match.team_id) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Admins have access to all teams
    if (req.userRole !== 'admin') {
      const userTeamIds = await getUserTeamAssignments(req.userId!);
      if (!userTeamIds.includes(match.team_id)) {
        return res.status(403).json({ error: 'Access denied to this team' });
      }
    }

    // Get insights for this match
    const insights = await db
      .selectFrom('insights')
      .selectAll()
      .where('match_id', '=', matchId)
      .where('is_dismissed', '=', false)
      .orderBy('severity', 'desc')
      .orderBy('created_at', 'desc')
      .execute();

    res.json(insights);
  } catch (error: any) {
    console.error('Error fetching match insights:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch match insights' });
  }
});

/**
 * PATCH /api/insights/:id/read
 * Mark an insight as read
 */
router.patch('/:id/read', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const insightId = parseInt(req.params.id);

    // Get insight to verify team access
    const insight = await db
      .selectFrom('insights')
      .select('team_id')
      .where('id', '=', insightId)
      .executeTakeFirst();

    if (!insight) {
      return res.status(404).json({ error: 'Insight not found' });
    }

    // Admins have access to all teams
    if (req.userRole !== 'admin') {
      const userTeamIds = await getUserTeamAssignments(req.userId!);
      if (!userTeamIds.includes(insight.team_id)) {
        return res.status(403).json({ error: 'Access denied to this team' });
      }
    }

    // Update insight
    await db
      .updateTable('insights')
      .set({
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', insightId)
      .execute();

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking insight as read:', error);
    res.status(500).json({ error: error.message || 'Failed to mark insight as read' });
  }
});

/**
 * PATCH /api/insights/:id/dismiss
 * Dismiss an insight
 */
router.patch('/:id/dismiss', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const insightId = parseInt(req.params.id);

    // Get insight to verify team access
    const insight = await db
      .selectFrom('insights')
      .select('team_id')
      .where('id', '=', insightId)
      .executeTakeFirst();

    if (!insight) {
      return res.status(404).json({ error: 'Insight not found' });
    }

    // Admins have access to all teams
    if (req.userRole !== 'admin') {
      const userTeamIds = await getUserTeamAssignments(req.userId!);
      if (!userTeamIds.includes(insight.team_id)) {
        return res.status(403).json({ error: 'Access denied to this team' });
      }
    }

    // Update insight
    await db
      .updateTable('insights')
      .set({
        is_dismissed: true,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', insightId)
      .execute();

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error dismissing insight:', error);
    res.status(500).json({ error: error.message || 'Failed to dismiss insight' });
  }
});

/**
 * POST /api/insights/generate/:teamId
 * Manually trigger insight generation for a team
 */
router.post('/generate/:teamId', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const teamId = parseInt(req.params.teamId);

    // Get team's season_id first (before access check, so we can return 404 if team doesn't exist)
    const team = await db
      .selectFrom('teams')
      .select('season_id')
      .where('id', '=', teamId)
      .executeTakeFirst();

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Admins have access to all teams
    if (req.userRole !== 'admin') {
      const userTeamIds = await getUserTeamAssignments(req.userId!);
      if (!userTeamIds.includes(teamId)) {
        return res.status(403).json({ error: 'Access denied to this team' });
      }
    }

    // Get latest match for this team
    const matches = await db
      .selectFrom('matches')
      .select('id')
      .where('team_id', '=', teamId)
      .orderBy('match_date', 'desc')
      .orderBy('id', 'desc')
      .limit(1)
      .executeTakeFirst();

    if (!matches) {
      return res.status(404).json({ error: 'No matches found for this team' });
    }

    // Generate insights (async, but wait for completion)
    await generateInsightsForMatch(teamId, matches.id, team.season_id || null);

    res.json({ success: true, message: 'Insights generated successfully' });
  } catch (error: any) {
    console.error('Error generating insights:', error);
    res.status(500).json({ error: error.message || 'Failed to generate insights' });
  }
});

export default router;
