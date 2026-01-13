import express from 'express';
import {
  login,
  getSession,
  deleteSession,
  hasUsers,
  createInitialAdmin,
  verifyEmail,
  generatePasswordResetToken,
  resetPassword,
  changePassword,
  getUserById,
} from '../services/authService.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService.js';
import { authenticateSession } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await login(email, password);

    if (!result) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Login failed' });
  }
});

/**
 * POST /api/auth/logout
 * Logout (delete session)
 */
router.post('/logout', authenticateSession, async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    await deleteSession(sessionId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Logout failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', authenticateSession, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get user' });
  }
});

/**
 * GET /api/auth/setup-required
 * Check if setup is required (no users exist)
 */
router.get('/setup-required', async (req, res) => {
  try {
    const setupRequired = !(await hasUsers());
    res.json({ setupRequired });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to check setup status' });
  }
});

/**
 * POST /api/auth/setup
 * Create initial admin user
 */
router.post('/setup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name required' });
    }

    const admin = await createInitialAdmin({ email, password, name });
    
    // Auto-login after setup
    const result = await login(email, password);
    
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Setup failed' });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email with token
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const success = await verifyEmail(token);
    if (!success) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Verification failed' });
  }
});

/**
 * POST /api/auth/request-password-reset
 * Request password reset (sends email)
 */
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const token = await generatePasswordResetToken(email);
    
    if (token) {
      // Send email (don't wait for it)
      sendPasswordResetEmail(email, token).catch(err => {
        console.error('Failed to send password reset email:', err);
      });
    }

    // Always return success (don't reveal if user exists)
    res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to request password reset' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password required' });
    }

    const success = await resetPassword(token, password);
    if (!success) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    res.json({ success: true });
  } catch (error: any) {
    // Password validation errors will be caught here
    if (error.message?.includes('Password') || error.message?.includes('password')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Password reset failed' });
  }
});

/**
 * POST /api/auth/change-password
 * Change password for logged-in user
 */
router.post('/change-password', authenticateSession, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    await changePassword(req.userId, currentPassword, newPassword);
    res.json({ success: true });
  } catch (error: any) {
    // Password validation errors will be caught here
    res.status(400).json({ error: error.message || 'Password change failed' });
  }
});

export default router;
