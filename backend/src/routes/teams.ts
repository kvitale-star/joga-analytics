import express from 'express';
import {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getUserTeams,
  assignTeamToUser,
  removeTeamFromUser,
} from '../services/teamService.js';
import { authenticateSession, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All team management routes require admin
router.use(authenticateSession);
router.use(requireAdmin);

/**
 * GET /api/teams
 * Get all teams
 */
router.get('/', async (req, res) => {
  try {
    const teams = await getAllTeams();
    res.json(teams);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get teams' });
  }
});

/**
 * GET /api/teams/:id
 * Get a specific team by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const team = await getTeamById(teamId);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(team);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get team' });
  }
});

/**
 * POST /api/teams
 * Create a new team
 */
router.post('/', async (req, res) => {
  try {
    const { displayName, slug, metadata, seasonId, parentTeamId } = req.body;

    if (!displayName || !slug) {
      return res.status(400).json({ error: 'Display name and slug are required' });
    }

    const team = await createTeam({
      displayName,
      slug,
      metadata,
      seasonId,
      parentTeamId,
    });

    res.status(201).json(team);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create team' });
  }
});

/**
 * PUT /api/teams/:id
 * Update a team
 */
router.put('/:id', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const { displayName, slug, metadata, seasonId, parentTeamId, isActive } = req.body;

    const team = await updateTeam(teamId, {
      displayName,
      slug,
      metadata,
      seasonId,
      parentTeamId,
      isActive,
    });

    res.json(team);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update team' });
  }
});

/**
 * DELETE /api/teams/:id
 * Delete a team
 */
router.delete('/:id', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    await deleteTeam(teamId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete team' });
  }
});

/**
 * GET /api/users/:userId/teams
 * Get teams assigned to a user
 */
router.get('/users/:userId/teams', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const teams = await getUserTeams(userId);
    res.json(teams);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get user teams' });
  }
});

/**
 * POST /api/users/:userId/teams
 * Assign team to user
 */
router.post('/users/:userId/teams', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({ error: 'Team ID required' });
    }

    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await assignTeamToUser(userId, teamId, req.userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to assign team' });
  }
});

/**
 * DELETE /api/users/:userId/teams/:teamId
 * Remove team assignment from user
 */
router.delete('/users/:userId/teams/:teamId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const teamId = parseInt(req.params.teamId);

    await removeTeamFromUser(userId, teamId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to remove team assignment' });
  }
});

export default router;
