# Google Sheets API Troubleshooting Guide

## Quick Diagnostic Test

After deploying to Railway, test your Google Sheets connection:

```bash
# Replace with your Railway backend URL
curl https://your-backend.railway.app/api/sheets/test \
  -H "X-Session-ID: your-session-id"
```

Or visit the endpoint in your browser (requires authentication).

## Common Issues and Solutions

### 1. 403 Forbidden - "API key not valid"

**Symptoms:**
- Error: `API key not valid` or `API key not found`
- Status: 403

**Solutions:**
- Verify the API key is correct in Railway environment variables
- Check that the key exists in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- Ensure you copied the entire key (no truncation)

### 2. 403 Forbidden - "Access denied" or "Permission denied"

**Symptoms:**
- Error: `Access denied` or `Permission denied`
- Status: 403

**Possible Causes:**

#### A. Google Sheets API Not Enabled
1. Go to [Google Cloud Console - APIs & Services](https://console.cloud.google.com/apis/library)
2. Search for "Google Sheets API"
3. Click "Enable" if not already enabled
4. Wait a few minutes for changes to propagate

#### B. API Key Restrictions Blocking Railway
**Problem:** API keys with HTTP referrer or IP restrictions won't work from Railway.

**Solution:** Remove or adjust restrictions:
1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your API key
3. Under "API restrictions":
   - Select "Don't restrict key" (for testing)
   - OR select "Restrict key" and ensure "Google Sheets API" is in the allowed list
4. Under "Application restrictions":
   - Select "None" (recommended for server-side use)
   - OR if you must restrict, use "IP addresses" and add Railway's IP ranges (not recommended - Railway IPs change)

**Important:** HTTP referrer restrictions will NOT work with Railway because the requests come from the server, not a browser.

#### C. Spreadsheet is Private
**Problem:** API keys can only access **public** spreadsheets (or sheets shared with the service account).

**Solution:** Make the spreadsheet public (read-only is fine):
1. Open your Google Spreadsheet
2. Click "Share" button (top right)
3. Under "Get link", change to "Anyone with the link"
4. Set permission to "Viewer" (read-only)
5. Click "Copy link" and verify the ID in the URL matches your `GOOGLE_SHEETS_SPREADSHEET_ID`

**Alternative:** Use a service account (more complex, requires code changes):
- Create a service account in Google Cloud Console
- Share the spreadsheet with the service account email
- Use service account credentials instead of API key

### 3. 404 Not Found

**Symptoms:**
- Error: `Spreadsheet not found`
- Status: 404

**Solutions:**
- Verify `GOOGLE_SHEETS_SPREADSHEET_ID` is correct:
  - Open your Google Spreadsheet
  - The ID is in the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
  - Copy the `SPREADSHEET_ID` part (long alphanumeric string)
- Ensure the spreadsheet exists and hasn't been deleted
- Check that the sheet name in your range exists (e.g., "Match Log" in `Match Log!A1:ZZ1000`)

### 4. 400 Bad Request

**Symptoms:**
- Error: `Invalid request`
- Status: 400

**Solutions:**
- Check the range format (e.g., `Match Log!A1:ZZ1000`)
- Ensure sheet name doesn't have special characters that need encoding
- Verify the range is valid (not empty, proper format)

### 5. Environment Variables Not Set

**Symptoms:**
- Error: `GOOGLE_SHEETS_SPREADSHEET_ID is not set` or `GOOGLE_SHEETS_API_KEY is not set`

**Solutions:**
1. Go to Railway → Your Backend Service → Variables tab
2. Add:
   - `GOOGLE_SHEETS_SPREADSHEET_ID` = your spreadsheet ID
   - `GOOGLE_SHEETS_API_KEY` = your Google API key
3. Railway will automatically redeploy after saving

## Step-by-Step Setup Verification

### 1. Verify Environment Variables in Railway
1. Go to Railway dashboard
2. Select your backend service
3. Go to "Variables" tab
4. Verify both variables are set:
   - `GOOGLE_SHEETS_SPREADSHEET_ID` ✓
   - `GOOGLE_SHEETS_API_KEY` ✓

### 2. Verify Google Cloud Console Settings
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create one)
3. **Enable Google Sheets API:**
   - Go to [APIs & Services → Library](https://console.cloud.google.com/apis/library)
   - Search "Google Sheets API"
   - Click "Enable"
4. **Create/Verify API Key:**
   - Go to [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
   - Create API key or select existing one
   - Under "API restrictions": Ensure "Google Sheets API" is allowed (or "Don't restrict key")
   - Under "Application restrictions": Set to "None" (for server-side use)

### 3. Verify Spreadsheet Settings
1. Open your Google Spreadsheet
2. Click "Share" (top right)
3. Set to "Anyone with the link" → "Viewer"
4. Copy the spreadsheet ID from the URL
5. Verify it matches `GOOGLE_SHEETS_SPREADSHEET_ID` in Railway

### 4. Test Connection
Use the diagnostic endpoint:
```bash
curl https://your-backend.railway.app/api/sheets/test \
  -H "X-Session-ID: your-session-id"
```

Or check Railway logs for detailed error messages.

## Checking Railway Logs

1. Go to Railway dashboard
2. Select your backend service
3. Click "Deployments" tab
4. Click on the latest deployment
5. Click "View Logs"
6. Look for lines starting with `📊 Sheets` for detailed error information

## Still Having Issues?

1. **Check Railway logs** for the exact error message
2. **Use the test endpoint** (`/api/sheets/test`) for detailed diagnostics
3. **Verify all steps** in the setup verification above
4. **Test with a simple public spreadsheet** to isolate the issue
5. **Check API quota** in Google Cloud Console (rare, but possible)

## Security Best Practices

- ✅ Use API key restrictions (but not HTTP referrer for server-side)
- ✅ Make spreadsheet "Anyone with link" → "Viewer" (read-only)
- ✅ Rotate API keys periodically
- ✅ Monitor API usage in Google Cloud Console
- ❌ Don't commit API keys to git
- ❌ Don't use HTTP referrer restrictions for server-side API calls
