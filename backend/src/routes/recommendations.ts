/**
 * Recommendations API Routes
 */

import express from 'express';
import { authenticateSession } from '../middleware/auth.js';
import { getUserTeamAssignments } from '../services/teamService.js';
import {
  generateRecommendations,
  getRecommendationsForTeam,
  markRecommendationAsApplied,
  getRecommendationById,
} from '../services/recommendationService.js';

const router = express.Router();

// All recommendation routes require authentication
router.use(authenticateSession);

/**
 * GET /api/recommendations/team/:teamId
 * Get recommendations for a specific team
 */
router.get('/team/:teamId', async (req, res) => {
  try {
    if (!req.userId || !req.userRole) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const teamId = parseInt(req.params.teamId);
    
    // Admins have access to all teams
    if (req.userRole !== 'admin') {
      // Verify user has access to this team
      const userTeamIds = await getUserTeamAssignments(req.userId);
      if (!userTeamIds.includes(teamId)) {
        return res.status(403).json({ error: 'Access denied to this team' });
      }
    }

    const { isApplied, category, recommendationType, limit } = req.query;

    const recommendations = await getRecommendationsForTeam(teamId, {
      isApplied: isApplied === 'true' ? true : isApplied === 'false' ? false : undefined,
      category: category as string | undefined,
      recommendationType: recommendationType as string | undefined,
      limit: limit ? parseInt(String(limit)) : undefined,
    });

    res.json(recommendations);
  } catch (error: any) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch recommendations' });
  }
});

/**
 * POST /api/recommendations/generate
 * Generate recommendations for a team (optionally based on an insight)
 * Body: { teamId: number, insightId?: number, category?: string, recommendationType?: string }
 */
router.post('/generate', async (req, res) => {
  try {
    if (!req.userId || !req.userRole) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { teamId, insightId, category, recommendationType } = req.body;

    if (!teamId) {
      return res.status(400).json({ error: 'teamId is required' });
    }

    // Admins have access to all teams
    if (req.userRole !== 'admin') {
      // Verify user has access to this team
      const userTeamIds = await getUserTeamAssignments(req.userId);
      if (!userTeamIds.includes(teamId)) {
        return res.status(403).json({ error: 'Access denied to this team' });
      }
    }

    const recommendations = await generateRecommendations({
      teamId,
      insightId: insightId || null,
      category: category || undefined,
      recommendationType: recommendationType || undefined,
    });

    res.status(201).json(recommendations);
  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: error.message || 'Failed to generate recommendations' });
  }
});

/**
 * PATCH /api/recommendations/:id/apply
 * Mark a recommendation as applied
 */
router.patch('/:id/apply', async (req, res) => {
  try {
    if (!req.userId || !req.userRole) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const recommendationId = parseInt(req.params.id);

    // Verify user has access to this recommendation's team
    const recommendation = await getRecommendationById(recommendationId);
    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    // Admins have access to all teams
    if (req.userRole !== 'admin') {
      const userTeamIds = await getUserTeamAssignments(req.userId);
      if (!userTeamIds.includes(recommendation.team_id)) {
        return res.status(403).json({ error: 'Access denied to this team' });
      }
    }

    const updated = await markRecommendationAsApplied(recommendationId);
    res.json(updated);
  } catch (error: any) {
    console.error('Error marking recommendation as applied:', error);
    res.status(500).json({ error: error.message || 'Failed to mark recommendation as applied' });
  }
});

/**
 * GET /api/recommendations/:id
 * Get a single recommendation by ID
 */
router.get('/:id', async (req, res) => {
  try {
    if (!req.userId || !req.userRole) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const recommendationId = parseInt(req.params.id);

    const recommendation = await getRecommendationById(recommendationId);
    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    // Admins have access to all teams
    if (req.userRole !== 'admin') {
      // Verify user has access to this recommendation's team
      const userTeamIds = await getUserTeamAssignments(req.userId);
      if (!userTeamIds.includes(recommendation.team_id)) {
        return res.status(403).json({ error: 'Access denied to this team' });
      }
    }

    res.json(recommendation);
  } catch (error: any) {
    console.error('Error fetching recommendation:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch recommendation' });
  }
});

export default router;
