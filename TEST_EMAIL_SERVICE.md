# Testing SendGrid Email Service

This guide shows you how to test the SendGrid email integration.

## Prerequisites

1. ✅ SendGrid API key added to `backend/.env`
2. ✅ SendGrid sender email verified in SendGrid dashboard
3. ✅ Backend server can be started

## Quick Test (Command Line)

### Option 1: Using npx (Recommended)

```bash
cd backend
npx tsx src/scripts/test-email.ts kvitale@gmail.com reset
```

### Option 2: Using npm script (requires -- separator)

```bash
cd backend
npm run test-email -- kvitale@gmail.com reset
```

### Test Verification Email

```bash
cd backend
npx tsx src/scripts/test-email.ts kvitale@gmail.com verification
```

Or using npm script:
```bash
cd backend
npm run test-email -- kvitale@gmail.com verification
```

## Full Integration Test

### 1. Start the Backend Server

```bash
cd backend
npm run dev
```

The server should start on `http://localhost:3001`

### 2. Test Password Reset Flow

1. **Start the frontend** (if not already running):
   ```bash
   npm run dev
   ```

2. **Navigate to the login page** in your browser

3. **Click "Forgot Password"** or navigate to the password reset page

4. **Enter your email address** (`kvitale@gmail.com`) and submit

5. **Check your email inbox** (`kvitale@gmail.com`) for the password reset email

6. **Click the reset link** in the email

7. **Verify** you can reset your password

### 3. Test Email Verification Flow

1. **Create a new user** (non-admin) via the User Management interface:
   - Login as admin
   - Go to User Management
   - Create a new user with email: `kvitale@gmail.com`

2. **Check the email inbox** (`kvitale@gmail.com`) for the verification email

3. **Click the verification link** in the email

4. **Verify** the user's email is now verified

## Troubleshooting

### Email Not Received

1. **Check SendGrid Dashboard:**
   - Go to [SendGrid Activity](https://app.sendgrid.com/email_activity)
   - Look for your email in the activity feed
   - Check if it was delivered, bounced, or blocked

2. **Check Spam Folder:**
   - Emails might be in spam/junk folder
   - Check your email provider's spam settings

3. **Verify Sender Email:**
   - Make sure `SENDGRID_FROM_EMAIL` in `backend/.env` matches a verified sender in SendGrid
   - Go to SendGrid → Settings → Sender Authentication
   - Verify your sender email is verified

4. **Check Backend Logs:**
   - Look at the backend console for any errors
   - Check for SendGrid API errors

### SendGrid API Errors

If you see errors in the backend console:

1. **"Permission denied, wrong credentials" (401 Unauthorized):**
   - This means your API key is invalid
   - See `SENDGRID_TROUBLESHOOTING.md` for detailed steps
   - Common issues:
     - API key has extra quotes or spaces
     - API key is incorrect or truncated
     - API key was revoked or regenerated
   - **Fix:** Check `backend/.env` and ensure `SENDGRID_API_KEY` is correct (no quotes, no spaces, starts with "SG.")

2. **Invalid API Key:**
   - Verify `SENDGRID_API_KEY` in `backend/.env` is correct
   - Make sure there are no extra spaces or quotes
   - Regenerate the API key in SendGrid if needed

3. **Sender Not Verified:**
   - Verify the email in `SENDGRID_FROM_EMAIL` is verified in SendGrid
   - Complete the sender verification process in SendGrid dashboard

4. **Rate Limiting:**
   - Free SendGrid accounts have rate limits
   - Wait a few minutes and try again

### Development Mode (No SendGrid API Key)

If `SENDGRID_API_KEY` is not set in `backend/.env`:
- Emails will **not** be sent via SendGrid
- Email content will be **logged to the backend console** instead
- This is useful for local development without SendGrid setup

## Expected Results

### Successful Test

When the email service is working correctly:

1. ✅ Email appears in SendGrid Activity dashboard
2. ✅ Email is delivered to your inbox
3. ✅ Email contains correct links (password reset or verification)
4. ✅ Links work when clicked
5. ✅ No errors in backend console

### Test Script Output

When running the test script, you should see:

```
============================================================
Testing SendGrid Email Service
============================================================
Email: kvitale@gmail.com
Type: reset
SENDGRID_API_KEY: Set ✓
SENDGRID_FROM_EMAIL: noreply@yourdomain.com
FRONTEND_URL: http://localhost:3000
============================================================

Sending password reset email...
✓ Password reset email sent successfully!
Check your inbox at: kvitale@gmail.com

============================================================
Test completed successfully!
============================================================
```

## Next Steps

Once email testing is successful:
- ✅ Phase 5 is complete!
- 🚀 Ready for Phase 6: Deployment
