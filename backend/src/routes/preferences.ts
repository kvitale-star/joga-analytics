import express from 'express';
import { updateUserPreferences, getUserById } from '../services/authService.js';
import { authenticateSession } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateSession);

/**
 * GET /api/preferences
 * Get current user's preferences
 */
router.get('/', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.preferences);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get preferences' });
  }
});

/**
 * PUT /api/preferences
 * Update current user's preferences
 */
router.put('/', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'Preferences object required' });
    }

    await updateUserPreferences(req.userId, preferences);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update preferences' });
  }
});

export default router;
