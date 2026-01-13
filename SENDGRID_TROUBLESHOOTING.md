# SendGrid API Key Troubleshooting

## Error: "Permission denied, wrong credentials" (401 Unauthorized)

This error means SendGrid is rejecting your API key. Here's how to fix it:

## Step 1: Verify Your API Key in SendGrid

1. **Log into SendGrid Dashboard:**
   - Go to [SendGrid](https://app.sendgrid.com/)
   - Navigate to **Settings** → **API Keys**

2. **Check Your API Key:**
   - Find the API key you created (e.g., "JOGA Visualizer")
   - If you can't see it, you may need to create a new one
   - **Note:** SendGrid only shows the API key once when you create it

## Step 2: Check Your Backend .env File

Open `backend/.env` and verify:

```env
SENDGRID_API_KEY=SG.your_actual_api_key_here
SENDGRID_FROM_EMAIL=kvitale@gmail.com
```

### Common Issues:

1. **Extra Quotes:**
   ❌ Wrong: `SENDGRID_API_KEY="SG.abc123..."`
   ✅ Correct: `SENDGRID_API_KEY=SG.abc123...`

2. **Extra Spaces:**
   ❌ Wrong: `SENDGRID_API_KEY= SG.abc123...`
   ✅ Correct: `SENDGRID_API_KEY=SG.abc123...`

3. **Missing "SG." prefix:**
   ❌ Wrong: `SENDGRID_API_KEY=abc123...`
   ✅ Correct: `SENDGRID_API_KEY=SG.abc123...`

4. **Truncated Key:**
   - API keys are long (usually 60+ characters)
   - Make sure you copied the entire key

## Step 3: Regenerate API Key (If Needed)

If you can't find your original API key:

1. Go to **Settings** → **API Keys** in SendGrid
2. Click **Create API Key**
3. Name it (e.g., "JOGA Visualizer")
4. Select **Full Access** or **Restricted Access** with "Mail Send" permissions
5. **Copy the key immediately** (you won't see it again!)
6. Update `backend/.env` with the new key

## Step 4: Verify Sender Email

Make sure `SENDGRID_FROM_EMAIL` matches a verified sender:

1. Go to **Settings** → **Sender Authentication** in SendGrid
2. Verify that `kvitale@gmail.com` (or your sender email) is verified
3. If not verified, complete the verification process

## Step 5: Test Again

After updating your `.env` file:

```bash
cd backend
npx tsx src/scripts/test-email.ts kvitale@gmail.com reset
```

## Still Not Working?

1. **Check SendGrid Account Status:**
   - Make sure your SendGrid account is active
   - Check for any account restrictions

2. **Verify API Key Permissions:**
   - The API key must have "Mail Send" permissions
   - If using Restricted Access, ensure it's enabled

3. **Check for Rate Limits:**
   - Free accounts have rate limits
   - Wait a few minutes and try again

4. **Contact SendGrid Support:**
   - If all else fails, contact SendGrid support
   - They can help verify your API key status
