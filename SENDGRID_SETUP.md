# SendGrid Email Setup Guide

This guide explains how to configure SendGrid for sending password reset and email verification emails.

## Overview

Since this is a browser-only application, you cannot directly call SendGrid from the frontend (API keys would be exposed). You'll need to create a backend API endpoint that handles email sending.

## Step 1: Create a SendGrid Account

1. Go to [SendGrid](https://sendgrid.com/) and sign up for a free account
2. Verify your email address
3. Complete the account setup process

## Step 2: Create a SendGrid API Key

1. Log in to your SendGrid dashboard
2. Navigate to **Settings** → **API Keys**
3. Click **Create API Key**
4. Name it (e.g., "Joga Visualizer")
5. Select **Full Access** or **Restricted Access** with "Mail Send" permissions
6. Click **Create & View**
7. **Copy the API key immediately** - you won't be able to see it again!

## Step 3: Verify Your Sender Identity

1. Go to **Settings** → **Sender Authentication**
2. Choose one of these options:
   - **Single Sender Verification** (easiest for testing)
   - **Domain Authentication** (recommended for production)

### Single Sender Verification:
1. Click **Verify a Single Sender**
2. Fill in the form with your email and company details
3. Check your email and click the verification link
4. Note the verified email address (e.g., `noreply@yourdomain.com`)

## Step 4: Create Backend API Endpoint

You need to create a backend service that will send emails via SendGrid. Here are options:

### Option A: Simple Node.js/Express Backend

Create a file `backend/email-service.js`:

```javascript
const express = require('express');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');

const app = express();
app.use(cors());
app.use(express.json());

// Set SendGrid API key from environment variable
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Password reset endpoint
app.post('/send-password-reset', async (req, res) => {
  const { email, resetUrl, token } = req.body;

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL, // Your verified sender email
    subject: 'Reset Your Password - JOGA Analytics',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6787aa;">Reset Your Password</h2>
        <p>You requested to reset your password for JOGA Analytics.</p>
        <p>Click the link below to reset your password:</p>
        <p>
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #ceff00; color: #000; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Reset Password
          </a>
        </p>
        <p>Or copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This link will expire in 1 hour. If you didn't request this, please ignore this email.
        </p>
      </div>
    `,
    text: `Reset your password by visiting: ${resetUrl}`,
  };

  try {
    await sgMail.send(msg);
    res.json({ success: true });
  } catch (error) {
    console.error('SendGrid error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Email verification endpoint
app.post('/send-verification', async (req, res) => {
  const { email, verificationUrl, token } = req.body;

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: 'Verify Your Email - JOGA Analytics',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6787aa;">Verify Your Email Address</h2>
        <p>Thank you for signing up for JOGA Analytics!</p>
        <p>Please verify your email address by clicking the link below:</p>
        <p>
          <a href="${verificationUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #ceff00; color: #000; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Verify Email
          </a>
        </p>
        <p>Or copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          If you didn't create an account, please ignore this email.
        </p>
      </div>
    `,
    text: `Verify your email by visiting: ${verificationUrl}`,
  };

  try {
    await sgMail.send(msg);
    res.json({ success: true });
  } catch (error) {
    console.error('SendGrid error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Email service running on port ${PORT}`);
});
```

### Option B: Serverless Function (Vercel/Netlify)

If you're deploying to Vercel or Netlify, you can create serverless functions:

**Vercel Example** (`api/send-email.js`):
```javascript
const sgMail = require('@sendgrid/mail');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const { email, resetUrl, type } = req.body;

  const templates = {
    reset: {
      subject: 'Reset Your Password - JOGA Analytics',
      html: `...password reset template...`,
    },
    verification: {
      subject: 'Verify Your Email - JOGA Analytics',
      html: `...verification template...`,
    },
  };

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    ...templates[type],
  };

  try {
    await sgMail.send(msg);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email' });
  }
}
```

## Step 5: Install SendGrid Package

If using Node.js backend:

```bash
npm install @sendgrid/mail
```

## Step 6: Configure Environment Variables

### Backend Environment Variables

Create a `.env` file in your backend directory:

```env
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
PORT=3001
```

### Frontend Environment Variables

Update your `.env` file in the project root:

```env
# Email Service Configuration
VITE_EMAIL_SERVICE_ENABLED=true
VITE_EMAIL_API_URL=http://localhost:3001
# Or for production:
# VITE_EMAIL_API_URL=https://your-backend-domain.com
```

## Step 7: Start Your Backend Service

If using Node.js/Express:

```bash
cd backend
node email-service.js
```

Or with nodemon for development:

```bash
npm install -g nodemon
nodemon email-service.js
```

## Step 8: Test the Integration

1. Start your backend email service
2. Start your frontend app
3. Try requesting a password reset
4. Check your email inbox

## Production Considerations

1. **Use Environment Variables**: Never commit API keys to git
2. **Rate Limiting**: Add rate limiting to your email endpoints
3. **Error Handling**: Log errors but don't expose sensitive info
4. **HTTPS**: Always use HTTPS in production
5. **Domain Authentication**: Use domain authentication instead of single sender for production
6. **Monitoring**: Set up SendGrid webhooks to monitor email delivery

## Troubleshooting

### Emails Not Sending

1. **Check API Key**: Verify your API key is correct
2. **Check Sender**: Ensure your sender email is verified
3. **Check Backend Logs**: Look for errors in your backend console
4. **Check SendGrid Dashboard**: View activity logs in SendGrid
5. **Check Spam Folder**: Emails might be going to spam

### CORS Errors

If you get CORS errors, make sure your backend has CORS enabled:

```javascript
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000', // Your frontend URL
  credentials: true
}));
```

### API Key Issues

- Ensure the API key has "Mail Send" permissions
- Check that the API key hasn't been revoked
- Verify you're using the correct API key (not a template ID)

## SendGrid Free Tier Limits

- **100 emails/day** for free accounts
- Upgrade to paid plans for higher limits
- Monitor usage in SendGrid dashboard

## Alternative: Using SendGrid Templates

Instead of inline HTML, you can use SendGrid's template system:

1. Create templates in SendGrid dashboard
2. Use template IDs in your code:

```javascript
const msg = {
  to: email,
  from: process.env.SENDGRID_FROM_EMAIL,
  templateId: 'd-1234567890abcdef', // Your template ID
  dynamicTemplateData: {
    resetUrl: resetUrl,
    userName: user.name,
  },
};
```

This makes it easier to update email designs without code changes.
