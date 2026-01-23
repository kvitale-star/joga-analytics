`# Test Failures Documentation

**Last Updated:** January 2025  
**Current Status:** ~153/171 tests passing (89%) - Some suites timing out  
**Passing Suites:** auth.test.ts (100%), teams.test.ts (100%), matches.test.ts (100%)

**Note:** Several test suites are currently timing out in `beforeAll` hooks due to helper initialization taking longer than Jest's default 15s timeout. This is the primary blocker.

## Overview

This document tracks the remaining test failures that need to be addressed. Most failures are related to:
1. Helper function initialization issues (permissions.test.ts)
2. Test logic adjustments needed (users.test.ts)
3. Service layer and integration tests (services, sheets, preferences, ai)

---

## 1. users.test.ts (Timeout + 1 test failure)

### Current Issue: Timeout in `beforeAll`
**Error:** `beforeAll` hook exceeding 15 second timeout

**Fix:** Increase timeout for `beforeAll` hook (similar to permissions.test.ts)

### Test: "should prevent deleting the last active admin"

**Status:** Failing (after timeout fix)  
**Issue:** Test expects admin count to be 1 after deleting one admin, but receives 2.

**Error:**
```
expect(received).toBe(expected) // Object.is equality
Expected: 1
Received: 2
```

**Location:** `src/__tests__/users.test.ts:511`

**Root Cause:** The test creates admins and deletes them, but doesn't account for the `admin` user created in `beforeAll`. The count includes both the test admin and the beforeAll admin.

**Fix Needed:**
1. **IMMEDIATE:** Increase `beforeAll` timeout to 30 seconds
2. Adjust test logic to account for the `admin` user from `beforeAll`
3. Or verify the count is correct relative to the initial state
4. Consider using `getActiveAdminCount(excludeUserId)` to exclude the admin making the request

**Code Location:** Lines 482-560 in `users.test.ts`

---

## 2. middleware.test.ts (Compilation error + Multiple failures)

### Current Issue: Compilation Error
**Error:** `Cannot find name 'cleanupExtended'` at line 159

**Fix:** Remove remaining `cleanupExtended()` reference and replace with targeted cleanup

### Tests Failing (after compilation fix):
- "should allow coach to modify assigned team match"
- "should return 403 for coach without team assignment"
- "should return 403 for viewer (cannot modify)"
- "should allow GET requests without CSRF token"
- "should accept valid CSRF token for POST requests"
- "should include CORS headers in response"

**Status:** Failing due to compilation error + test failures  
**Issues:**
1. **Compilation:** Remaining `cleanupExtended` reference needs removal
2. **Team existence errors:** Tests fail with "Team with ID X does not exist" when creating matches
3. **Authentication errors:** CSRF/CORS tests return 401 instead of expected status codes
4. **Timeout issues:** `beforeAll` hooks timing out (15s limit)

**Root Causes:**
1. Cleanup function reference not fully removed
2. Cleanup in `afterEach` may be deleting teams before they're used
3. Tests may need authentication setup before testing CSRF/CORS
4. Team creation timing issues in `beforeEach`
5. Helper initialization taking too long (exceeding Jest timeout)

**Fix Needed:**
1. **IMMEDIATE:** Remove `cleanupExtended()` reference at line 159
2. Ensure teams persist across test cases (don't cleanup teams in `afterEach`)
3. Verify team exists before creating matches
4. Fix CSRF/CORS tests to properly authenticate before testing middleware
5. Review cleanup strategy - only cleanup matches/events, not teams
6. Consider increasing `beforeAll` timeout or optimizing helper initialization

**Code Location:** `src/__tests__/middleware.test.ts` line 159

---

## 3. permissions.test.ts (Multiple failures)

### Status: Most tests skipped due to helper initialization failures

**Issue:** All user helpers (`admin`, `coach`, `coachWithTeam`, `viewer`) fail to initialize properly, causing tests to be skipped.

**Error Pattern:**
```
Skipping admin tests - user not properly initialized
> 36 |     throw new Error(`Failed to create test team: ${error.message}`);
```

**Root Cause:** The `beforeAll` hook fails when creating test teams, which happens after user creation. This suggests:
1. User creation may be succeeding but teams fail
2. Or there's a database state issue causing team creation to fail
3. The error handling in `beforeAll` may need improvement

**Fix Needed:**
1. Investigate why team creation fails in `beforeAll`
2. Add better error handling and retry logic for team creation
3. Verify database state before creating teams
4. Consider creating teams with delays/retries similar to user creation

**Code Location:** `src/__tests__/permissions.test.ts` lines 21-34

**Note:** This is a critical blocker - once fixed, many permission tests should pass.

---

## 4. services.test.ts (Failures unknown - needs investigation)

**Status:** Failing  
**Tests:** Unknown count

**Fix Needed:**
- Run `npm test -- services.test.ts` to identify specific failures
- Review error messages and fix accordingly
- Likely related to service layer data integrity tests

---

## 5. sheets.test.ts (Failures unknown - needs investigation)

**Status:** Failing  
**Tests:** Unknown count

**Fix Needed:**
- Run `npm test -- sheets.test.ts` to identify specific failures
- Review Google Sheets API mocking
- Verify fetch mocking is working correctly
- Check authentication requirements

---

## 6. preferences.test.ts (Failures unknown - needs investigation)

**Status:** Failing  
**Tests:** Unknown count

**Fix Needed:**
- Run `npm test -- preferences.test.ts` to identify specific failures
- Review preference merging logic tests
- Verify JSON parsing robustness tests

---

## 7. ai.test.ts (Failures unknown - needs investigation)

**Status:** Failing  
**Tests:** Unknown count

**Fix Needed:**
- Run `npm test -- ai.test.ts` to identify specific failures
- Review AI service mocking
- Verify Gemini API integration tests

---

## Priority Order

1. **HIGH:** permissions.test.ts - Fix helper initialization (blocks 52 tests)
2. **MEDIUM:** middleware.test.ts - Fix team cleanup and CSRF/CORS tests
3. **LOW:** users.test.ts - Fix admin count logic (1 test)
4. **MEDIUM:** Investigate other suites (services, sheets, preferences, ai)

---

## Common Patterns to Fix

### Pattern 1: Timeout Issues in beforeAll Hooks ⚠️ CRITICAL
- **Symptom:** "Exceeded timeout of 15000 ms for a hook"
- **Affected:** users.test.ts, permissions.test.ts, middleware.test.ts
- **Solution:** 
  - Add timeout to `beforeAll`: `beforeAll(async () => {...}, 30000)`
  - Or set global timeout: `jest.setTimeout(30000)` in test files
  - Consider optimizing helper initialization for test environment

### Pattern 2: Helper Initialization Failures
- **Symptom:** Tests skip with "user not properly initialized"
- **Solution:** Improve retry logic, add delays, verify database state

### Pattern 3: Team Cleanup Issues
- **Symptom:** "Team with ID X does not exist" errors
- **Solution:** Don't cleanup teams in `afterEach`, only cleanup matches/events

### Pattern 4: CSRF Token Missing
- **Symptom:** 403 Forbidden on state-changing requests
- **Solution:** Ensure all POST/PUT/DELETE requests include CSRF tokens

### Pattern 5: Authentication Issues
- **Symptom:** 401 Unauthorized when expecting other status codes
- **Solution:** Verify helpers return valid cookies/CSRF tokens

### Pattern 6: Compilation Errors
- **Symptom:** "Cannot find name 'cleanupExtended'"
- **Solution:** Remove all references to removed cleanup functions, use targeted cleanup

---

## Running Tests

To investigate specific failures:

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- users.test.ts
npm test -- middleware.test.ts
npm test -- permissions.test.ts

# Run with verbose output
npm test -- --verbose

# Run specific test
npm test -- -t "should prevent deleting the last active admin"
```

---

## Notes

- All core functionality tests (auth, teams, matches) are passing at 100%
- Remaining failures are mostly edge cases and helper-dependent tests
- Test infrastructure is solid - failures are test-specific, not infrastructure issues
- Helper functions have been improved with exponential backoff and verification
- Most DELETE requests now have CSRF tokens (fixed in previous session)

---

## Quick Fix Reference

### Fix Timeout Issues (CRITICAL - Do First)
Add to affected test files (`users.test.ts`, `permissions.test.ts`, `middleware.test.ts`):

```typescript
// At the top of the describe block or in beforeAll
jest.setTimeout(30000); // 30 seconds

// Or add timeout to beforeAll specifically
beforeAll(async () => {
  // ... setup code
}, 30000);
```

### Fix Compilation Errors
- Remove all `cleanupExtended()` references
- Replace with targeted cleanup using `db.deleteFrom()`

### Fix Admin Count Logic
In `users.test.ts`, account for the `admin` user from `beforeAll` when counting admins.

---

## Next Steps

1. **CRITICAL:** Fix timeout issues in `beforeAll` hooks (add 30s timeout)
2. Fix middleware.test.ts - investigate why all 23 tests are failing
3. Fix permissions.test.ts - after timeout fix, investigate remaining issues
4. Fix users.test.ts admin count logic (1 test)
5. Investigate and fix remaining suite failures (services, sheets, preferences, ai)
6. Aim for 95%+ test coverage
