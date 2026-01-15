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
import {
  loginRateLimiter,
  passwordResetRateLimiter,
  emailVerificationRateLimiter,
  authRateLimiter,
} from '../middleware/rateLimit.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await login(email, password);

    if (!result) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Set HttpOnly Secure cookie with session ID
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('sessionId', result.session.id, {
      httpOnly: true,
      secure: isProduction, // Only send over HTTPS in production
      sameSite: 'lax', // Allow cookies for same-site and top-level navigation (needed for email links)
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Set CSRF token cookie (non-HttpOnly so JS can read it)
    const { generateCsrfToken } = await import('../middleware/csrf.js');
    const csrfToken = generateCsrfToken(result.session.id);
    res.cookie('csrfToken', csrfToken, {
      httpOnly: false, // Must be readable by JavaScript
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });

    // Return user and session info (but session ID is in cookie)
    res.json({
      user: result.user,
      session: {
        ...result.session,
        id: undefined, // Don't send session ID in response body
      },
    });
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
 * Requires bootstrap secret to prevent race-to-first-admin vulnerability
 */
router.post('/setup', async (req, res) => {
  try {
    const { email, password, name, bootstrapSecret } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name required' });
    }

    // Validate bootstrap secret
    const expectedSecret = process.env.BOOTSTRAP_SECRET;
    if (!expectedSecret) {
      return res.status(500).json({ error: 'Bootstrap secret not configured. Please contact administrator.' });
    }

    if (!bootstrapSecret || bootstrapSecret !== expectedSecret) {
      return res.status(403).json({ error: 'Invalid bootstrap secret' });
    }

    const admin = await createInitialAdmin({ email, password, name });
    
    // Auto-login after setup
    const result = await login(email, password);
    
    if (!result) {
      return res.status(500).json({ error: 'Failed to login after setup' });
    }

    // Set HttpOnly Secure cookie with session ID
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('sessionId', result.session.id, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Set CSRF token cookie (non-HttpOnly so JS can read it)
    const { generateCsrfToken } = await import('../middleware/csrf.js');
    const csrfToken = generateCsrfToken(result.session.id);
    res.cookie('csrfToken', csrfToken, {
      httpOnly: false, // Must be readable by JavaScript
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });

    // Return user and session info (but session ID is in cookie)
    res.json({
      user: result.user,
      session: {
        ...result.session,
        id: undefined, // Don't send session ID in response body
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Setup failed' });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email with token
 */
router.post('/verify-email', emailVerificationRateLimiter, async (req, res) => {
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
router.post('/request-password-reset', passwordResetRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const token = await generatePasswordResetToken(email);
    
    if (token) {
      console.log(`📧 Sending password reset email to ${email}`);
      // Send email (don't wait for it)
      sendPasswordResetEmail(email, token)
        .then(() => {
          console.log(`✅ Password reset email sent to ${email}`);
        })
        .catch(err => {
          console.error('❌ Failed to send password reset email:', err);
        });
    } else {
      console.log(`⚠️ No password reset token generated for ${email} (user may not exist)`);
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
router.post('/reset-password', passwordResetRateLimiter, async (req, res) => {
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
