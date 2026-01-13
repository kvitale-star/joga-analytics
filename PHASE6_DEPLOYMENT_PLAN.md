# Phase 6: Deployment Plan - Free/Low-Cost Options

## Overview

This deployment plan prioritizes **free or very low-cost** options suitable for a proof of concept. All recommended services have generous free tiers that should be sufficient for initial deployment and testing.

## Architecture Summary

- **Frontend:** React app (Vite)
- **Backend:** Node.js/Express API
- **Database:** SQLite (file-based, no server needed)
- **Email:** SendGrid (already configured)

## Cost Breakdown

| Service | Option | Cost | Notes |
|---------|--------|------|-------|
| Frontend Hosting | Railway | **FREE** | Covered by $5 credit/month |
| Backend Hosting | Railway | **FREE** | Covered by $5 credit/month |
| Database | SQLite (file) | **FREE** | Included with backend |
| Email | SendGrid | **FREE** | 100 emails/day free tier |
| Domain | Optional | $0-15/year | Only if custom domain needed |
| **Total** | | **$0/month** | Free tier sufficient for POC |

## Recommended Deployment Strategy

### Option 1: Railway for Both (Recommended) ⭐

**Why:** Simplest setup, one platform, perfect for low-traffic POC (12 coaches, ~1 user/day)

#### Frontend: Railway (Static Site)
- **Cost:** FREE (covered by $5 credit/month)
- **Benefits:**
  - Automatic HTTPS on `*.railway.app` domains
  - Automatic deployments from GitHub
  - Environment variables support
  - Same platform as backend (easier management)
- **Setup:** Deploy as static site service
- **URL:** `your-frontend.railway.app` (or custom domain)

#### Backend: Railway (Node.js Service)
- **Cost:** FREE (covered by $5 credit/month)
- **Free Tier:**
  - $5 credit/month (more than enough for this use case)
  - 500 hours/month compute time
  - Automatic deployments from GitHub
  - Environment variables support
- **Database:** SQLite file stored on Railway's filesystem
- **URL:** `your-backend.railway.app` (or custom domain)

**Total Cost: $0/month** (stays free for low-traffic POC)

**Why Railway for Both:**
- ✅ **Simpler:** One platform, one dashboard, one set of credentials
- ✅ **Easier Management:** Deploy both services together, monitor in one place
- ✅ **Sufficient Performance:** For 12 coaches (~1 user/day), Railway's performance is more than adequate
- ✅ **Automatic HTTPS:** Both services get HTTPS automatically
- ✅ **Free Tier:** $5 credit/month easily covers both services for this traffic level
- ✅ **Less Complexity:** Fewer moving parts, easier to maintain and explain

**Note:** Vercel's edge network advantages only matter at scale (thousands of users). For this use case, simplicity wins.

---

### Option 2: Vercel + Railway (Alternative)

**Why:** If you prefer Vercel's frontend optimizations (though not necessary for this traffic)

#### Frontend: Vercel
- **Cost:** FREE
- **Free Tier:** 
  - Unlimited deployments
  - 100GB bandwidth/month
  - Automatic HTTPS
  - Custom domains
- **Setup:** Connect GitHub repo, auto-deploys on push
- **URL:** `your-app.vercel.app` (or custom domain)

#### Backend: Railway
- Same as Option 1

**Total Cost: $0/month**

**When to Use:** Only if you specifically want Vercel's edge network/CDN (unnecessary for 12 coaches)

---

### Option 3: Render (All-in-One Alternative)

**Why:** Another free option, but with cold starts on free tier

#### Frontend: Render (Static Site)
- **Cost:** FREE
- **Free Tier:** Static sites are always free
- **URL:** `your-app.onrender.com`

#### Backend: Render (Web Service)
- **Cost:** FREE
- **Free Tier:**
  - Spins down after 15 min inactivity (wakes on request)
  - 750 hours/month
- **Database:** SQLite file on Render filesystem
- **URL:** `your-backend.onrender.com`

**Total Cost: $0/month** (with cold start delays on free tier)

**Note:** Railway is recommended over Render due to no cold starts and simpler setup.

---

## Step-by-Step Deployment Guide

### Phase 6A: Prepare for Deployment

#### 1. Environment Variables Checklist

**Backend `.env` (set in Railway):**
```env
# Server
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend.railway.app

# Database
DATABASE_PATH=./data/joga.db

# JWT Secret (generate new for production!)
JWT_SECRET=your-production-secret-key-here

# SendGrid
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=kvitale@gmail.com

# Password Validation
ENABLE_PASSWORD_VALIDATION=true
```

**Frontend `.env` (set in Railway):**
```env
VITE_USE_BACKEND_API=true
VITE_API_URL=https://your-backend.railway.app/api
```

#### 2. Update Build Scripts

Ensure `backend/package.json` has:
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

#### 3. Database Considerations

- SQLite file will be stored on the hosting platform's filesystem
- **Important:** Back up the database file regularly
- For production, consider automated backups (copy SQLite file)

#### 4. Security Checklist

- [ ] Generate new `JWT_SECRET` for production (don't use dev secret)
- [ ] Ensure `NODE_ENV=production` is set
- [ ] Verify CORS is configured correctly (only allow frontend domain)
- [ ] Check that sensitive data is in environment variables, not code
- [ ] Verify SendGrid API key is set correctly

---

### Phase 6B: Deploy Backend to Railway

#### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Get $5 free credit/month

#### Step 2: Deploy Backend
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository
4. Select the `backend` folder (or root if monorepo)
5. Railway auto-detects Node.js

#### Step 3: Configure Environment Variables
1. Go to project → Variables
2. Add all variables from `backend/.env`:
   - `PORT=3001`
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://your-frontend.vercel.app`
   - `DATABASE_PATH=./data/joga.db`
   - `JWT_SECRET=your-production-secret`
   - `SENDGRID_API_KEY=SG.xxx`
   - `SENDGRID_FROM_EMAIL=kvitale@gmail.com`

#### Step 4: Configure Build Settings
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Root Directory:** `backend` (if monorepo)

#### Step 5: Get Backend URL
- Railway provides URL like: `your-app.railway.app`
- Note this URL for frontend configuration

---

### Phase 6C: Deploy Frontend to Railway

#### Step 1: Add Frontend Service in Railway
1. In your Railway project, click "+ New"
2. Select "GitHub Repo" (or "Empty Service" if already connected)
3. Choose your repository
4. Railway will detect it's a frontend project

#### Step 2: Configure Frontend Service
1. In the service settings, configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** (leave empty for static site, or use a static server)
   - **Root Directory:** `.` (or `frontend` if monorepo)
   
2. **For Static Site:**
   - Railway can serve static files directly
   - Or use a simple static server like `serve` or `http-server`
   - Add to `package.json` scripts: `"serve": "serve -s dist -l 3000"`

#### Step 3: Configure Environment Variables
1. Go to service → Variables
2. Add:
   - `VITE_USE_BACKEND_API=true`
   - `VITE_API_URL=https://your-backend.railway.app/api`
   - (Replace with your actual backend URL from Phase 6B)

#### Step 4: Configure Static Site Serving
Railway needs a way to serve the static files. You have two options:

**Option A: Use `serve` package (Recommended)**
1. Install serve: `npm install --save serve`
2. Add to `package.json` scripts:
   ```json
   "start": "serve -s dist -l $PORT"
   ```
3. Railway will automatically use this to serve the built files

**Option B: Use Railway's Static Site Template**
1. When creating the service, select "Static Site" template
2. Railway will automatically serve files from `dist` folder
3. No additional configuration needed

#### Step 5: Deploy
- Railway auto-deploys on every push to main branch
- Get frontend URL: `your-frontend.railway.app`

#### Step 6: Update Backend CORS
- Update `FRONTEND_URL` in backend service to match frontend URL
- Format: `https://your-frontend.railway.app`
- Redeploy backend if needed

---

### Phase 6D: Post-Deployment

#### 1. Test Deployment
- [ ] Frontend loads correctly
- [ ] Backend API responds
- [ ] Login works
- [ ] Email sending works
- [ ] Database operations work

#### 2. Database Initialization
- First deployment: Database will be created automatically by migrations
- Or: Run migrations manually via Railway console

#### 3. Create Initial Admin
- Use the setup endpoint or create admin via API
- Or: Use the setup wizard in the frontend

#### 4. Monitor Logs
- Railway: View logs in dashboard for both services
- Check for any errors or warnings

---

## Why Railway for Both?

For this specific use case (12 coaches, ~1 user/day):

✅ **Simpler:** One platform, one dashboard, easier to manage  
✅ **Sufficient:** Railway's performance is more than adequate for this traffic  
✅ **Free:** $5 credit/month easily covers both services  
✅ **Automatic HTTPS:** Both services get HTTPS automatically  
✅ **Less Complexity:** Fewer moving parts, easier to maintain  

**Vercel's advantages (edge network, CDN) only matter at scale.** For 12 coaches, simplicity wins.

---

## Database Backup Strategy (Free)

Since SQLite is a file, backups are simple:

### Option 1: Manual Backup
- Download SQLite file from Railway/Render dashboard
- Store locally or in cloud storage (Google Drive, Dropbox - free)

### Option 2: Automated Backup Script
Create a simple script that:
1. Copies `data/joga.db` to a backup location
2. Runs daily via cron job (or Railway scheduled task)
3. Uploads to free cloud storage (Backblaze B2 free tier, etc.)

### Option 3: Git-based Backup (Simple)
- Export database to SQL
- Commit to private GitHub repo
- Automated via GitHub Actions (free)

---

## Custom Domain (Optional - Low Cost)

If you want a custom domain:

1. **Buy Domain:** Namecheap, Google Domains (~$10-15/year)
2. **Configure DNS:**
   - Point to Vercel (for frontend)
   - Point to Railway (for backend) or use subdomain
3. **SSL:** Automatic with Vercel/Railway (free)

**Example:**
- Frontend: `analytics.jogafc.org` → Railway
- Backend: `api.jogafc.org` → Railway

---

## Cost Monitoring

### Free Tier Limits to Watch:

**Railway:**
- $5 credit/month (easily covers both frontend and backend for this traffic)
- Monitor usage in dashboard
- For 12 coaches (~1 user/day), free tier is more than sufficient
- Upgrade only if needed ($5-10/month for paid tier)

**SendGrid:**
- 100 emails/day free
- Monitor in SendGrid dashboard
- Upgrade if needed ($15/month for 40k emails)

---

## Troubleshooting

### Common Issues:

1. **CORS Errors:**
   - Ensure `FRONTEND_URL` in backend matches actual frontend URL
   - Check CORS configuration in backend

2. **Database Not Found:**
   - Ensure `DATABASE_PATH` is set correctly
   - Check that migrations run on startup
   - Verify file permissions

3. **Environment Variables Not Loading:**
   - Double-check variable names (case-sensitive)
   - Ensure variables are set in hosting platform, not just `.env` file
   - Redeploy after adding variables

4. **Build Failures:**
   - Check build logs in hosting dashboard
   - Ensure all dependencies are in `package.json`
   - Verify Node.js version compatibility

---

## Next Steps After Deployment

1. **Test Everything:**
   - User registration/login
   - Email sending
   - Data operations
   - All features

2. **Set Up Monitoring:**
   - Use hosting platform's built-in monitoring
   - Set up error alerts (if available)

3. **Document Production URLs:**
   - Frontend URL
   - Backend API URL
   - Admin access info

4. **Plan for Growth:**
   - Monitor usage and costs
   - Plan upgrade path if needed
   - Consider database migration to MySQL/MariaDB if SQLite becomes limiting

---

## Recommended: Start with Railway for Both

**Why:**
- ✅ Simplest setup (one platform)
- ✅ Excellent free tier ($5 credit/month covers both)
- ✅ Easy setup and deployment
- ✅ Great developer experience
- ✅ Automatic HTTPS on both services
- ✅ GitHub integration
- ✅ Good documentation
- ✅ Perfect for low-traffic POC (12 coaches)

**Estimated Setup Time:** 30-45 minutes (simpler with one platform)  
**Monthly Cost:** $0 (stays free for POC usage)

---

## Quick Start Commands

After deployment, test with:

```bash
# Test backend
curl https://your-backend.railway.app/api/auth/setup-required

# Test frontend
open https://your-frontend.railway.app
```

---

## Summary

**Recommended Stack:**
- Frontend: **Railway** (Static Site) (FREE)
- Backend: **Railway** (Node.js Service) (FREE with $5 credit)
- Database: **SQLite** (FREE, file-based)
- Email: **SendGrid** (FREE, 100/day)

**Total Monthly Cost: $0** (for proof of concept)

**Why Railway for Both:**
- Perfect for low-traffic use case (12 coaches, ~1 user/day)
- Simpler management (one platform)
- Automatic HTTPS on both services
- Free tier easily covers both services
- Can scale up later if needed

This setup will handle your POC needs perfectly and can scale up when needed!
