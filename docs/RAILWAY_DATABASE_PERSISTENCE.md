# Railway Database Persistence Guide

## Problem

Railway uses **ephemeral storage** by default, which means files in your project directory (including SQLite database files) are **wiped on every deployment**. This causes your database to reset each time you push code.

## Solution: Use Railway Persistent Volume

Railway provides persistent storage via **Volumes**. You need to:

1. **Create a Volume in Railway**
2. **Mount it to your backend service**
3. **Configure the database path to use the volume**

## Step-by-Step Instructions

### 1. Create and Mount Volume to Backend Service

1. Go to your Railway project
2. Click on your **backend service**
3. Go to **"Settings"** tab
4. Scroll down to **"Volumes"** section
5. Click **"Add Volume"** or **"Create Volume"**
6. If creating new volume:
   - Name it: `database-storage` (or any name you prefer)
   - Set size: `1 GB` (or more if needed)
7. Set **Mount Path:** `/data` (or any path you prefer)
8. Click **"Add"** or **"Create"**

**Note:** In Railway, volumes are created and mounted at the service level, not the project level. You'll see the volume option in your backend service's Settings → Volumes section.

### 2. Verify Configuration (Automatic)

The code has been updated to automatically use Railway's volume if available. Railway sets the `RAILWAY_VOLUME_MOUNT_PATH` environment variable automatically when a volume is mounted.

**No additional configuration needed!** The code will:
1. Check for `RAILWAY_VOLUME_MOUNT_PATH` (set automatically by Railway)
2. Use that path for the database: `{RAILWAY_VOLUME_MOUNT_PATH}/joga.db`
3. Fall back to `DATABASE_PATH` or default if volume not mounted

**Optional: Set Custom Path**
- If you want to use a different path, add environment variable: `DATABASE_PATH=/data/joga.db`
- This will override the automatic volume detection

### 3. Verify It's Working

After deploying with the volume mounted:

1. Create an admin user
2. Create some test data
3. Redeploy the app (push a commit)
4. Check if your data persists

If data persists, you're all set! ✅

## Alternative: Use Railway PostgreSQL Database

If you prefer not to use volumes, Railway offers managed PostgreSQL databases:

1. **Add PostgreSQL Service:**
   - In your Railway project, click **"+ New"**
   - Select **"Database"** → **"PostgreSQL"** (or **"Add PostgreSQL"**)
   - Railway will automatically create the database and set `DATABASE_URL` environment variable

2. **Update Code:**
   - Replace `better-sqlite3` with `pg` (PostgreSQL driver)
   - Update Kysely dialect to use PostgreSQL
   - Migrate schema to PostgreSQL syntax
   - Update connection to use `DATABASE_URL`

**Note:** This requires significant code changes. Using a volume with SQLite is much simpler and works with your existing code.

## Current Configuration

The database path logic:
1. **First:** Check for `RAILWAY_VOLUME_MOUNT_PATH` (Railway volume)
2. **Second:** Check for `DATABASE_PATH` (custom path)
3. **Third:** Use default `./data/joga.db` (local development)

This ensures:
- ✅ Local development works (uses `./data/joga.db`)
- ✅ Railway with volume works (uses volume path)
- ✅ Railway without volume falls back to default (but will reset on deploy)

## Troubleshooting

### Database Still Resets After Deployment

**Check:**
1. Is the volume mounted? (Check service Settings → Volumes)
2. Is `RAILWAY_VOLUME_MOUNT_PATH` set? (Check service Variables)
3. Check backend logs for: `💾 Database path: ...` (should show volume path)

**Fix:**
- Ensure volume is properly mounted
- Restart the service after mounting volume
- Check that the mount path matches what Railway shows

### Can't Find Database File

**Check logs for:**
```
💾 Database path: /data/joga.db
📁 Created database directory: /data
```

If you see these, the database is being created in the volume.

### Volume Full

If you get "disk full" errors:
1. Go to Volume settings
2. Increase the volume size
3. Or clean up old data

## Best Practices

1. **Backup Regularly:**
   - Download the database file from Railway's volume
   - Or set up automated backups

2. **Monitor Volume Size:**
   - Check volume usage in Railway dashboard
   - SQLite databases grow over time

3. **Use Migrations:**
   - Always use migrations for schema changes
   - Never manually edit the database file

4. **Test Locally First:**
   - Test migrations locally before deploying
   - Verify database path configuration
