import express from 'express';
import {
  getAllUsers,
  createUserByAdmin,
  updateUser,
  deleteUser,
  resetUserPassword,
} from '../services/userService.js';
import { authenticateSession, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All user management routes require admin
router.use(authenticateSession);
router.use(requireAdmin);

/**
 * GET /api/users
 * Get all users (admin only)
 */
router.get('/', async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get users' });
  }
});

/**
 * POST /api/users
 * Create new user (admin only)
 */
router.post('/', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !name || !role) {
      return res.status(400).json({ error: 'Email, name, and role required' });
    }

    // Password is optional - if not provided, user will receive email to set password
    const user = await createUserByAdmin(email, password || null, name, role);
    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create user' });
  }
});

/**
 * PUT /api/users/:id
 * Update user (admin only)
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, email, role, isActive } = req.body;

    await updateUser(userId, { name, email, role, isActive });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update user' });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (admin only)
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (userId === req.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await deleteUser(userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

/**
 * POST /api/users/:id/reset-password
 * Reset user password (admin only)
 */
router.post('/:id/reset-password', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    await resetUserPassword(userId, password);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to reset password' });
  }
});

export default router;
