# Authentication Tests

This directory contains comprehensive tests for the authentication system that work with both local and Railway-hosted deployments.

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

The test suite covers:

- **Login (`POST /api/auth/login`)**
  - Successful login with valid credentials
  - Missing email/password validation
  - Invalid password handling
  - Non-existent user handling
  - Inactive user rejection
  - Unverified email rejection
  - User enumeration prevention (same error for all failures)

- **Logout (`POST /api/auth/logout`)**
  - Successful logout with valid session
  - Logout with invalid/expired session (should still work)
  - Logout without session cookie (should still work)

- **Get Current User (`GET /api/auth/me`)**
  - Return user with valid session
  - Reject requests without session
  - Reject requests with invalid session

- **Setup Status (`GET /api/auth/setup-required`)**
  - Returns setup status

- **Change Password (`POST /api/auth/change-password`)**
  - Successful password change
  - Incorrect current password rejection
  - Invalid new password rejection
  - Missing password validation
  - Authentication requirement

## Test Data

Tests automatically:
- Create test users with email addresses like `test-{timestamp}@example.com`
- Clean up test data before and after test runs
- Use unique timestamps to avoid conflicts

## Rate Limiting

The tests include delays between requests to avoid hitting rate limits. If you see `429 Too Many Requests` errors:
- The tests will handle them gracefully
- Some tests may need additional delays if running very quickly
- Consider increasing delays in test helpers if needed

## Notes

- Tests require the database to be accessible (local SQLite file or Railway database)
- Tests create and delete test users, so they should not interfere with production data
- All test users use email addresses starting with `test-` for easy identification
