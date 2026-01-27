# Outstanding Items & Future Phases

**Last Updated:** January 2025  
**Purpose:** Comprehensive list of all planned features, improvements, and technical debt organized by priority and phase.

---

## Table of Contents

1. [Chart Customization (Phase 0.5)](#chart-customization-phase-05)
2. [User Agency Features](#user-agency-features)
3. [Team Management Enhancements](#team-management-enhancements)
4. [Security & Testing](#security--testing)
5. [Infrastructure & Deployment](#infrastructure--deployment)
6. [Future Enhancements](#future-enhancements)

---

## Chart Customization (Phase 0.5)

**Status:** ✅ COMPLETE - All 18 charts implemented with config panels  
**Priority:** HIGH  
**Estimated Time:** 30-40 hours total (COMPLETED)

### Completed
- ✅ ShotsChart - Fully implemented with config panel
- ✅ PossessionChart - Fully implemented with config panel
- ✅ GoalsChart - Fully implemented with config panel (Batch 1)
- ✅ xGChart - Fully implemented with config panel (Batch 1)
- ✅ ConversionRateChart - Fully implemented with config panel (Batch 1)
- ✅ TSRChart - Fully implemented with config panel (Batch 1)
- ✅ PassesChart - Fully implemented with config panel (Batch 2)
- ✅ PassShareChart - Fully implemented with config panel (Batch 2)
- ✅ AvgPassLengthChart - Fully implemented with config panel (Batch 2)
- ✅ PPMChart - Fully implemented with config panel (Batch 2)
- ✅ PassStrLengthChart - Fully implemented with config panel (Batch 2)
- ✅ SPIChart - Fully implemented with config panel (Batch 3)
- ✅ AttemptsChart - Fully implemented with config panel (Batch 3)
- ✅ MiscStatsChart - Fully implemented with config panel (Batch 3)
- ✅ PositionalAttemptsChart - Fully implemented with config panel (Batch 4)
- ✅ PassByZoneChart - Fully implemented with config panel (Batch 4)
- ✅ AutoChart - Expansion support added (Batch 4 - uses different config system)

### Technical Implementation
- ✅ Created `useChartConfig` hook to reduce boilerplate
- ✅ Extended `ChartConfig` type system for all chart types
- ✅ Added default configs for all charts in `chartConfig.ts`
- ✅ Updated `getChartTitle()` to handle all chart types
- ✅ Updated `isChartCustomized()` for all chart types
- ✅ Integrated `ChartConfigPanel` component across all charts
- ✅ Added expansion support for all charts
- ✅ Implemented global opponent toggle support

**Reference:** [PHASE_0.5_CHART_CUSTOMIZATION_PLAN.md](./PHASE_0.5_CHART_CUSTOMIZATION_PLAN.md)

---

## User Agency Features

**Goal:** Transform app from static reporting tool to dynamic analysis platform where coaches can create, customize, and save their own visualizations.

### Phase 1: Custom Charts (Weeks 3-6)
**Status:** ✅ COMPLETE - Phase 1 implemented  
**Priority:** HIGH  
**Estimated Time:** 3-4 weeks (COMPLETED)

**Completed:**
- ✅ Create `CustomChartBuilder` component (with modal overlay, confirmation dialog)
- ✅ Create `DynamicChartRenderer` component (supports line, bar, area, scatter charts)
- ✅ Add `custom_charts` database table (with migrations)
- ✅ Create API routes for custom charts:
  - ✅ `POST /api/custom-charts` - Create chart
  - ✅ `GET /api/custom-charts` - List user's charts
  - ✅ `GET /api/custom-charts/:id` - Get chart config
  - ✅ `PUT /api/custom-charts/:id` - Update chart
  - ✅ `DELETE /api/custom-charts/:id` - Delete chart
- ✅ Integrate custom charts into Charts dropdown (individual chart selection)
- ✅ Add "Create Custom Chart" action to Charts dropdown
- ✅ Add custom chart management to Settings view (edit/delete)
- ✅ Custom charts react to global filters (Last N Games, Team, Opponent, Date)
- ✅ Custom charts support expansion (full-width toggle)
- ✅ Custom charts support `showLabels` option
- ✅ Chart builder modal with dark blurred background (matching walkthrough style)
- ✅ Confirmation dialog for canceling chart creation (matching walkthrough pattern)

**Remaining (Future Phases):**
- [ ] Create `MetricExplorer` component (for Phase 2: Calculated Metrics)
- [ ] Add chart library/export functionality (Phase 4)

**Reference:** [ROADMAP_USER_AGENCY.md](./ROADMAP_USER_AGENCY.md), [STRATEGY_USER_AGENCY.md](./STRATEGY_USER_AGENCY.md)

### Phase 2: Calculated Metrics (Weeks 7-10)
**Priority:** MEDIUM  
**Estimated Time:** 3-4 weeks

- [ ] Create `CalculatedMetricBuilder` component
- [ ] Create `FormulaEditor` component
- [ ] Build formula engine/parser (mathjs or custom)
- [ ] Add `calculated_metrics` database table
- [ ] Create API routes for calculated metrics:
  - `POST /api/calculated-metrics` - Create metric
  - `GET /api/calculated-metrics` - List metrics (user's + public)
  - `PUT /api/calculated-metrics/:id` - Update metric
  - `DELETE /api/calculated-metrics/:id` - Delete metric
  - `POST /api/calculated-metrics/:id/evaluate` - Test formula
- [ ] Integrate calculated metrics into chart builder
- [ ] Add validation and error handling
- [ ] Support for:
  - Basic math: `+`, `-`, `*`, `/`, `%`
  - Functions: `AVG()`, `SUM()`, `COUNT()`, `MIN()`, `MAX()`
  - Conditional: `IF()`, `CASE WHEN`
  - Time-based: `PER_90()`, `PER_GAME()`

**Reference:** [ROADMAP_USER_AGENCY.md](./ROADMAP_USER_AGENCY.md), [STRATEGY_USER_AGENCY.md](./STRATEGY_USER_AGENCY.md)

### Phase 3: Custom Dashboards (Weeks 9-12)
**Priority:** MEDIUM  
**Estimated Time:** 3-4 weeks

**Prerequisites:**
- ✅ View-scoped URL state implemented (enables dashboard state persistence)

- [ ] Create `DashboardBuilder` component
- [ ] Create `DashboardWidget` component
- [ ] Integrate drag-and-drop (react-grid-layout)
- [ ] Add `custom_dashboards` database table
- [ ] Create API routes for dashboards:
  - `POST /api/dashboards` - Create dashboard
  - `GET /api/dashboards` - List user's dashboards
  - `GET /api/dashboards/:id` - Get dashboard
  - `PUT /api/dashboards/:id` - Update dashboard
  - `DELETE /api/dashboards/:id` - Delete dashboard
  - `POST /api/dashboards/:id/set-default` - Set as default
- [ ] Add dashboard selector to navigation
- [ ] Implement default dashboard setting
- [ ] Widget features:
  - Configurable refresh intervals
  - Export to image/PDF
  - Fullscreen mode
  - Edit/delete controls
- [ ] Leverage view-scoped URL state for dashboard state persistence

**Reference:** [ROADMAP_USER_AGENCY.md](./ROADMAP_USER_AGENCY.md), [STRATEGY_USER_AGENCY.md](./STRATEGY_USER_AGENCY.md), [VIEW_STATE_MANAGEMENT_RECOMMENDATIONS.md](./VIEW_STATE_MANAGEMENT_RECOMMENDATIONS.md)

### Phase 4: Advanced Features (Weeks 15-18)
**Priority:** LOW  
**Estimated Time:** 3-4 weeks

**Prerequisites:**
- ✅ View-scoped URL state implemented (saved views = URL snapshots)

- [ ] Create `SavedViewsManager` component
- [ ] Create `ReportBuilder` component
- [ ] Create `ComparisonView` component
- [ ] Add sharing/collaboration features
- [ ] Add scheduled report functionality
- [ ] Add export capabilities (PDF, Excel)
- [ ] Add `saved_views` database table
- [ ] Add `custom_reports` database table
- [ ] Features:
  - Save current filter/selection state (leverages view-scoped URL state)
  - Quick access menu
  - Share with other users
  - Organize into folders
  - Side-by-side comparison of teams/periods/metrics
  - Automated email reports
  - Template system

**Reference:** [ROADMAP_USER_AGENCY.md](./ROADMAP_USER_AGENCY.md), [STRATEGY_USER_AGENCY.md](./STRATEGY_USER_AGENCY.md), [VIEW_STATE_MANAGEMENT_RECOMMENDATIONS.md](./VIEW_STATE_MANAGEMENT_RECOMMENDATIONS.md)

---

## Team Management Enhancements

### Phase 2: Team Bump Utility
**Priority:** MEDIUM  
**Estimated Time:** 1-2 weeks  
**Status:** Documented, not implemented

**Goal:** Automatically create teams for next season based on current season's teams.

- [ ] Create backend API endpoint: `POST /api/teams/bump`
- [ ] Implement `bumpTeamsToNextSeason()` service function
- [ ] Create `BumpTeamsModal` component in frontend
- [ ] Add "Create Next Season Teams" button to Team Management
- [ ] Implement level calculation logic (U13 → U14)
- [ ] Auto-calculate age groups for bumped teams
- [ ] Handle edge cases:
  - Next season doesn't exist
  - Team already exists in target season
  - Invalid level format
  - No active teams in source season
  - Partial failures
- [ ] Add preview modal with:
  - Source teams (current season)
  - Target teams (next season) with calculated levels
  - Parent-child relationship mappings
  - Selection checkboxes
- [ ] Testing checklist:
  - [ ] Bump single team to next season
  - [ ] Bump multiple teams at once
  - [ ] Verify parent-child relationships are created
  - [ ] Verify levels are incremented correctly
  - [ ] Verify slugs include new season year
  - [ ] Handle missing target season
  - [ ] Handle duplicate team slugs
  - [ ] Handle invalid level formats
  - [ ] Verify age groups are auto-calculated
  - [ ] Test with teams that already have children

**Reference:** [PHASE_2_TEAM_BUMP_UTILITY.md](./PHASE_2_TEAM_BUMP_UTILITY.md)

### Future Team Management Enhancements
**Priority:** LOW

- [ ] Team inheritance logic (auto-inherit coach assignments from parent)
- [ ] Circular reference prevention (backend validation)
- [ ] Visual hierarchy (tree view, expandable groups)
- [ ] Smart parent suggestions (filter by matching gender/level/variant)
- [ ] Bulk operations (create teams for new season wizard)
- [ ] Team templates (save configurations, apply templates)
- [ ] Team history/timeline (visual evolution across seasons)
- [ ] Advanced filtering & search (gender, level, variant, parent/child status)
- [ ] Hard delete option (with confirmation and cascade handling)
- [ ] Export/Import (CSV/JSON, bulk creation from spreadsheet)
- [ ] Team aliases UI (manage aliases, search by alias)
- [ ] Role-based team access enhancements

**Reference:** [TEAM_MANAGEMENT.md](./TEAM_MANAGEMENT.md)

---

## Technical Infrastructure

### View-Scoped URL State Management
**Status:** ✅ **COMPLETED**  
**Priority:** HIGH (Completed)

- ✅ Implemented `useViewScopedState` hook for view-scoped URL parameters
- ✅ All view state now uses scoped keys (e.g., `dashboard.team`, `clubData.teams`)
- ✅ Removed state clearing logic - each view has independent persistent state
- ✅ Added legacy URL parameter cleanup for backward compatibility
- ✅ Enables bookmarkable/shareable view configurations
- ✅ Aligns with future Saved Views and Custom Dashboards features

**Benefits:**
- Bookmarkable views (each view's state in URL)
- No conflicts between views (dashboard team doesn't affect club data)
- Predictable behavior (everything in URL persists)
- Future-proof (saved views = URL snapshots)

**Reference:** [VIEW_STATE_MANAGEMENT_RECOMMENDATIONS.md](./VIEW_STATE_MANAGEMENT_RECOMMENDATIONS.md)

---

## Security & Testing

### Security Remediation
**Status:** ✅ All 6 high/medium priority issues remediated

**Completed:**
- ✅ Race-to-First-Admin vulnerability (bootstrap secret)
- ✅ Matches API role checks
- ✅ Google Sheets credentials moved to backend
- ✅ AI API keys moved to backend
- ✅ Session management (HttpOnly cookies, CSRF, CSP headers)
- ✅ Account lifecycle information leakage (error normalization, token expiry, rate limiting)

**Remaining Actions:**
- ⚠️ Rotate all previously exposed API keys (user confirmed keys were rotated)

**Reference:** [SECURITY_REMEDIATION_PLAN.md](./SECURITY_REMEDIATION_PLAN.md)

### Test Suite Improvements
**Status:** ~153/171 tests passing (89%)

**High Priority:**
- [ ] Fix timeout issues in `beforeAll` hooks (users.test.ts, permissions.test.ts, middleware.test.ts)
- [ ] Fix helper initialization failures in permissions.test.ts
- [ ] Fix compilation error in middleware.test.ts (`cleanupExtended` reference)
- [ ] Fix admin count logic in users.test.ts

**Medium Priority:**
- [ ] Investigate and fix services.test.ts failures
- [ ] Investigate and fix sheets.test.ts failures
- [ ] Investigate and fix preferences.test.ts failures
- [x] Simplify Settings UI - Removed unused preference sections (theme, email notifications, default chart type, advanced customizations) and merged preferences into Account tab
- [ ] Investigate and fix ai.test.ts failures

**Target:** 95%+ test coverage

**Reference:** [TEST_FAILURES.md](./TEST_FAILURES.md)

---

## Infrastructure & Deployment

### Railway Deployment
**Status:** ✅ Core deployment working

**Remaining:**
- [ ] Set up database backups (see Phase 6 plan in RAILWAY_DEPLOYMENT_QUICKSTART.md)
- [ ] Document backup/restore procedures
- [ ] Set up monitoring/alerting
- [ ] Document rollback procedures

**Reference:** [RAILWAY_DEPLOYMENT_QUICKSTART.md](./RAILWAY_DEPLOYMENT_QUICKSTART.md), [RAILWAY_DATABASE_PERSISTENCE.md](./RAILWAY_DATABASE_PERSISTENCE.md)

---

## Future Enhancements

### Post-Phase 4 Features
**Priority:** LOW  
**Status:** Ideas only, not planned

- [ ] AI-Powered Suggestions ("Based on your data, you might want to compare...")
- [ ] Anomaly Detection (automatic alerts for unusual patterns)
- [ ] Predictive Analytics (forecast future performance)
- [ ] Mobile App (view dashboards on mobile devices)
- [ ] API Access (programmatic access to custom charts/data)
- [ ] Integration (connect with other tools: Excel, Tableau, etc.)

**Reference:** [STRATEGY_USER_AGENCY.md](./STRATEGY_USER_AGENCY.md)

---

## Quick Reference: Implementation Priority

### Must Have (MVP)
- ✅ Chart configuration panel (Phase 0.5) - **COMPLETE**: All 18/18 charts done
- [ ] Custom chart builder with basic chart types (Phase 1)
- [ ] Dynamic chart renderer (Phase 1)
- [ ] Save/load custom charts (Phase 1)
- [ ] Calculated metrics with basic formulas (Phase 2)

### Should Have
- [ ] Custom dashboards with drag-and-drop (Phase 3)
- [ ] Saved views/bookmarks (Phase 4)
- [ ] Sharing capabilities (Phase 4)
- [ ] Team bump utility (Phase 2)

### Nice to Have
- [ ] Scheduled reports (Phase 4)
- [ ] Advanced formula functions (Phase 2)
- [ ] Comparison views (Phase 4)
- [ ] Public gallery (Phase 4)
- [ ] Team management enhancements (future)

---

## Notes

- All phases are documented with detailed implementation plans
- Security issues have been fully remediated
- Test suite needs attention but core functionality is well-tested
- Chart customization is the highest priority quick win
- User agency features will transform the app into a self-service platform

---

## Related Documentation

- [PHASE_0.5_CHART_CUSTOMIZATION_PLAN.md](./PHASE_0.5_CHART_CUSTOMIZATION_PLAN.md) - Chart customization implementation
- [PHASE_2_TEAM_BUMP_UTILITY.md](./PHASE_2_TEAM_BUMP_UTILITY.md) - Team bump utility design
- [ROADMAP_USER_AGENCY.md](./ROADMAP_USER_AGENCY.md) - User agency roadmap
- [STRATEGY_USER_AGENCY.md](./STRATEGY_USER_AGENCY.md) - User agency strategy
- [VIEW_STATE_MANAGEMENT_RECOMMENDATIONS.md](./VIEW_STATE_MANAGEMENT_RECOMMENDATIONS.md) - View-scoped URL state (✅ Implemented)
- [SECURITY_REMEDIATION_PLAN.md](./SECURITY_REMEDIATION_PLAN.md) - Security fixes
- [TEST_FAILURES.md](./TEST_FAILURES.md) - Test suite status
- [TEAM_MANAGEMENT.md](./TEAM_MANAGEMENT.md) - Team management docs
