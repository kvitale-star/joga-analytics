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

// Auth required for all routes
router.use(authenticateSession);

/**
 * NOTE ON PERMISSIONS
 * - Admins: full CRUD + assignments
 * - Coaches: will get separate read endpoints in a future route (e.g. /api/coach/*)
 *   For now, the existing /api/teams routes remain admin-only.
 */
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
    const {
      displayName,
      metadata,
      seasonId,
      parentTeamId,
      gender,
      level,
      variant,
      birthYearStart,
      birthYearEnd,
      ageGroup,
    } = req.body;

    if (!seasonId || typeof seasonId !== 'number') {
      return res.status(400).json({ error: 'seasonId is required' });
    }
    if (!gender || (gender !== 'boys' && gender !== 'girls')) {
      return res.status(400).json({ error: 'gender must be "boys" or "girls"' });
    }
    if (!level || typeof level !== 'string') {
      return res.status(400).json({ error: 'level is required' });
    }
    // Birth years are optional - validate only if provided
    if (birthYearStart !== undefined && birthYearStart !== null && typeof birthYearStart !== 'number') {
      return res.status(400).json({ error: 'birthYearStart must be a number if provided' });
    }
    if (birthYearEnd !== undefined && birthYearEnd !== null && typeof birthYearEnd !== 'number') {
      return res.status(400).json({ error: 'birthYearEnd must be a number if provided' });
    }

    const team = await createTeam({
      displayName,
      metadata,
      seasonId,
      parentTeamId,
      gender,
      level,
      variant,
      birthYearStart: birthYearStart ?? null,
      birthYearEnd: birthYearEnd ?? null,
      ageGroup: ageGroup || null,
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
    const {
      displayName,
      metadata,
      seasonId,
      parentTeamId,
      isActive,
      gender,
      level,
      variant,
      birthYearStart,
      birthYearEnd,
      ageGroup,
    } = req.body;

    const team = await updateTeam(teamId, {
      displayName,
      metadata,
      seasonId,
      parentTeamId,
      isActive,
      gender,
      level,
      variant,
      birthYearStart,
      birthYearEnd,
      ageGroup: ageGroup !== undefined ? ageGroup : undefined,
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
