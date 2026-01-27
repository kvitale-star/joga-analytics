# Railway Deployment Order Configuration

## Problem

When you push code changes to GitHub, Railway automatically rebuilds both the backend and frontend services. However, the frontend build may start before the backend has finished building, causing build failures because:

1. Frontend build process tries to connect to backend API
2. Backend isn't ready yet (still building or starting)
3. Frontend build fails with connection errors
4. Railway automatically retries and eventually succeeds (but sends failure emails)

## Solution: Wait for Backend Before Building Frontend

We've added a pre-build script that waits for the backend to be healthy before starting the frontend build.

### How It Works

1. **Pre-build Script**: Before building the frontend, a script checks if the backend health endpoint is responding
2. **Health Check**: The script polls `/api/health` endpoint every 5 seconds
3. **Timeout**: Maximum wait time is configurable (default: 5 minutes)
4. **Non-blocking**: If backend doesn't become healthy, the script logs a warning but allows the build to continue (to prevent infinite waiting)

### Configuration

#### Option 1: Automatic (Recommended)

The script automatically detects the backend URL from `VITE_API_URL` environment variable:

```env
VITE_API_URL=https://your-backend.railway.app/api
```

The script extracts the base URL and checks `${BASE_URL}/api/health`.

#### Option 2: Manual Configuration

You can also set the wait time via environment variable:

```env
RAILWAY_BACKEND_WAIT_SECONDS=300  # Wait up to 5 minutes (default)
```

Or pass it as a command-line argument (see script usage below).

### Railway Configuration

#### Frontend Service Settings

1. Go to your **Frontend service** in Railway
2. Go to **Settings** → **Build**
3. Ensure **Build Command** is: `npm install && npm run build`
   - The `prebuild` script will automatically run before `build`
4. Ensure **Start Command** is: `npm start`

#### Environment Variables

Make sure your frontend service has:

```env
VITE_USE_BACKEND_API=true
VITE_API_URL=https://your-backend.railway.app/api
RAILWAY_BACKEND_WAIT_SECONDS=300  # Optional: adjust wait time
```

#### Backend Service Settings

Ensure your backend service has a health check endpoint (already configured):

- **Health Check Endpoint**: `/api/health`
- **Response**: Returns JSON with status information

### Alternative: Disable Auto-Deploy for Frontend

If you prefer manual control:

1. Go to **Frontend service** → **Settings** → **Deploy**
2. **Disable** "Auto Deploy"
3. After pushing code:
   - Wait for backend to finish building (check Railway dashboard)
   - Manually trigger frontend deployment

**Pros:**
- Full control over deployment order
- No build failures from timing issues

**Cons:**
- Requires manual intervention
- Two-step deployment process

### Alternative: Use Railway Service Dependencies

Railway supports service dependencies, but they're primarily for networking (service discovery), not build order. However, you can:

1. Go to **Frontend service** → **Settings** → **Dependencies**
2. Add **Backend service** as a dependency
3. This ensures frontend can discover backend URL, but doesn't guarantee build order

**Note:** This doesn't prevent frontend from building before backend is ready, but it helps with service discovery.

### Script Usage

The wait script can be run manually for testing:

```bash
# Use VITE_API_URL from environment (automatic)
node scripts/wait-for-backend.js

# Specify backend URL manually
node scripts/wait-for-backend.js https://your-backend.railway.app/api

# Specify backend URL and max wait time
node scripts/wait-for-backend.js https://your-backend.railway.app/api 600
```

### Troubleshooting

#### Frontend Still Builds Before Backend

**Check:**
1. Is `VITE_API_URL` set correctly in frontend service?
2. Is the backend health endpoint accessible? Test: `curl https://your-backend.railway.app/api/health`
3. Check Railway build logs for the wait script output

**Fix:**
- Verify `VITE_API_URL` environment variable
- Increase `RAILWAY_BACKEND_WAIT_SECONDS` if backend takes longer to build
- Check backend service logs to ensure it's starting correctly

#### Script Times Out

**Check:**
1. Is backend URL correct?
2. Is backend actually building/starting?
3. Check backend service logs

**Fix:**
- Verify backend URL in `VITE_API_URL`
- Increase wait time: `RAILWAY_BACKEND_WAIT_SECONDS=600` (10 minutes)
- Check backend build logs for errors

#### Build Still Fails

The script is **non-blocking** by design - if backend doesn't become healthy, it logs a warning but allows the build to continue. This prevents infinite waiting.

If you want the build to **fail** when backend isn't ready:

1. Edit `scripts/wait-for-backend.js`
2. Change `process.exit(0)` to `process.exit(1)` at the end of the timeout

**Warning:** This will cause build failures if backend takes longer than expected to start.

### Best Practices

1. **Monitor Build Times**: Check how long your backend typically takes to build
2. **Set Appropriate Timeout**: Set `RAILWAY_BACKEND_WAIT_SECONDS` to be slightly longer than typical backend build time
3. **Check Logs**: Review Railway build logs to see if the wait script is working
4. **Health Check**: Ensure backend health endpoint is working: `curl https://your-backend.railway.app/api/health`

### Summary

✅ **Automatic**: Script runs before every frontend build  
✅ **Configurable**: Adjust wait time via environment variable  
✅ **Non-blocking**: Won't hang forever if backend has issues  
✅ **Logging**: Clear messages about what's happening  

This should eliminate most build failure emails from Railway while ensuring frontend builds only after backend is ready.
