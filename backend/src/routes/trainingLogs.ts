import express from 'express';
import { authenticateSession } from '../middleware/auth.js';
import { getUserTeamAssignments } from '../services/teamService.js';
import {
  getAllFocusTags,
  getFocusTagsByCategory,
  getTrainingLogsForTeam,
  getTrainingLogsForUser,
  getTrainingLogById,
  createTrainingLog,
  updateTrainingLog,
  deleteTrainingLog,
  getTrainingLogSummary,
} from '../services/trainingLogService.js';
import { invalidateTeamCacheForDataChange } from '../services/aiService.js';
import { db } from '../db/database.js';

const router = express.Router();

// All training log routes require authentication
router.use(authenticateSession);

/**
 * GET /api/training-focus-tags
 * Get all active training focus tags
 */
router.get('/focus-tags', async (req, res) => {
  try {
    const { category } = req.query;

    if (category && typeof category === 'string') {
      const tags = await getFocusTagsByCategory(category);
      return res.json(tags);
    }

    const tags = await getAllFocusTags();
    res.json(tags);
  } catch (error: any) {
    console.error('Error fetching focus tags:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch focus tags' });
  }
});

/**
 * GET /api/training-logs
 * Get training logs for the authenticated user's teams
 * Query params: teamId (optional), startDate, endDate, limit
 */
router.get('/', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { teamId, startDate, endDate, limit } = req.query;
    const userId = req.userId;

    // Get user's team assignments
    const userTeamIds = await getUserTeamAssignments(userId);

    if (userTeamIds.length === 0) {
      return res.json([]);
    }

    // If teamId specified, verify user has access
    if (teamId) {
      const teamIdNum = parseInt(String(teamId));
      if (!userTeamIds.includes(teamIdNum)) {
        return res.status(403).json({ error: 'Access denied to this team' });
      }

      // Get logs for specific team
      const logs = await getTrainingLogsForTeam(teamIdNum, {
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        limit: limit ? parseInt(String(limit)) : undefined,
      });
      return res.json(logs);
    }

    // Get logs for all user's teams
    const allLogs = await Promise.all(
      userTeamIds.map(teamId => 
        getTrainingLogsForTeam(teamId, {
          startDate: startDate as string | undefined,
          endDate: endDate as string | undefined,
          limit: limit ? parseInt(String(limit)) : undefined,
        })
      )
    );

    // Flatten and sort by date
    const flattened = allLogs.flat().sort((a, b) => {
      return new Date(b.session_date).getTime() - new Date(a.session_date).getTime();
    });

    res.json(flattened);
  } catch (error: any) {
    console.error('Error fetching training logs:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch training logs' });
  }
});

/**
 * GET /api/training-logs/team/:teamId
 * Get training logs for a specific team
 */
router.get('/team/:teamId', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const teamId = parseInt(req.params.teamId);
    const userId = req.userId;
    const { startDate, endDate, limit } = req.query;

    // Verify user has access to this team
    const userTeamIds = await getUserTeamAssignments(userId);
    if (!userTeamIds.includes(teamId)) {
      return res.status(403).json({ error: 'Access denied to this team' });
    }

    const logs = await getTrainingLogsForTeam(teamId, {
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      limit: limit ? parseInt(String(limit)) : undefined,
    });

    res.json(logs);
  } catch (error: any) {
    console.error('Error fetching team training logs:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch team training logs' });
  }
});

/**
 * GET /api/training-logs/team/:teamId/summary
 * Get training log summary/aggregate statistics for a team
 */
router.get('/team/:teamId/summary', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const teamId = parseInt(req.params.teamId);
    const userId = req.userId;
    const { startDate, endDate } = req.query;

    // Verify user has access to this team
    const userTeamIds = await getUserTeamAssignments(userId);
    if (!userTeamIds.includes(teamId)) {
      return res.status(403).json({ error: 'Access denied to this team' });
    }

    const summary = await getTrainingLogSummary(
      teamId,
      startDate as string | undefined,
      endDate as string | undefined
    );

    res.json(summary);
  } catch (error: any) {
    console.error('Error fetching training log summary:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch training log summary' });
  }
});

/**
 * GET /api/training-logs/:id
 * Get a specific training log by ID
 */
router.get('/:id', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const logId = parseInt(req.params.id);
    const userId = req.userId;

    const log = await getTrainingLogById(logId);
    if (!log) {
      return res.status(404).json({ error: 'Training log not found' });
    }

    // Verify user has access to this team
    const userTeamIds = await getUserTeamAssignments(userId);
    if (!userTeamIds.includes(log.team_id)) {
      return res.status(403).json({ error: 'Access denied to this team' });
    }

    res.json(log);
  } catch (error: any) {
    console.error('Error fetching training log:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch training log' });
  }
});

/**
 * POST /api/training-logs
 * Create a new training log entry
 */
router.post('/', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const {
      teamId,
      sessionDate,
      sessionType,
      focusTags, // Array of tag IDs
      notes,
      insightId,
      recommendationId,
      durationMinutes,
    } = req.body;

    if (!teamId || !sessionDate) {
      return res.status(400).json({ error: 'teamId and sessionDate are required' });
    }

    if (!focusTags || !Array.isArray(focusTags) || focusTags.length === 0) {
      return res.status(400).json({ error: 'focusTags must be a non-empty array' });
    }

    // Verify user has access to this team
    const userTeamIds = await getUserTeamAssignments(req.userId);
    if (!userTeamIds.includes(teamId)) {
      return res.status(403).json({ error: 'Access denied to this team' });
    }

    // Verify insight exists and belongs to team (if provided)
    if (insightId) {
      const insight = await db
        .selectFrom('insights')
        .select('team_id')
        .where('id', '=', insightId)
        .executeTakeFirst();

      if (!insight) {
        return res.status(404).json({ error: 'Insight not found' });
      }

      if (insight.team_id !== teamId) {
        return res.status(400).json({ error: 'Insight does not belong to this team' });
      }
    }

    // Validate focus tags exist
    const tagIds = focusTags.map((id: any) => parseInt(String(id)));
    const existingTags = await db
      .selectFrom('training_focus_tags')
      .select('id')
      .where('id', 'in', tagIds)
      .where('is_active', '=', true)
      .execute();

    if (existingTags.length !== tagIds.length) {
      return res.status(400).json({ error: 'One or more focus tags are invalid or inactive' });
    }

    const log = await createTrainingLog({
      team_id: teamId,
      user_id: req.userId,
      session_date: sessionDate,
      session_type: sessionType || 'training',
      focus_tags: JSON.stringify(tagIds),
      notes: notes || null,
      insight_id: insightId || null,
      recommendation_id: recommendationId || null,
      duration_minutes: durationMinutes || null,
    });

    // Invalidate AI cache (training data changed)
    invalidateTeamCacheForDataChange(teamId).catch((err) => {
      console.error('❌ Error invalidating cache:', err);
    });

    res.status(201).json(log);
  } catch (error: any) {
    console.error('Error creating training log:', error);
    res.status(500).json({ error: error.message || 'Failed to create training log' });
  }
});

/**
 * PUT /api/training-logs/:id
 * Update a training log entry
 */
router.put('/:id', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const logId = parseInt(req.params.id);
    const userId = req.userId;

    // Get existing log to verify access
    const existingLog = await getTrainingLogById(logId);
    if (!existingLog) {
      return res.status(404).json({ error: 'Training log not found' });
    }

    // Verify user has access to this team
    const userTeamIds = await getUserTeamAssignments(userId);
    if (!userTeamIds.includes(existingLog.team_id)) {
      return res.status(403).json({ error: 'Access denied to this team' });
    }

    // Verify user created this log (or is admin)
    // Check req.userRole from authenticateSession middleware
    const userRole = (req as any).userRole || null;
    if (existingLog.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'You can only update your own training logs' });
    }

    const {
      sessionDate,
      sessionType,
      focusTags,
      notes,
      insightId,
      recommendationId,
      durationMinutes,
    } = req.body;

    const updates: any = {};

    if (sessionDate !== undefined) updates.session_date = sessionDate;
    if (sessionType !== undefined) updates.session_type = sessionType;
    if (focusTags !== undefined) {
      if (!Array.isArray(focusTags) || focusTags.length === 0) {
        return res.status(400).json({ error: 'focusTags must be a non-empty array' });
      }
      const tagIds = focusTags.map((id: any) => parseInt(String(id)));
      const existingTags = await db
        .selectFrom('training_focus_tags')
        .select('id')
        .where('id', 'in', tagIds)
        .where('is_active', '=', true)
        .execute();

      if (existingTags.length !== tagIds.length) {
        return res.status(400).json({ error: 'One or more focus tags are invalid or inactive' });
      }
      updates.focus_tags = JSON.stringify(tagIds);
    }
    if (notes !== undefined) updates.notes = notes;
    if (insightId !== undefined) updates.insight_id = insightId || null;
    if (recommendationId !== undefined) updates.recommendation_id = recommendationId || null;
    if (durationMinutes !== undefined) updates.duration_minutes = durationMinutes || null;

    const updatedLog = await updateTrainingLog(logId, updates);
    res.json(updatedLog);
  } catch (error: any) {
    console.error('Error updating training log:', error);
    res.status(500).json({ error: error.message || 'Failed to update training log' });
  }
});

/**
 * DELETE /api/training-logs/:id
 * Delete a training log entry
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const logId = parseInt(req.params.id);
    const userId = req.userId;

    // Get existing log to verify access
    const existingLog = await getTrainingLogById(logId);
    if (!existingLog) {
      return res.status(404).json({ error: 'Training log not found' });
    }

    // Verify user has access to this team
    const userTeamIds = await getUserTeamAssignments(userId);
    if (!userTeamIds.includes(existingLog.team_id)) {
      return res.status(403).json({ error: 'Access denied to this team' });
    }

    // Verify user created this log (or is admin)
    // Check req.userRole from authenticateSession middleware
    const userRole = (req as any).userRole || null;
    if (existingLog.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own training logs' });
    }

    await deleteTrainingLog(logId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting training log:', error);
    res.status(500).json({ error: error.message || 'Failed to delete training log' });
  }
});

export default router;
