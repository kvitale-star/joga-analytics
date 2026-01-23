import sgMail from '@sendgrid/mail';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Function to set API key (called when needed, not at module load)
function ensureApiKeySet() {
  if (process.env.SENDGRID_API_KEY) {
    const apiKey = process.env.SENDGRID_API_KEY.trim();
    if (apiKey && apiKey.startsWith('SG.')) {
      sgMail.setApiKey(apiKey);
      return true;
    }
  }
  return false;
}

// Try to set it at module load, but it might not be available yet
ensureApiKeySet();

/**
 * Get the base URL for constructing email links
 */
function getBaseUrl(): string {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
}

/**
 * Get the logo as a base64 data URI for email templates
 * This ensures the logo loads in emails even when the frontend isn't publicly accessible
 */
function getLogoDataUri(): string {
  try {
    // Get the backend directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    // Path to the logo in the public folder (relative to backend/src)
    const logoPath = join(__dirname, '../../public/joga-logo-bw.png');
    
    // Read the image file and convert to base64
    const imageBuffer = readFileSync(logoPath);
    const base64Image = imageBuffer.toString('base64');
    
    // Return as data URI
    return `data:image/png;base64,${base64Image}`;
  } catch (error) {
    console.warn('Could not load logo image, using URL fallback:', error);
    // Fallback to URL if file can't be read
    const baseUrl = getBaseUrl();
    return `${baseUrl}/joga-logo-bw.png`;
  }
}

/**
 * Get the email footer HTML with contact info and mission statement
 */
function getEmailFooter(): string {
  return `
    <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
      <p style="margin: 10px 0; font-style: italic; color: #6787aa;">
        Training leaders through the joy of the beautiful game — where creativity, confidence, and character grow on and off the field.
      </p>
      <div style="margin: 20px 0;">
        <a href="https://www.jogafc.org" style="color: #6787aa; text-decoration: none; margin: 0 10px;">www.jogafc.org</a>
        <span style="color: #d1d5db;">|</span>
        <a href="https://www.instagram.com/jogabonito.slo" style="color: #6787aa; text-decoration: none; margin: 0 10px;">@jogabonito.slo</a>
      </div>
    </div>
  `;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  // Never send real emails during automated tests
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
    return;
  }
  // Use path-based token to avoid email clients stripping query params
  const resetUrl = `${getBaseUrl()}/reset-password/${token}`;

  // Ensure API key is set (in case env vars loaded after module import)
  const hasApiKey = ensureApiKeySet();
  
  if (!hasApiKey) {
    console.log('=== PASSWORD RESET EMAIL (Development Mode) ===');
    console.log('To:', email);
    console.log('Subject: Reset Your Password');
    console.log('Reset Link:', resetUrl);
    console.log('===============================================');
    return;
  }

  const logoDataUri = getLogoDataUri();
  const footer = getEmailFooter();
  const fromEmail = process.env.SENDGRID_FROM_EMAIL!;
  
  /**
   * NOTE: Sender Avatar in Email Clients
   * The avatar/profile picture that appears next to the sender name in email clients
   * (Gmail, Outlook, etc.) is NOT controlled by SendGrid or this code.
   * 
   * Email client avatars are determined by:
   * 1. The sender email account's profile picture (Gmail, Outlook, etc.)
   * 2. Gravatar (if the email is linked to a Gravatar account)
   * 3. The recipient's contact database
   * 
   * To use the JOGA logo as the sender avatar:
   * - Set up a Gravatar account for your SENDGRID_FROM_EMAIL address
   * - Upload joga-logo-bw.png as the Gravatar image
   * - Email clients that support Gravatar will display it
   * 
   * Alternatively, if using a Gmail/Google Workspace account:
   * - Set the profile picture in the Google account settings
   * - This will appear in Gmail and some other email clients
   */
  const msg = {
    to: email,
    from: {
      email: fromEmail,
      name: 'JOGA Analytics',
    },
    subject: 'Reset Your Password - JOGA Analytics',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${logoDataUri}" alt="JOGA Analytics" style="max-width: 200px; height: auto;" />
        </div>
        <h2 style="color: #6787aa; margin-top: 0;">Reset Your Password</h2>
        <p>You requested to reset your password for JOGA Analytics.</p>
        <p>Click the link below to reset your password:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #ceff00; color: #000; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Reset Password
          </a>
        </p>
        <p>Or copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #666; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${resetUrl}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This link will expire in 1 hour. If you didn't request this, please ignore this email.
        </p>
        ${footer}
      </div>
    `,
    text: `Reset your password by visiting: ${resetUrl}\n\nJOGA FC - Training leaders through the joy of the beautiful game\nWebsite: www.jogafc.org | Instagram: @jogabonito.slo`,
  };

  try {
    await sgMail.send(msg);
  } catch (error: any) {
    console.error('SendGrid error:', error);
    // Re-throw with more context
    if (error.response?.body?.errors) {
      const errorMessages = error.response.body.errors.map((e: any) => e.message).join(', ');
      throw new Error(`Failed to send password reset email: ${errorMessages}`);
    }
    throw new Error('Failed to send password reset email');
  }
}

/**
 * Send password setup email (for new users created by admin)
 * This email allows the user to set their initial password and verifies their email
 */
export async function sendPasswordSetupEmail(email: string, token: string, name: string): Promise<void> {
  // Never send real emails during automated tests
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
    return;
  }
  // Use path-based token to avoid email clients stripping query params
  const setupUrl = `${getBaseUrl()}/reset-password/${token}`;

  // Ensure API key is set (in case env vars loaded after module import)
  const hasApiKey = ensureApiKeySet();
  
  if (!hasApiKey) {
    console.log('=== PASSWORD SETUP EMAIL (Development Mode) ===');
    console.log('To:', email);
    console.log('Subject: Set Your Password - JOGA Analytics');
    console.log('Setup Link:', setupUrl);
    console.log('=============================================');
    return;
  }

  const logoDataUri = getLogoDataUri();
  const footer = getEmailFooter();
  const fromEmail = process.env.SENDGRID_FROM_EMAIL!;
  
  /**
   * NOTE: Sender Avatar Configuration
   * See comment in sendPasswordResetEmail() for information about
   * how sender avatars work in email clients.
   */
  const msg = {
    to: email,
    from: {
      email: fromEmail,
      name: 'JOGA Analytics',
    },
    subject: 'Set Your Password - JOGA Analytics',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${logoDataUri}" alt="JOGA Analytics" style="max-width: 200px; height: auto;" />
        </div>
        <h2 style="color: #6787aa; margin-top: 0;">Welcome to JOGA Analytics, ${name}!</h2>
        <p>An account has been created for you on JOGA Analytics. To get started, please set your password by clicking the link below:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${setupUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #ceff00; color: #000; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Set Your Password
          </a>
        </p>
        <p>Or copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #666; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${setupUrl}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This link will expire in 7 days. Setting your password will also verify your email address.
        </p>
        ${footer}
      </div>
    `,
    text: `Welcome to JOGA Analytics, ${name}!\n\nSet your password by visiting: ${setupUrl}\n\nThis link will expire in 7 days. Setting your password will also verify your email address.\n\nJOGA FC - Training leaders through the joy of the beautiful game\nWebsite: www.jogafc.org | Instagram: @jogabonito.slo`,
  };

  try {
    await sgMail.send(msg);
  } catch (error: any) {
    console.error('SendGrid error:', error);
    // Re-throw with more context
    if (error.response?.body?.errors) {
      const errorMessages = error.response.body.errors.map((e: any) => e.message).join(', ');
      throw new Error(`Failed to send password setup email: ${errorMessages}`);
    }
    throw new Error('Failed to send password setup email');
  }
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  // Never send real emails during automated tests
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
    return;
  }
  // Use path-based token to avoid email clients stripping query params
  const verificationUrl = `${getBaseUrl()}/verify-email/${token}`;

  // Ensure API key is set (in case env vars loaded after module import)
  const hasApiKey = ensureApiKeySet();
  
  if (!hasApiKey) {
    console.log('=== EMAIL VERIFICATION (Development Mode) ===');
    console.log('To:', email);
    console.log('Subject: Verify Your Email');
    console.log('Verification Link:', verificationUrl);
    console.log('============================================');
    return;
  }

  const logoDataUri = getLogoDataUri();
  const footer = getEmailFooter();
  const fromEmail = process.env.SENDGRID_FROM_EMAIL!;
  
  /**
   * NOTE: Sender Avatar Configuration
   * See comment in sendPasswordResetEmail() for instructions on setting
   * the sender avatar/profile picture in SendGrid dashboard.
   */
  const msg = {
    to: email,
    from: {
      email: fromEmail,
      name: 'JOGA Analytics',
    },
    subject: 'Verify Your Email - JOGA Analytics',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${logoDataUri}" alt="JOGA Analytics" style="max-width: 200px; height: auto;" />
        </div>
        <h2 style="color: #6787aa; margin-top: 0;">Verify Your Email Address</h2>
        <p>Thank you for signing up for JOGA Analytics!</p>
        <p>Please verify your email address by clicking the link below:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #ceff00; color: #000; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Verify Email
          </a>
        </p>
        <p>Or copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #666; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          If you didn't create an account, please ignore this email.
        </p>
        ${footer}
      </div>
    `,
    text: `Verify your email by visiting: ${verificationUrl}\n\nJOGA FC - Training leaders through the joy of the beautiful game\nWebsite: www.jogafc.org | Instagram: @jogabonito.slo`,
  };

  try {
    await sgMail.send(msg);
  } catch (error: any) {
    console.error('SendGrid error:', error);
    // Re-throw with more context
    if (error.response?.body?.errors) {
      const errorMessages = error.response.body.errors.map((e: any) => e.message).join(', ');
      throw new Error(`Failed to send verification email: ${errorMessages}`);
    }
    throw new Error('Failed to send verification email');
  }
}
