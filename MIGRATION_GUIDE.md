# Migration Guide: Browser Database → Backend Database

This guide covers migrating from browser-based SQL.js to a backend server with a real database (SQLite/MySQL/MariaDB).

## Current Architecture

**Frontend (Browser):**
- React app with Vite
- SQL.js (SQLite in browser via WebAssembly)
- Database stored in `localStorage` (IndexedDB)
- All database operations happen client-side
- No backend server

**Target Architecture:**

**Frontend (Browser):**
- React app (same)
- API client layer (new)
- No direct database access

**Backend (Server):**
- REST API server (Node.js/Express recommended)
- Database (SQLite/MySQL/MariaDB)
- Email service (SendGrid)
- Authentication middleware

## Recommended Order of Operations

### Phase 1: Setup Local Development Environment ⭐ **START HERE**

**Goal:** Create a local setup that mirrors production

1. **Choose Your Stack:**
   - **Backend:** Node.js + Express (recommended for TypeScript compatibility)
   - **Database:** SQLite everywhere (local dev AND production) - migrate to MariaDB only if needed later
   - **Query Builder:** **Kysely** (recommended - type-safe, clean code, works with SQLite and MySQL)

2. **Create Backend Directory Structure:**
   ```
   joga-analytics/
   ├── frontend/          # Your existing React app
   │   └── src/
   ├── backend/          # New backend server
   │   ├── src/
   │   │   ├── db/
   │   │   │   ├── database.ts
   │   │   │   ├── migrations/
   │   │   │   └── seed.ts
   │   │   ├── routes/
   │   │   │   ├── auth.ts
   │   │   │   ├── users.ts
   │   │   │   ├── teams.ts
   │   │   │   └── matches.ts
   │   │   ├── services/
   │   │   │   ├── emailService.ts
   │   │   │   └── authService.ts
   │   │   ├── middleware/
   │   │   │   └── auth.ts
   │   │   └── server.ts
   │   ├── package.json
   │   └── .env
   ├── package.json       # Root package.json for workspace
   └── .env.example
   ```

3. **Setup Local Database:**
   - **SQLite (Recommended):** Simple file-based, no server needed
   - Use the same SQLite setup for both local and production initially
   - Only add MySQL/MariaDB later if you actually need it

### Phase 2: Create Backend API Layer

**Goal:** Build REST API endpoints that mirror current database operations

1. **Database Connection:**
   - Setup database connection (SQLite/MySQL)
   - Port existing migrations to backend
   - Create database schema

2. **API Endpoints Needed:**
   ```
   Authentication:
   POST   /api/auth/login
   POST   /api/auth/logout
   POST   /api/auth/register
   POST   /api/auth/verify-email
   POST   /api/auth/reset-password
   POST   /api/auth/request-reset
   GET    /api/auth/me

   Users (Admin only):
   GET    /api/users
   POST   /api/users
   PUT    /api/users/:id
   DELETE /api/users/:id
   POST   /api/users/:id/reset-password

   Teams:
   GET    /api/teams
   POST   /api/teams
   PUT    /api/teams/:id
   DELETE /api/teams/:id
   GET    /api/users/:id/teams
   POST   /api/users/:id/teams
   DELETE /api/users/:id/teams/:teamId

   Matches:
   GET    /api/matches
   POST   /api/matches
   PUT    /api/matches/:id
   DELETE /api/matches/:id

   User Preferences:
   GET    /api/users/me/preferences
   PUT    /api/users/me/preferences
   ```

3. **Authentication:**
   - JWT tokens or session-based auth
   - Middleware to protect routes
   - Role-based access control

### Phase 3: Create Frontend API Client

**Goal:** Replace direct database calls with API calls

1. **Create API Client Service:**
   ```typescript
   // src/services/apiClient.ts
   const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
   
   export async function apiRequest(endpoint: string, options?: RequestInit) {
     const token = localStorage.getItem('auth_token');
     const response = await fetch(`${API_BASE_URL}${endpoint}`, {
       ...options,
       headers: {
         'Content-Type': 'application/json',
         ...(token && { Authorization: `Bearer ${token}` }),
         ...options?.headers,
       },
     });
     // Handle errors, etc.
   }
   ```

2. **Refactor Services:**
   - Replace `authService.ts` database calls with API calls
   - Replace `userService.ts` database calls with API calls
   - Replace `teamService.ts` database calls with API calls
   - Keep same function signatures (easier migration)

### Phase 4: Data Migration

**Goal:** Move existing data from browser to backend

1. **Export Browser Data:**
   - Create export utility to dump localStorage database
   - Export as SQL or JSON

2. **Import to Backend:**
   - Create import script
   - Map data to new schema
   - Verify data integrity

### Phase 5: Email Service Integration

**Goal:** Setup SendGrid with backend

1. **Backend Email Service:**
   - Install `@sendgrid/mail`
   - Create email service in backend
   - Update frontend to call backend email endpoint

2. **Environment Variables:**
   - Backend: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`
   - Frontend: `VITE_EMAIL_SERVICE_ENABLED=true`, `VITE_EMAIL_API_URL`

### Phase 6: Deployment

**Goal:** Deploy to production

1. **Backend Deployment:**
   - Deploy backend API (Railway, Render, Fly.io, DigitalOcean, etc.)
   - **Use SQLite file on server** (same as local!)
   - Setup automated backups (copy SQLite file)
   - Configure environment variables

2. **Frontend Deployment:**
   - Update API URL to production
   - Deploy frontend (Vercel, Netlify, etc.)

**Note:** Many hosting providers support SQLite. If you need MariaDB later, you can:
- Use managed database services (PlanetScale, Railway, etc.)
- Or self-host MariaDB
- Migration is straightforward (export SQLite → import MariaDB)

## Database Choice: SQLite vs MySQL/MariaDB

### SQLite (Recommended for Start)

**Pros:**
- ✅ No server setup needed
- ✅ Single file database
- ✅ Perfect for local development
- ✅ Easy backups (just copy file)
- ✅ Works great for small-medium apps
- ✅ Your migrations already use SQLite syntax

**Cons:**
- ❌ Not ideal for high concurrency (multiple writes)
- ❌ No network access (file-based)
- ❌ Limited to single server

**Best For:** Local dev, small-medium deployments, single server

### MySQL/MariaDB (Recommended for Production)

**Pros:**
- ✅ Better for high concurrency
- ✅ Network accessible
- ✅ Better for multiple servers
- ✅ More features (stored procedures, triggers, etc.)
- ✅ Better for large datasets

**Cons:**
- ❌ Requires database server
- ❌ More complex setup
- ❌ Need to adjust migrations (AUTO_INCREMENT vs AUTOINCREMENT)

**Best For:** Production, high traffic, multiple servers

### Recommendation

**Start with SQLite locally, migrate to MySQL/MariaDB for production:**
- Your migrations are mostly SQLite-compatible
- Easy to test locally
- Can migrate to MySQL later with minimal changes
- Most hosting providers support both

## Local Development Setup

### Option 1: Monorepo (Recommended)

**Structure:**
```
joga-visualizer/
├── packages/
│   ├── frontend/     # Your React app
│   └── backend/      # Node.js API
├── package.json      # Root workspace
└── .env.example
```

**Root `package.json`:**
```json
{
  "name": "joga-analytics",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "cd packages/frontend && npm run dev",
    "dev:backend": "cd packages/backend && npm run dev",
    "build": "npm run build:frontend && npm run build:backend"
  }
}
```

### Option 2: Separate Repos

Keep frontend and backend in separate directories/repos, run separately.

### Local Development Workflow

1. **Start Backend:**
   ```bash
   cd backend
   npm install
   npm run dev  # Runs on port 3001
   ```

2. **Start Frontend:**
   ```bash
   cd frontend  # or root if monorepo
   npm install
   npm run dev  # Runs on port 3000
   ```

3. **Environment Variables:**
   - Backend `.env`: Database connection, SendGrid keys
   - Frontend `.env`: `VITE_API_URL=http://localhost:3001/api`

## Migration Strategy

### Step-by-Step Approach

1. **Keep Current App Working:**
   - Don't break existing functionality
   - Build backend alongside frontend
   - Test backend independently

2. **Create Feature Flag:**
   ```typescript
   const USE_BACKEND_API = import.meta.env.VITE_USE_BACKEND === 'true';
   
   // In services, check flag:
   if (USE_BACKEND_API) {
     return apiRequest('/users');
   } else {
     return getDatabase().then(db => queryAll(db, 'SELECT * FROM users'));
   }
   ```

3. **Migrate Service by Service:**
   - Start with authentication (most critical)
   - Then user management
   - Then teams
   - Finally matches/data

4. **Test Thoroughly:**
   - Test each service independently
   - Test end-to-end flows
   - Compare browser DB vs backend DB results

## How This Affects Email Setup

**Current Setup:**
- Frontend calls backend API for emails (already designed this way!)
- Backend needs SendGrid integration

**Changes Needed:**
1. Move SendGrid code to backend (not frontend)
2. Frontend calls `/api/email/send-password-reset` instead of external service
3. Backend handles all email sending

**Email Flow:**
```
User clicks "Forgot Password"
  → Frontend calls: POST /api/auth/request-reset
  → Backend generates token, saves to DB
  → Backend calls SendGrid API
  → SendGrid sends email
  → User clicks link
  → Frontend calls: POST /api/auth/reset-password
```

## Recommended Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** SQLite (dev) → MySQL/MariaDB (prod)
- **ORM:** Kysely (type-safe SQL) or Prisma
- **Auth:** JWT tokens or express-session
- **Email:** @sendgrid/mail

### Frontend
- **Keep existing:** React, Vite, TypeScript
- **Add:** API client layer
- **Remove:** SQL.js dependency (eventually)

## Next Steps Checklist

- [ ] Create backend directory structure
- [ ] Setup backend package.json with dependencies
- [ ] Create database connection (SQLite for now)
- [ ] Port migrations to backend
- [ ] Create authentication API endpoints
- [ ] Create API client in frontend
- [ ] Refactor authService to use API
- [ ] Test authentication flow
- [ ] Create remaining API endpoints
- [ ] Refactor remaining services
- [ ] Setup SendGrid in backend
- [ ] Test email functionality
- [ ] Create data export/import scripts
- [ ] Migrate existing data
- [ ] Setup production database
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Remove SQL.js from frontend

## Quick Start: Minimal Backend Example

See `backend-setup-example.md` for a complete working example.

## Questions to Consider

1. **Hosting:** Where will you host? (SQLite works on most platforms)
2. **Budget:** SQLite = no extra database costs!
3. **Traffic:** Expected users/concurrent connections (SQLite handles most use cases)
4. **Data Size:** How much match data will you store? (SQLite handles GBs easily)
5. **Backup Strategy:** SQLite = just copy the file! (much easier than MySQL)

## SQLite on Server: Real-World Examples

**Many successful apps use SQLite in production:**
- Small-medium SaaS applications
- Internal tools
- Apps with < 100 concurrent writers
- Single-server deployments

**SQLite handles:**
- ✅ Thousands of concurrent **reads** (no problem)
- ✅ Hundreds of **writes per second** (usually fine)
- ✅ Databases up to **281 TB** (way more than you'll need)
- ✅ Millions of rows (your match data will be fine)

**You'll know you need MariaDB when:**
- You see database locking errors
- Writes are slow with multiple users
- You need multiple application servers
- You're hitting SQLite's concurrency limits (rare)

## Common Pitfalls

1. **Don't expose database credentials in frontend**
2. **Always validate input on backend** (never trust frontend)
3. **Use environment variables** for all secrets
4. **Test locally before deploying**
5. **Keep migrations versioned** and reversible
6. **Backup database regularly**
