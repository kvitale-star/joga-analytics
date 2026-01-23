import express from 'express';
import { authenticateSession, requireAdmin } from '../middleware/auth.js';
import { createSeason, getAllSeasons, setActiveSeason } from '../services/seasonService.js';

const router = express.Router();

// Auth required for all season endpoints
router.use(authenticateSession);

/**
 * GET /api/seasons
 * List seasons
 * - Admin: all seasons
 * - Coach: read-only list (for preferred seasons UI)
 */
router.get('/', async (_req, res) => {
  try {
    const seasons = await getAllSeasons();
    res.json(seasons);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get seasons' });
  }
});

/**
 * POST /api/seasons
 * Create a season by year (admin only)
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { year } = req.body;
    const season = await createSeason(Number(year));
    res.status(201).json(season);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create season' });
  }
});

/**
 * POST /api/seasons/:id/activate
 * Set active season (admin only)
 */
router.post('/:id/activate', requireAdmin, async (req, res) => {
  try {
    const seasonId = parseInt(req.params.id, 10);
    if (!Number.isFinite(seasonId)) {
      return res.status(400).json({ error: 'Invalid season ID' });
    }
    await setActiveSeason(seasonId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to set active season' });
  }
});

export default router;

