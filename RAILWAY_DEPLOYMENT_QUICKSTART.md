# Railway Deployment Quick Start Guide

## Prerequisites Checklist

- [x] GitHub account created
- [x] Railway account created
- [ ] Project pushed to GitHub repository
- [ ] Railway account connected to GitHub

## Step 1: Push Project to GitHub

### 1.1 Initialize Git (if not already done)

```bash
cd /Users/kvitale/Desktop/joga-visualizer
git init
git add .
git commit -m "Initial commit - ready for Railway deployment"
```

### 1.2 Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click "+" → "New repository"
3. Name it: `joga-analytics` (or your preferred name)
4. **Don't** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

### 1.3 Push to GitHub

```bash
# Add your GitHub repository as remote
git remote add origin https://github.com/kvitale-star/joga-analytics.git

# Push to GitHub
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## Step 2: Connect Railway to GitHub

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your GitHub account
5. Select your `joga-analytics` repository
6. Click "Deploy Now"

## Step 3: Deploy Backend Service

### 3.1 Configure Backend Service

Railway should auto-detect your backend. If not:

1. In Railway project, click "+ New" → "GitHub Repo"
2. Select your repository
3. Railway will create a service

### 3.2 Set Root Directory

1. Click on the backend service
2. Go to "Settings" → "Root Directory"
3. Set to: `backend`
4. Save

### 3.3 Configure Build Settings

1. Go to "Settings" → "Build"
2. **Build Command:** `npm install && npm run build`
3. **Start Command:** `npm start`
4. Save

### 3.4 Add Environment Variables

Go to "Variables" tab and add:

```env
NODE_ENV=production
FRONTEND_URL=https://your-frontend.railway.app
DATABASE_PATH=./data/joga.db
JWT_SECRET=your-production-secret-key-here
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=kvitale@gmail.com
ENABLE_PASSWORD_VALIDATION=true
```

**Note:** Do NOT set `PORT` manually - Railway automatically sets this environment variable. Setting it manually will cause the backend to be unreachable.

**Important:**
- Replace `your-production-secret-key-here` with a strong random string (generate one)
- Use your actual SendGrid API key
- `FRONTEND_URL` will be updated after frontend deploys

### 3.5 Get Backend URL

1. Go to "Settings" → "Domains"
2. Railway provides a URL like: `your-backend-production.up.railway.app`
3. Copy this URL - you'll need it for frontend configuration

## Step 4: Deploy Frontend Service

### 4.1 Add Frontend Service

1. In Railway project, click "+ New" → "GitHub Repo"
2. Select the same repository
3. This creates a second service

### 4.2 Configure Frontend Service

1. Click on the frontend service
2. Go to "Settings" → "Root Directory"
3. Set to: `.` (root directory)
4. Save

### 4.3 Install `serve` Package

**Note:** This has already been added to your `package.json`! You can skip this step if you've already run `npm install` locally.

If you haven't installed it yet, run:

```bash
npm install
```

This will install the `serve` package that's already listed in your `package.json`.

Then commit and push your changes:

```bash
git add package.json package-lock.json
git commit -m "Add serve package for Railway deployment"
git push
```

**What this does:** The `serve` package is needed to serve your built frontend files (in the `dist` folder) on Railway. The `start` script in `package.json` tells Railway how to serve your static files.

### 4.4 Configure Build Settings

1. Go to "Settings" → "Build"
2. **Build Command:** `npm install && npm run build`
3. **Start Command:** `npm start`
4. Save

### 4.5 Add Environment Variables

Go to "Variables" tab and add:

```env
VITE_USE_BACKEND_API=true
VITE_API_URL=https://your-backend-production.up.railway.app/api
```

Replace `your-backend-production.up.railway.app` with your actual backend URL from Step 3.5.

### 4.6 Generate Frontend Domain

1. Go to your frontend service in Railway
2. Click on the **"Networking"** tab (or "Settings" → "Networking")
3. Click **"Generate Domain"** button
4. Railway will create a URL like: `your-frontend-production.up.railway.app`
5. Copy this URL - you'll need it for the backend CORS configuration

**Note:** Railway automatically assigns a port via the `$PORT` environment variable. Your `start` script (`serve -s dist -l $PORT`) uses this automatically - you don't need to configure a port manually.

### 4.7 Update Backend CORS

1. Go back to backend service
2. Update `FRONTEND_URL` variable to your frontend URL
3. Format: `https://your-frontend-production.up.railway.app`
4. Railway will automatically redeploy

## Step 5: Test Deployment

### 5.1 Test Backend

```bash
curl https://your-backend-production.up.railway.app/api/auth/setup-required
```

Should return JSON with `setupRequired: true` or `false`.

### 5.2 Test Frontend

1. Open your frontend URL in browser
2. Should see the login/setup page
3. Try creating an admin account (if setup required)

### 5.3 Test Email

1. Try password reset flow
2. Check email inbox for test email
3. Verify logo and footer appear correctly

## Step 6: Create Initial Admin

### Option A: Via Frontend

1. Go to frontend URL
2. If setup required, you'll see setup wizard
3. Create initial admin account

### Option B: Via API

```bash
curl -X POST https://your-backend-production.up.railway.app/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-secure-password",
    "name": "Admin User"
  }'
```

## Troubleshooting

### Backend Not Starting

1. Check logs in Railway dashboard
2. Verify all environment variables are set
3. Check that `DATABASE_PATH` directory exists (Railway creates it)
4. Verify build completed successfully

### Frontend Not Loading

1. Check build logs - ensure `npm run build` succeeded
2. Verify `dist` folder was created
3. Check that `serve` package is installed
4. Verify environment variables are set

### CORS Errors

1. Verify `FRONTEND_URL` in backend matches actual frontend URL
2. Check that frontend URL includes `https://`
3. Redeploy backend after updating `FRONTEND_URL`

### Database Issues

1. First deployment: Database is created automatically by migrations
2. Check logs for migration errors
3. Verify `DATABASE_PATH` is set correctly
4. Database file persists on Railway's filesystem

## Next Steps

1. ✅ Test all functionality
2. ✅ Set up database backups (see Phase 6 plan)
3. ✅ Monitor usage in Railway dashboard
4. ✅ Document production URLs

## Quick Reference

**Backend Service:**
- Root: `backend`
- Build: `npm install && npm run build`
- Start: `npm start`
- Port: 3001 (auto-set by Railway)

**Frontend Service:**
- Root: `.`
- Build: `npm install && npm run build`
- Start: `npm start` (uses serve)
- Port: Auto-set by Railway

**Environment Variables:**
- Set in Railway dashboard → Service → Variables
- Changes trigger automatic redeploy
- No need to restart manually

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Check logs in Railway dashboard for errors
