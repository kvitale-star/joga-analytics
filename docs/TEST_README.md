# Backend Test Suite

This directory contains comprehensive tests for the entire backend system, including authentication, user management, teams, matches, preferences, Google Sheets integration, AI services, middleware, and data integrity. Tests work with both local and Railway-hosted deployments.

## Running Tests

### Local Testing

**Important**: For tests to run properly, the server should be started with `NODE_ENV=test` to disable rate limiting:

1. **Start the backend server in test mode** in one terminal:
   ```bash
   cd backend
   NODE_ENV=test npm run dev
   ```

2. **Run the tests** in another terminal:
   ```bash
   cd backend
   npm test
   ```

The tests will connect to `http://localhost:3001` (or the port specified in `PORT` environment variable).

**Note**: If you start the server without `NODE_ENV=test`, some tests may fail due to rate limiting. The test suite includes retry logic to handle this, but starting the server in test mode is recommended.

### Railway Testing

To test against a Railway deployment:

1. Set the `API_URL` environment variable to your Railway backend URL:
   ```bash
   export API_URL=https://your-app.railway.app
   ```

2. Run the tests:
   ```bash
   cd backend
   npm test
   ```

## Test Coverage

The test suite includes comprehensive coverage across all backend functionality:

### Authentication Tests (`auth.test.ts`)
- Login with valid/invalid credentials
- Logout functionality (including invalid sessions)
- Get current user
- Setup status
- Change password
- User enumeration prevention

### User Management Tests (`users.test.ts`)
- List all users (admin only)
- Create user (admin only)
- Update user (admin only)
- Delete user (admin only)
- Reset password (admin only)
- Self-modification prevention
- Last admin protection

### Teams Management Tests (`teams.test.ts`)
- List all teams (admin only)
- Get team by ID (admin only)
- Create team (admin only)
- Update team (admin only)
- Delete team (admin only)
- Get user teams (admin only)
- Assign team to user (admin only)
- Remove team assignment (admin only)

### Matches Management Tests (`matches.test.ts`)
- List matches with filters
- Get match by ID
- Create match (admin/coach with team access)
- Update match (admin/coach with team access)
- Delete match (admin/coach with team access)
- Get match events
- Create game event
- Role-based access control

### Preferences Tests (`preferences.test.ts`)
- Get user preferences
- Update preferences
- JSON validation
- Defensive parsing (malformed JSON)
- User isolation

### Google Sheets Integration Tests (`sheets.test.ts`)
- Fetch sheet data
- Fetch column metadata
- Append row to sheet
- Diagnostic endpoint
- Error handling (403, 404, 400, 429)
- Network failure handling
- Mocked Google Sheets API responses

### AI Service Tests (`ai.test.ts`)
- Chat with AI
- Check AI configuration status
- Error handling (503 when not configured)
- Mocked Gemini API responses

### Middleware Tests (`middleware.test.ts`)
- Session authentication
- Admin role requirement
- Match modification permissions
- CSRF protection
- Rate limiting (disabled in test mode)
- CORS headers
- Cookie security attributes

### Role/Permission Matrix Tests (`permissions.test.ts`)
- Table-driven tests for all role combinations (admin, coach, viewer, unauthenticated)
- Endpoint access matrix
- Team assignment verification
- Last admin safeguards
- CORS and CSRF requirements

### Service Layer Data Integrity Tests (`services.test.ts`)
- Preferences JSON parsing (valid, malformed, null, empty)
- Match stats JSON parsing
- Team metadata JSON parsing
- Session cleanup on password reset
- Database constraint validation (unique, foreign keys)
- Data type validation (dates, numbers, booleans)

## Test Data

Tests automatically:
- Create test users with email addresses like `test-{timestamp}@example.com`
- Create test teams with names like `Test Team {timestamp}`
- Create test matches with opponent names like `Test Opponent {timestamp}`
- Clean up all test data before and after test runs
- Use unique timestamps to avoid conflicts
- Isolate test data (won't affect production)

## Test Helpers

The test suite includes reusable helpers in `__tests__/helpers/`:

- **testHelpers.ts**: API base URL, cleanup, user creation
- **authHelpers.ts**: Create users with sessions (admin, coach, viewer), login helpers
- **dataHelpers.ts**: Create teams, matches, game events, team assignments

## External API Mocking

- **Google Sheets API**: Mocked using global.fetch to avoid hitting real API
- **Gemini AI API**: Tests verify endpoint behavior (actual API calls depend on valid API key)
- **Email Service**: Not tested (would require mocking SendGrid)

## Running Specific Test Suites

Run a specific test file:
```bash
npm test -- users.test.ts
npm test -- matches.test.ts
npm test -- permissions.test.ts
```

Run tests matching a pattern:
```bash
npm test -- --testNamePattern="should create user"
```

## Rate Limiting

The tests include delays between requests to avoid hitting rate limits. If you see `429 Too Many Requests` errors:
- The tests will handle them gracefully
- Some tests may need additional delays if running very quickly
- Consider increasing delays in test helpers if needed

## Notes

- Tests require the database to be accessible (local SQLite file or Railway database)
- Tests create and delete test users, so they should not interfere with production data
- All test users use email addresses starting with `test-` for easy identification
