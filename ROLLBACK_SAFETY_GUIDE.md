# Rollback Safety Guide

## Overview

This document provides comprehensive strategies to ensure you can safely roll back to the current working version if the new implementation causes issues.

## Current State Checkpoint

**Date**: Before starting Phase 1 implementation  
**Status**: Working production version with:
- ✅ Chart customization (Phase 0.5 complete)
- ✅ Custom chart builder (Phase 1 complete)
- ✅ AI chat interface (Gemini 2.5 Flash)
- ✅ All existing features functional

---

## Strategy 1: Git Tag (Recommended)

Create a permanent tag marking the current working state.

### Create the Tag

```bash
# Navigate to project root
cd /Users/kvitale/Desktop/joga-visualizer

# Check current git status
git status

# Ensure all current work is committed
git add .
git commit -m "Checkpoint: Working version before Coaching Intelligence System implementation"

# Create a tag for easy rollback
git tag -a v1.0-working-checkpoint -m "Working version before Phase 1-5 implementation. Safe rollback point."

# Push tag to remote (if you have a remote)
git push origin v1.0-working-checkpoint

# Verify tag was created
git tag -l
```

### Rollback to Tag

```bash
# View all tags
git tag -l

# Rollback to the checkpoint (creates detached HEAD)
git checkout v1.0-working-checkpoint

# Or create a rollback branch from the tag
git checkout -b rollback-to-working v1.0-working-checkpoint

# If you want to make this the main branch (destructive - be careful!)
git checkout main  # or master
git reset --hard v1.0-working-checkpoint
```

---

## Strategy 2: Git Branch (Development Branch)

Create a development branch for the new implementation.

### Create Development Branch

```bash
# Ensure you're on main/master and it's clean
git checkout main  # or master
git pull origin main  # if you have a remote

# Create a new branch for the implementation
git checkout -b feature/coaching-intelligence-system

# Push the branch to remote (if you have a remote)
git push -u origin feature/coaching-intelligence-system
```

### Work on Development Branch

```bash
# Always work on the feature branch
git checkout feature/coaching-intelligence-system

# Make commits as you implement
git add .
git commit -m "Phase 1.1: Add insights table migration"
# ... continue with implementation
```

### Rollback to Main

```bash
# If something goes wrong, switch back to main
git checkout main

# Your working version is safe on main
# The feature branch remains for later
```

---

## Strategy 3: Database Backup

**CRITICAL**: Before running any migrations, backup your database.

### SQLite Backup (Current Setup)

```bash
# Navigate to backend directory
cd backend

# Backup the database file
cp data/joga.db data/joga.db.backup-$(date +%Y%m%d-%H%M%S)

# Or use SQLite backup command
sqlite3 data/joga.db ".backup 'data/joga.db.backup-$(date +%Y%m%d-%H%M%S)'"

# Verify backup was created
ls -lh data/joga.db.backup-*
```

### Restore from Backup

```bash
# Stop the application first
# Then restore
cp data/joga.db.backup-YYYYMMDD-HHMMSS data/joga.db

# Or if using SQLite backup format
sqlite3 data/joga.db.restored ".restore 'data/joga.db.backup-YYYYMMDD-HHMMSS'"
mv data/joga.db.restored data/joga.db
```

### PostgreSQL Backup (If Using)

```bash
# Create backup
pg_dump -U your_user -d joga_db > backup-$(date +%Y%m%d-%H%M%S).sql

# Restore from backup
psql -U your_user -d joga_db < backup-YYYYMMDD-HHMMSS.sql
```

---

## Strategy 4: Code Snapshot (Manual Backup)

Create a complete snapshot of the working codebase.

### Create Snapshot

```bash
# Navigate to parent directory
cd /Users/kvitale/Desktop

# Create a timestamped backup
cp -r joga-visualizer joga-visualizer-backup-$(date +%Y%m%d-%H%M%S)

# Or use tar for compression
tar -czf joga-visualizer-backup-$(date +%Y%m%d-%H%M%S).tar.gz joga-visualizer

# Verify backup
ls -lh joga-visualizer-backup-*
```

### Restore from Snapshot

```bash
# Stop the application
# Remove or rename current directory
mv joga-visualizer joga-visualizer-broken

# Restore from backup
cp -r joga-visualizer-backup-YYYYMMDD-HHMMSS joga-visualizer

# Or from tar
tar -xzf joga-visualizer-backup-YYYYMMDD-HHMMSS.tar.gz
```

---

## Strategy 5: Railway Deployment Rollback

If deployed on Railway, use Railway's deployment history.

### Railway Rollback Steps

1. **Go to Railway Dashboard**
   - Navigate to your project
   - Click on the service (backend/frontend)

2. **View Deployments**
   - Click "Deployments" tab
   - Find the last working deployment
   - Click "Redeploy" on that deployment

3. **Or Use Railway CLI**
   ```bash
   # List deployments
   railway deployments

   # Rollback to specific deployment
   railway rollback <deployment-id>
   ```

### Before Deploying New Changes

1. **Tag Current Deployment**
   - Note the deployment ID/hash
   - Document it in this file (see below)

2. **Test Locally First**
   - Never deploy untested changes
   - Test migrations locally first

---

## Pre-Implementation Checklist

Before starting Phase 1, complete this checklist:

### Git Safety
- [ ] All current work is committed
- [ ] Created tag: `v1.0-working-checkpoint`
- [ ] Created branch: `feature/coaching-intelligence-system`
- [ ] Pushed tag/branch to remote (if applicable)

### Database Safety
- [ ] Database backup created: `joga.db.backup-YYYYMMDD-HHMMSS`
- [ ] Backup verified (can list files)
- [ ] Backup location documented

### Code Safety
- [ ] Code snapshot created (if not using git)
- [ ] Environment variables documented
- [ ] Current deployment ID/hash noted (if on Railway)

### Documentation
- [ ] Current working features documented
- [ ] Known issues documented
- [ ] Rollback procedures tested (at least mentally)

---

## Rollback Decision Tree

```
Problem Detected
    │
    ├─ Minor Issue (one feature broken)
    │   └─> Fix on feature branch, don't rollback
    │
    ├─ Major Issue (app won't start)
    │   ├─> Check git: git checkout main
    │   ├─> Check database: Restore from backup
    │   └─> Check Railway: Rollback deployment
    │
    └─ Critical Issue (data loss risk)
        └─> IMMEDIATE ROLLBACK:
            1. Stop application
            2. Restore database from backup
            3. git checkout main (or tag)
            4. Redeploy previous Railway deployment
            5. Verify app works
            6. Investigate issue on feature branch
```

---

## Quick Rollback Commands

### Full Rollback (Nuclear Option)

```bash
# 1. Stop application
# (Stop Railway deployment or local server)

# 2. Rollback code
git checkout main
# or
git checkout v1.0-working-checkpoint

# 3. Restore database
cd backend
cp data/joga.db.backup-YYYYMMDD-HHMMSS data/joga.db

# 4. Reinstall dependencies (if needed)
cd ..
npm install
cd backend
npm install

# 5. Restart application
npm run dev  # or Railway will auto-deploy
```

### Partial Rollback (Just Database)

```bash
# If code is fine but database migration broke something
cd backend
cp data/joga.db.backup-YYYYMMDD-HHMMSS data/joga.db
# Restart application
```

### Partial Rollback (Just Code)

```bash
# If database is fine but code broke
git checkout main
# Restart application
```

---

## Implementation Safety Practices

### 1. Incremental Commits

Commit after each small milestone:

```bash
# Phase 1.1: Database migration
git add backend/src/db/migrations.ts
git commit -m "Phase 1.1: Add insights table migration"

# Test before next commit
# If broken, easy to revert just this commit
git revert HEAD
```

### 2. Test Before Committing

```bash
# Run tests before committing
cd backend
npm test

# If tests pass, then commit
git commit -m "Phase 1.1: Migration tested and working"
```

### 3. Feature Flags

Consider using feature flags for new features:

```typescript
// In config
const ENABLE_INSIGHTS_ENGINE = process.env.ENABLE_INSIGHTS === 'true';

// In code
if (ENABLE_INSIGHTS_ENGINE) {
  await insightsService.generateInsightsForMatch(...);
}
```

This allows you to disable new features without rolling back code.

### 4. Database Migration Safety

Always test migrations on a copy first:

```bash
# Create test database
cp data/joga.db data/joga.test-migration.db

# Test migration on copy
# If successful, run on real database
```

---

## Current State Documentation

**Fill this in before starting implementation:**

### Git State
- Current branch: `_________________`
- Last commit hash: `_________________`
- Tag created: `v1.0-working-checkpoint` ✅ / ❌

### Database State
- Database file: `backend/data/joga.db`
- Backup created: `backend/data/joga.db.backup-_________________`
- Backup size: `_________________`
- Backup verified: ✅ / ❌

### Deployment State (if applicable)
- Railway deployment ID: `_________________`
- Deployment date: `_________________`
- Environment: `production` / `staging`

### Working Features Checklist
- [ ] Chart customization working
- [ ] Custom chart builder working
- [ ] AI chat working
- [ ] Match upload working
- [ ] Data visualization working
- [ ] User authentication working
- [ ] Other: `_________________`

---

## Emergency Contacts

If you need help with rollback:
- Git issues: Check git log, git reflog
- Database issues: Restore from most recent backup
- Railway issues: Use Railway dashboard or support
- Code issues: Revert to last known good commit

---

## Post-Rollback Recovery

After rolling back, if you want to try again:

1. **Document what went wrong**
   - What phase were you on?
   - What error occurred?
   - What was the last working state?

2. **Fix the issue on feature branch**
   - Don't work directly on main
   - Test thoroughly before merging

3. **Try again incrementally**
   - Smaller commits
   - More testing
   - Feature flags if possible

---

## Best Practices Summary

1. ✅ **Always use git tags/branches** - Never work directly on main
2. ✅ **Backup database before migrations** - Always
3. ✅ **Test locally before deploying** - Always
4. ✅ **Commit incrementally** - Small, testable commits
5. ✅ **Document current state** - Before starting
6. ✅ **Have rollback plan ready** - Before starting

---

**Remember**: It's better to be overly cautious than to lose working code. Take the time to set up these safety measures before starting implementation.
