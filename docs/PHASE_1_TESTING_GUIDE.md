# Phase 1: Insights Engine - Testing Guide

This guide will help you test the Insights Engine implementation to ensure everything is working correctly.

## Prerequisites

1. ✅ Database migration completed (version 9)
2. ✅ Backend server can start
3. ✅ You have at least one team with matches in the database
4. ✅ You have a user account with access to that team

## Step 1: Verify Database Migration

First, verify that the `insights` table was created successfully:

```bash
# Navigate to backend directory
cd backend

# Run migration (should show version 9 completed)
npm run migrate

# Or check database directly (if you have psql or sqlite3 access)
# For PostgreSQL:
psql $DATABASE_URL -c "\d insights"

# For SQLite:
sqlite3 data/joga.db ".schema insights"
```

**Expected Result:**
- Migration should show: "✓ Migration 009 (Postgres) completed successfully"
- Table should exist with all required columns

## Step 2: Start the Backend Server

```bash
cd backend
npm run dev
```

**Expected Result:**
- Server starts without errors
- No TypeScript compilation errors
- Routes are registered (check console for route logs)

## Step 3: Verify API Endpoints Are Available

Test that the insights routes are accessible:

```bash
# Test GET /api/insights (requires authentication)
# You'll need to be logged in via the frontend or use a tool like Postman/curl with session cookie

# Or test with curl (replace SESSION_COOKIE with actual session cookie):
curl -X GET http://localhost:3001/api/insights \
  -H "Cookie: session=SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

**Expected Result:**
- Returns 200 OK (if authenticated)
- Returns empty array `[]` if no insights exist yet
- Returns 401 Unauthorized if not authenticated

## Step 4: Trigger Insight Generation

There are two ways to generate insights:

### Option A: Create/Update a Match (Automatic)

1. **Via Frontend:**
   - Log in to the app
   - Navigate to "Upload Game Data" or "Match Editor"
   - Create a new match OR update an existing match
   - Fill in match statistics (possession, passes, goals, etc.)
   - Save the match

2. **Via API (curl/Postman):**
```bash
# Create a match (replace SESSION_COOKIE and CSRF_TOKEN)
curl -X POST http://localhost:3001/api/matches \
  -H "Cookie: session=SESSION_COOKIE; csrf-token=CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: CSRF_TOKEN" \
  -d '{
    "teamId": 1,
    "opponentName": "Test Opponent",
    "matchDate": "2024-02-10",
    "result": "Win",
    "rawStats": {
      "possession": 65,
      "passesFor": 450,
      "goalsFor": 3,
      "goalsAgainst": 1,
      "attemptsFor": 15,
      "attemptsAgainst": 8
    }
  }'
```

**Expected Result:**
- Match is created successfully
- Insights are generated automatically (check backend console for "📊 Generating insights" log)
- No errors in console

### Option B: Manually Trigger Generation

```bash
# Generate insights for a specific team (replace TEAM_ID and SESSION_COOKIE)
curl -X POST http://localhost:3001/api/insights/generate/TEAM_ID \
  -H "Cookie: session=SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

**Expected Result:**
- Returns `{ "success": true, "message": "Insights generated successfully" }`
- Backend console shows: "📊 Generating insights for team X, match Y"
- Console shows: "✅ Generated N insights"

## Step 5: Verify Insights Were Created

### Check via API

```bash
# Get all insights for your teams
curl -X GET http://localhost:3001/api/insights \
  -H "Cookie: session=SESSION_COOKIE" \
  -H "Content-Type: application/json"

# Get insights for a specific team
curl -X GET http://localhost:3001/api/insights/team/TEAM_ID \
  -H "Cookie: session=SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

**Expected Result:**
- Returns array of insight objects
- Each insight has:
  - `id`, `team_id`, `match_id`, `season_id`
  - `insight_type`: 'anomaly' | 'trend' | 'half_split' | 'correlation' | 'benchmark'
  - `category`: 'shooting' | 'possession' | 'passing' | 'defending' | 'general'
  - `severity`: number between 0 and 1
  - `title`: human-readable title
  - `detail_json`: JSON string with structured finding data
  - `is_read`: false
  - `is_dismissed`: false

### Check via Database

```bash
# PostgreSQL
psql $DATABASE_URL -c "SELECT id, team_id, insight_type, category, severity, title FROM insights ORDER BY created_at DESC LIMIT 10;"

# SQLite
sqlite3 backend/data/joga.db "SELECT id, team_id, insight_type, category, severity, title FROM insights ORDER BY created_at DESC LIMIT 10;"
```

**Expected Result:**
- Rows returned with insight data
- `severity` values between 0 and 1
- `title` contains descriptive text

## Step 6: Test Insight Types

To test different insight types, you'll need matches with specific patterns:

### A. Anomaly Detection

Create a match with unusually high/low stats compared to season average:

```json
{
  "teamId": 1,
  "opponentName": "Anomaly Test",
  "matchDate": "2024-02-10",
  "rawStats": {
    "possession": 85,  // Much higher than season average (if avg is ~50-60)
    "goalsFor": 8,     // Much higher than season average
    "passesFor": 600   // Much higher than season average
  }
}
```

**Expected Result:**
- Insights with `insight_type: 'anomaly'` are created
- `detail_json` contains z-score > 1.5
- `severity` mapped from z-score

### B. Trend Detection

You need at least 5 matches. Create matches showing a clear trend:

```json
// Match 1 (older)
{ "possession": 45, "matchDate": "2024-01-01" }

// Match 2
{ "possession": 50, "matchDate": "2024-01-08" }

// Match 3
{ "possession": 55, "matchDate": "2024-01-15" }

// Match 4
{ "possession": 60, "matchDate": "2024-01-22" }

// Match 5 (latest)
{ "possession": 65, "matchDate": "2024-01-29" }
```

**Expected Result:**
- Insights with `insight_type: 'trend'` are created
- `detail_json` shows `direction: 'improving'` or `'declining'`
- `games_in_trend` shows number of consecutive games

### C. Half-Split Analysis

Create matches with half-time data showing a pattern:

```json
{
  "teamId": 1,
  "opponentName": "Half-Split Test",
  "matchDate": "2024-02-10",
  "rawStats": {
    "possession1stHalf": 40,
    "possession2ndHalf": 30,  // Significant drop
    "goalsFor1stHalf": 2,
    "goalsFor2ndHalf": 0,     // Drop in 2nd half
    "passesFor1stHalf": 200,
    "passesFor2ndHalf": 150   // Drop in 2nd half
  }
}
```

**Expected Result:**
- Insights with `insight_type: 'half_split'` are created
- `detail_json` shows delta between halves
- `delta_trend_direction` shows 'declining' or 'improving'

### D. Correlation Analysis

You need at least 8 matches. Create matches showing a correlation:

```json
// Multiple matches where high possession correlates with wins
{ "possession": 60, "result": "Win" }
{ "possession": 55, "result": "Win" }
{ "possession": 40, "result": "Loss" }
{ "possession": 45, "result": "Loss" }
// ... at least 8 matches total
```

**Expected Result:**
- Insights with `insight_type: 'correlation'` are created (if correlation > 0.4)
- `detail_json` shows `pearson_r` value
- Only created when team has 8+ matches

## Step 7: Test Insight Actions

### Mark as Read

```bash
curl -X PATCH http://localhost:3001/api/insights/INSIGHT_ID/read \
  -H "Cookie: session=SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

**Expected Result:**
- Returns `{ "success": true }`
- Insight's `is_read` field is now `true`

### Dismiss Insight

```bash
curl -X PATCH http://localhost:3001/api/insights/INSIGHT_ID/dismiss \
  -H "Cookie: session=SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

**Expected Result:**
- Returns `{ "success": true }`
- Insight's `is_dismissed` field is now `true`
- Insight no longer appears in `GET /api/insights` (filtered out)

## Step 8: Verify Error Handling

### Test Access Control

```bash
# Try to access insights for a team you don't have access to
curl -X GET http://localhost:3001/api/insights/team/999 \
  -H "Cookie: session=SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

**Expected Result:**
- Returns `403 Forbidden` with error message

### Test Invalid Team ID

```bash
# Try to generate insights for non-existent team
curl -X POST http://localhost:3001/api/insights/generate/999 \
  -H "Cookie: session=SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

**Expected Result:**
- Returns `404 Not Found` or `403 Forbidden`

## Step 9: Check Console Logs

Watch the backend console for insight generation logs:

**Expected Logs:**
```
📊 Generating insights for team 1, match 123
✅ Generated 5 insights
```

**Error Logs (if something goes wrong):**
```
❌ Error generating insights: [error message]
```

## Step 10: Verify Data Quality

Check that insights have meaningful data:

```sql
-- Check insight distribution by type
SELECT insight_type, COUNT(*) as count 
FROM insights 
GROUP BY insight_type;

-- Check severity distribution
SELECT 
  CASE 
    WHEN severity >= 0.7 THEN 'High'
    WHEN severity >= 0.4 THEN 'Medium'
    ELSE 'Low'
  END as severity_level,
  COUNT(*) as count
FROM insights
GROUP BY severity_level;

-- Check insights per team
SELECT team_id, COUNT(*) as insight_count
FROM insights
GROUP BY team_id
ORDER BY insight_count DESC;
```

## Common Issues & Troubleshooting

### Issue: No insights generated

**Possible Causes:**
1. Team has fewer than 3 matches (anomaly detection requires 3+)
2. Stats don't have enough variation (stddev = 0)
3. Match doesn't have `statsJson` populated
4. Error in insight generation (check console logs)

**Solution:**
- Ensure team has at least 3 matches with stats
- Check that `statsJson` is populated in matches table
- Check backend console for errors

### Issue: Insights generated but not appearing in API

**Possible Causes:**
1. Insights are dismissed (`is_dismissed = true`)
2. Insights expired (`expires_at < now()`)
3. User doesn't have access to the team

**Solution:**
- Check database directly: `SELECT * FROM insights WHERE team_id = X`
- Verify user has access to team via `user_teams` table

### Issue: Migration failed

**Possible Causes:**
1. Database connection issue
2. Previous migration incomplete
3. Table already exists

**Solution:**
- Check database connection: `npm run migrate`
- Check current version: `SELECT MAX(version) FROM schema_migrations`
- If table exists, drop and re-run: `DROP TABLE IF EXISTS insights;`

## Success Criteria

✅ **Phase 1 is working correctly if:**

1. Migration runs without errors
2. Insights are automatically generated when matches are created/updated
3. API endpoints return insights correctly
4. Insights have meaningful titles and severity scores
5. Different insight types are detected (anomaly, trend, half-split)
6. Insight actions (read/dismiss) work correctly
7. Access control prevents unauthorized access
8. No errors in backend console

## Next Steps

Once Phase 1 is verified working:
- Proceed to Phase 2: Training Log
- Or test with real match data from your database
- Or build frontend components to display insights

## Quick Test Script

Here's a quick test you can run to verify everything works:

```bash
#!/bin/bash
# Quick Phase 1 Test Script

echo "🧪 Testing Phase 1: Insights Engine"
echo ""

# 1. Check migration
echo "1. Checking database migration..."
cd backend
npm run migrate | grep -q "Migration 009" && echo "✅ Migration OK" || echo "❌ Migration failed"

# 2. Check table exists (if you have psql)
# psql $DATABASE_URL -c "\d insights" > /dev/null 2>&1 && echo "✅ Table exists" || echo "⚠️  Could not verify table"

# 3. Check service file exists
test -f src/services/insightsService.ts && echo "✅ Service file exists" || echo "❌ Service file missing"

# 4. Check routes file exists
test -f src/routes/insights.ts && echo "✅ Routes file exists" || echo "❌ Routes file missing"

echo ""
echo "✅ Basic checks complete. Start server and test API endpoints manually."
```
