/**
 * Email service for sending verification and password reset emails
 * 
 * Note: When using backend API mode (VITE_USE_BACKEND_API=true), emails are
 * automatically sent by the backend. This service is kept for backward
 * compatibility but is primarily used in browser-only mode.
 * 
 * In backend API mode:
 * - Password reset emails are sent automatically when calling generatePasswordResetToken
 * - Verification emails are sent automatically when creating users
 */

const USE_BACKEND_API = import.meta.env.VITE_USE_BACKEND_API === 'true';

/**
 * Get the base URL for constructing email links
 */
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3000';
}

/**
 * Send password reset email
 * 
 * Note: In backend API mode, this is a no-op since the backend handles email sending
 * automatically when /api/auth/request-password-reset is called.
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  // In backend API mode, emails are sent automatically by the backend
  if (USE_BACKEND_API) {
    // Backend already sent the email, just log for development
    if (import.meta.env.DEV) {
      const resetUrl = `${getBaseUrl()}/reset-password?token=${token}`;
      console.log('=== PASSWORD RESET EMAIL (Backend API Mode) ===');
      console.log('Email sent by backend to:', email);
      console.log('Reset Link:', resetUrl);
      console.log('===============================================');
    }
    return;
  }

  // Browser-only mode: Log the email content (no actual sending)
  const resetUrl = `${getBaseUrl()}/reset-password?token=${token}`;
  if (import.meta.env.DEV) {
    console.log('=== PASSWORD RESET EMAIL (Development Mode) ===');
    console.log('To:', email);
    console.log('Subject: Reset Your Password');
    console.log('Reset Link:', resetUrl);
    console.log('===============================================');
    alert(`Development Mode: Password reset link for ${email}\n\n${resetUrl}\n\n(Check console for details)`);
  }
}

/**
 * Send email verification email
 * 
 * Note: In backend API mode, this is a no-op since the backend handles email sending
 * automatically when users are created.
 */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  // In backend API mode, emails are sent automatically by the backend
  if (USE_BACKEND_API) {
    // Backend already sent the email, just log for development
    if (import.meta.env.DEV) {
      const verificationUrl = `${getBaseUrl()}/verify-email?token=${token}`;
      console.log('=== EMAIL VERIFICATION (Backend API Mode) ===');
      console.log('Email sent by backend to:', email);
      console.log('Verification Link:', verificationUrl);
      console.log('============================================');
    }
    return;
  }

  // Browser-only mode: Log the email content (no actual sending)
  const verificationUrl = `${getBaseUrl()}/verify-email?token=${token}`;
  if (import.meta.env.DEV) {
    console.log('=== EMAIL VERIFICATION (Development Mode) ===');
    console.log('To:', email);
    console.log('Subject: Verify Your Email');
    console.log('Verification Link:', verificationUrl);
    console.log('============================================');
    alert(`Development Mode: Email verification link for ${email}\n\n${verificationUrl}\n\n(Check console for details)`);
  }
}
