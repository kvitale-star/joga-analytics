# JOGA Backend API

Backend REST API server using Express, Kysely (type-safe query builder), and SQLite.

## Features

- ✅ Type-safe database queries with Kysely
- ✅ SQLite database (same for local and production)
- ✅ Authentication with sessions
- ✅ User management (admin only)
- ✅ Team assignments
- ✅ Email service (SendGrid integration)
- ✅ Clean, maintainable code

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create a `.env` file:

```env
# Server
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# Database (SQLite)
DATABASE_PATH=./data/joga.db

# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# SendGrid (optional - for email functionality)
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Password Validation
# Set to false to disable password validation (useful for testing)
# Default: true (enabled)
ENABLE_PASSWORD_VALIDATION=true

# Google Sheets (required for data access)
# Spreadsheet ID: Found in the Google Sheets URL (e.g., https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit)
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id-here
# API Key: Create at https://console.cloud.google.com/apis/credentials
# Enable Google Sheets API: https://console.cloud.google.com/apis/library/sheets.googleapis.com
GOOGLE_SHEETS_API_KEY=your-google-api-key-here
```

### 3. Run Migrations

The database will automatically run migrations on server start, or you can run them manually:

```bash
npm run migrate
```

### 4. Start Development Server

```bash
npm run dev
```

Server will run on `http://localhost:3001`

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout (delete session)
- `GET /api/auth/me` - Get current user
- `GET /api/auth/setup-required` - Check if setup needed
- `POST /api/auth/setup` - Create initial admin
- `POST /api/auth/verify-email` - Verify email with token
- `POST /api/auth/request-password-reset` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/change-password` - Change password (authenticated)

### Users (Admin Only)

- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/:id/reset-password` - Reset user password

### Teams (Admin Only)

- `GET /api/teams` - Get all teams
- `GET /api/teams/users/:userId/teams` - Get user's teams
- `POST /api/teams/users/:userId/teams` - Assign team to user
- `DELETE /api/teams/users/:userId/teams/:teamId` - Remove team assignment

### Preferences

- `GET /api/preferences` - Get current user's preferences
- `PUT /api/preferences` - Update preferences

## Authentication

The API uses **session-based authentication**:

1. Login returns a `session.id`
2. Frontend stores session ID in localStorage
3. Frontend sends `X-Session-ID` header with requests
4. Backend validates session and attaches `userId` to request

## Database

- **Type:** SQLite
- **Location:** `./data/joga.db` (or path from `DATABASE_PATH` env var)
- **Migrations:** Run automatically on server start
- **Backup:** Just copy the `.db` file!

## Code Structure

```
backend/
├── src/
│   ├── db/
│   │   ├── schema.ts          # Database schema types (Kysely)
│   │   ├── database.ts         # Kysely database instance
│   │   └── migrations.ts      # Migration runner
│   ├── services/
│   │   ├── authService.ts     # Authentication logic (Kysely queries)
│   │   ├── userService.ts     # User management (Kysely queries)
│   │   ├── teamService.ts     # Team management (Kysely queries)
│   │   └── emailService.ts    # SendGrid email service
│   ├── routes/
│   │   ├── auth.ts            # Auth endpoints
│   │   ├── users.ts            # User endpoints
│   │   ├── teams.ts            # Team endpoints
│   │   └── preferences.ts     # Preferences endpoints
│   ├── middleware/
│   │   └── auth.ts            # Authentication middleware
│   └── server.ts              # Express server setup
└── package.json
```

## Kysely Query Examples

### Select
```typescript
const users = await db
  .selectFrom('users')
  .selectAll()
  .where('is_active', '=', 1)
  .orderBy('created_at', 'desc')
  .execute();
```

### Insert
```typescript
const result = await db
  .insertInto('users')
  .values({
    email: 'user@example.com',
    password_hash: hash,
    name: 'User Name',
    role: 'coach',
  })
  .returning('id')
  .executeTakeFirstOrThrow();
```

### Update
```typescript
await db
  .updateTable('users')
  .set({ name: 'New Name', updated_at: new Date().toISOString() })
  .where('id', '=', userId)
  .execute();
```

### Delete
```typescript
await db
  .deleteFrom('sessions')
  .where('expires_at', '<=', new Date().toISOString())
  .execute();
```

### Joins
```typescript
const teams = await db
  .selectFrom('teams')
  .innerJoin('user_teams', 'teams.id', 'user_teams.team_id')
  .selectAll('teams')
  .where('user_teams.user_id', '=', userId)
  .execute();
```

## Testing

The backend includes a comprehensive test suite for the authentication system. Tests work with both local and Railway deployments.

**Quick Start:**
```bash
# Terminal 1: Start server in test mode (disables rate limiting)
NODE_ENV=test npm run dev

# Terminal 2: Run tests
npm test
```

**For detailed testing documentation, see [TEST_README.md](./TEST_README.md)**

**Test Coverage:**
- Authentication endpoints (login, logout, password change)
- User enumeration prevention
- Session management
- Error handling and validation

**Note:** Tests use test data only (no real credentials) and automatically clean up after themselves.

## Next Steps

1. **Frontend Integration:** Create API client in frontend to call these endpoints
2. **Testing:** Run the test suite to verify all endpoints work correctly
3. **Deployment:** Deploy backend to your hosting provider
4. **Production:** Update environment variables for production

## Development Tips

- Use `npm run dev` for auto-reload on file changes
- Check `./data/joga.db` for your database file
- Database migrations run automatically on startup
- All queries are type-safe thanks to Kysely!
