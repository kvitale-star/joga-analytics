# Setting Up PostgreSQL in Railway

This guide walks you through setting up a managed PostgreSQL database in Railway for your JOGA Analytics backend.

## Why Use Railway Postgres?

- ✅ **Managed database** - Railway handles backups, updates, and maintenance
- ✅ **Persistent storage** - Data survives deployments (no need for volumes)
- ✅ **Production-ready** - Same database type as production
- ✅ **Easy setup** - Railway automatically configures connection strings
- ✅ **Free tier available** - Railway offers a free tier for small projects

## Step-by-Step Setup

### Step 1: Add PostgreSQL Service

1. Go to your Railway project dashboard
2. Click **"+ New"** (or **"+ Add Service"**)
3. Select **"Database"** → **"PostgreSQL"**
   - Railway will create a new PostgreSQL service
   - This may take 1-2 minutes to provision

### Step 2: Railway Auto-Configures Connection

Railway automatically:
- Creates a PostgreSQL database
- Generates a secure `DATABASE_URL` connection string
- Sets it as an environment variable in your project

**You don't need to manually configure anything!** Railway handles it all.

### Step 3: Connect Backend to Postgres

The backend service will automatically use Postgres when `DATABASE_URL` is present. Railway shares environment variables across services in the same project, so:

1. **Check if `DATABASE_URL` is available:**
   - Go to your **backend service**
   - Click **"Variables"** tab
   - Look for `DATABASE_URL` (it should already be there from the Postgres service)

2. **If `DATABASE_URL` is not visible:**
   - Railway may need to link the services
   - Go to your **PostgreSQL service**
   - Click **"Variables"** tab
   - Copy the `DATABASE_URL` value
   - Go to your **backend service** → **"Variables"**
   - Click **"+ New Variable"**
   - Name: `DATABASE_URL`
   - Value: Paste the connection string from Postgres service
   - Click **"Add"**

### Step 4: Remove SQLite Configuration (Optional)

If you were using SQLite before, you can now remove SQLite-related environment variables:

1. Go to backend service → **"Variables"**
2. **Remove** (if present):
   - `DATABASE_PATH`
   - `RAILWAY_VOLUME_MOUNT_PATH`

**Note:** The backend will automatically use Postgres when `DATABASE_URL` is set, so removing SQLite vars is optional but recommended for clarity.

### Step 5: Redeploy Backend

After setting `DATABASE_URL`, Railway will automatically redeploy your backend. The backend will:

1. Detect `DATABASE_URL` on startup
2. Connect to Postgres
3. Run migrations automatically
4. Start serving requests

**Check logs** to verify:
```
✅ Database connection established
Current database version: 6
All migrations completed!
```

### Step 6: Verify It's Working

1. **Check backend logs:**
   - Should see: `✅ Database connection established`
   - Should NOT see: `💾 Database path: ...` (that's SQLite)

2. **Test the API:**
   ```bash
   curl https://your-backend.railway.app/api/health
   ```
   Should return `{ "status": "ok", ... }`

3. **Create a test user:**
   - Go to your frontend URL
   - Create an admin account
   - Data should persist after redeployments

## Viewing Your Database

### Option 1: Railway Dashboard

Railway provides a database viewer:

1. Go to your **PostgreSQL service**
2. Click **"Data"** tab (or **"Query"** tab)
3. You can run SQL queries directly in Railway

### Option 2: Connect with psql (Local)

1. Get connection details from Railway:
   - Go to PostgreSQL service → **"Variables"**
   - Copy `DATABASE_URL` (format: `postgres://user:password@host:port/dbname`)

2. Connect locally:
   ```bash
   psql "postgres://user:password@host:port/dbname"
   ```

3. Or parse the URL and connect:
   ```bash
   # Extract components from DATABASE_URL
   psql -h <host> -p <port> -U <user> -d <dbname>
   ```

### Option 3: Use a GUI Tool (Recommended)

Use a tool like **pgAdmin**, **DBeaver**, or **TablePlus**:

1. Get connection details from Railway `DATABASE_URL`
2. Parse the connection string:
   - Format: `postgres://user:password@host:port/dbname`
   - Example: `postgres://postgres:abc123@containers-us-west-123.railway.app:5432/railway`
   - Host: `containers-us-west-123.railway.app`
   - Port: `5432`
   - Database: `railway`
   - User: `postgres`
   - Password: `abc123`

3. Connect using these credentials

## Environment Variables Reference

### Required (Auto-Set by Railway)

- `DATABASE_URL` - Full connection string (automatically provided by Railway)

### Optional (Backend Config)

- `PGSSLMODE` - SSL mode (default: auto-detected based on host)
  - Set to `disable` for local Postgres
  - Leave unset for Railway Postgres (uses SSL automatically)

## Troubleshooting

### Backend Still Using SQLite

**Symptoms:**
- Logs show: `💾 Database path: ...`
- Data resets on redeploy

**Fix:**
1. Verify `DATABASE_URL` is set in backend service variables
2. Check that `DATABASE_URL` starts with `postgres://`
3. Redeploy backend service
4. Check logs for: `✅ Database connection established`

### Connection Refused

**Symptoms:**
- Backend fails to start
- Error: `Connection refused` or `ECONNREFUSED`

**Fix:**
1. Verify Postgres service is running (green status in Railway)
2. Check `DATABASE_URL` is correct
3. Ensure backend and Postgres are in the same Railway project
4. Check Railway status page for outages

### Migration Errors

**Symptoms:**
- Backend starts but migrations fail
- Error: `relation "users" does not exist`

**Fix:**
1. Check backend logs for migration errors
2. Verify Postgres service is healthy
3. Try manually running migrations (if possible):
   ```bash
   # SSH into Railway backend (if available)
   cd backend
   npm run migrate
   ```

### Database Not Found

**Symptoms:**
- Error: `database "joga_analytics" does not exist`

**Fix:**
- Railway Postgres creates a database automatically
- The database name is in `DATABASE_URL` (usually `railway` or similar)
- You don't need to create databases manually - Railway handles it

## Migrating from SQLite to Postgres

If you're currently using SQLite and want to migrate:

1. **Set up Postgres** (follow steps above)
2. **Export SQLite data** (if needed):
   ```bash
   sqlite3 data/joga.db .dump > backup.sql
   ```
3. **Import to Postgres** (if needed):
   ```bash
   psql $DATABASE_URL < backup.sql
   ```
4. **Remove SQLite volume** (if using one):
   - Go to backend service → Settings → Volumes
   - Remove the mounted volume
5. **Remove SQLite env vars:**
   - Remove `DATABASE_PATH`
   - Remove `RAILWAY_VOLUME_MOUNT_PATH`

**Note:** The app will automatically use Postgres once `DATABASE_URL` is set. Migrations will run on first startup.

## Cost Considerations

- **Railway Free Tier:** Includes a small Postgres database
- **Railway Pro:** Larger databases, better performance
- **Check Railway pricing:** https://railway.app/pricing

## Security Notes

- Railway Postgres uses SSL by default
- Connection strings include credentials - keep them secret
- Railway automatically rotates credentials periodically
- Never commit `DATABASE_URL` to Git (Railway handles this)

## Next Steps

1. ✅ Set up Postgres (you're here!)
2. ✅ Verify backend connects successfully
3. ✅ Test data persistence across deployments
4. ✅ Set up database backups (Railway handles this automatically)
5. ✅ Monitor database usage in Railway dashboard

## Quick Reference

**Postgres Service:**
- Type: Railway PostgreSQL
- Auto-configures: `DATABASE_URL`
- Access: Railway dashboard → PostgreSQL service → Data tab

**Backend Service:**
- Uses: `DATABASE_URL` (auto-detected)
- Migrations: Run automatically on startup
- No config needed: Just set `DATABASE_URL` and deploy!

## Support

- Railway Docs: https://docs.railway.app/databases/postgresql
- Railway Discord: https://discord.gg/railway
- Check Railway status: https://status.railway.app
