# Testing TODOs and Outstanding Items

**Last Updated:** January 2025  
**Related:** [TESTING_IMPROVEMENTS.md](../TESTING_IMPROVEMENTS.md)

## Completed ✅

All critical testing infrastructure improvements have been completed:
- ✅ Top-level test scripts
- ✅ Test database isolation
- ✅ Rate limiting disabled in tests
- ✅ Removed setTimeout hacks
- ✅ Shared API stub helpers

## Outstanding Items

### 1. React Testing Library Setup
**Status:** Pending  
**Priority:** Medium  
**Estimated Time:** 4-6 hours

**Tasks:**
- [ ] Add testing dependencies to root `package.json`:
  - `@testing-library/react`
  - `@testing-library/jest-dom`
  - `@testing-library/user-event`
  - `jest` and `jest-environment-jsdom`
- [ ] Create `jest.config.js` in root directory
- [ ] Configure Vite to work with Jest
- [ ] Create example tests for:
  - `src/components/UploadGameDataView.tsx` - Form validation, preview states, error handling
  - `src/components/GoalsChart.tsx` - Chart rendering, data formatting
  - `src/components/MatchEditorView.tsx` - Search, selection, edit flows

**Reference:** [TESTING_IMPROVEMENTS.md](../TESTING_IMPROVEMENTS.md#6--react-testing-library-setup)

### 2. E2E Tests (Playwright/Cypress)
**Status:** Future Enhancement  
**Priority:** Low  
**Estimated Time:** 8-12 hours

**Tasks:**
- [ ] Choose framework (Playwright recommended)
- [ ] Set up E2E test configuration
- [ ] Create test suite covering:
  - Setup wizard flow
  - Login/logout cookie flow
  - Match CRUD operations
  - Upload game data workflow
  - AI chat interactions
  - CSRF token handling

**Reference:** [TESTING_IMPROVEMENTS.md](../TESTING_IMPROVEMENTS.md#7--e2e-tests-playwrightcypress)

### 3. Fix Existing Test Failures
**Status:** Ongoing  
**Priority:** High  
**Reference:** [TEST_FAILURES.md](./TEST_FAILURES.md)

**Known Issues:**
- [ ] Fix timeout issues in `beforeAll` hooks (users.test.ts, permissions.test.ts, middleware.test.ts)
- [ ] Fix helper initialization failures in permissions.test.ts
- [ ] Fix compilation error in middleware.test.ts (`cleanupExtended` reference)
- [ ] Fix admin count logic in users.test.ts
- [ ] Investigate and fix services.test.ts failures
- [ ] Investigate and fix sheets.test.ts failures
- [ ] Investigate and fix preferences.test.ts failures
- [ ] Investigate and fix ai.test.ts failures

**Target:** 95%+ test coverage

### 4. Code TODOs Related to Testing

#### Backend TODOs
- [ ] `backend/src/scripts/migrate-sheets-to-postgres.ts:147` - "TODO: Implement update logic if needed"
  - **Context:** Migration script for Google Sheets to PostgreSQL
  - **Priority:** Low (only needed if update functionality is required)
  
- [ ] `backend/src/services/matchStatsService.ts:118-120` - "TODO: formula needed" for weighted SPI
  - **Context:** SPI (w) and Opp SPI (w) formulas need to be implemented
  - **Priority:** Medium (affects computed stats)

#### Frontend TODOs
- [ ] `src/App.tsx.bak:1378` - "TODO: Add logic for different views"
  - **Note:** This is a backup file (`.bak`), likely not relevant

## Implementation Priority

1. **High Priority:**
   - Fix existing test failures (improve reliability)
   - React Testing Library setup (frontend coverage)

2. **Medium Priority:**
   - Implement weighted SPI formulas
   - E2E test framework selection and initial setup

3. **Low Priority:**
   - Migration script update logic
   - Comprehensive E2E test suite

## Notes

- All critical testing infrastructure is complete
- Test suite is faster and more reliable after recent improvements
- Frontend testing is the next logical step
- E2E tests can be added incrementally as features are developed
