import express from 'express';
import {
  getAllUsers,
  createUserByAdmin,
  updateUser,
  deleteUser,
  resetUserPassword,
  getActiveAdminCount,
  getUserBasicInfo,
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
    
    if (user) {
      console.log(`✅ User created: ${user.email} (${user.role})`);
      if (!password) {
        console.log(`📧 Password setup email should be sent to ${user.email}`);
      }
    }
    
    res.status(201).json(user);
  } catch (error: any) {
    console.error('❌ Failed to create user:', error);
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
    
    // Validate userId is a finite number
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { name, email, role, isActive } = req.body;
    const currentUserId = req.userId!; // Guaranteed by requireAdmin middleware

    // Prevent self-demotion or self-deactivation
    if (userId === currentUserId) {
      if (role !== undefined && role !== 'admin') {
        return res.status(400).json({ error: 'Cannot change your own role' });
      }
      if (isActive !== undefined && isActive === false) {
        return res.status(400).json({ error: 'Cannot deactivate your own account' });
      }
    }

    // Get current user state before update
    const targetUser = await getUserBasicInfo(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if this would demote/deactivate the last active admin
    const isChangingToNonAdmin = role !== undefined && role !== 'admin';
    const isDeactivating = isActive !== undefined && isActive === false;
    const isCurrentlyAdmin = targetUser.role === 'admin';
    const isCurrentlyActive = targetUser.isActive;

    if (isCurrentlyAdmin && (isChangingToNonAdmin || isDeactivating)) {
      // Check how many active admins would remain after this change
      const excludeUserId = userId === currentUserId ? currentUserId : userId;
      const remainingAdminCount = await getActiveAdminCount(excludeUserId);
      
      if (remainingAdminCount === 0) {
        return res.status(400).json({ 
          error: 'Cannot change role or deactivate: this would leave no active admin users' 
        });
      }
    }

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
    
    // Validate userId is a finite number
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (userId === req.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if target user is an admin
    const targetUser = await getUserBasicInfo(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting the last active admin
    if (targetUser.role === 'admin' && targetUser.isActive) {
      const remainingAdminCount = await getActiveAdminCount(userId);
      if (remainingAdminCount === 0) {
        return res.status(400).json({ 
          error: 'Cannot delete the last active admin user. Please create another admin first or promote another user to admin.' 
        });
      }
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
    
    // Validate userId is a finite number
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

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
