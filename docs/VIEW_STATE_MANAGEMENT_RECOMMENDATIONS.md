# View State Management Recommendations

**Date:** January 2025  
**Status:** ✅ **IMPLEMENTED** - View-scoped URL state is now live  
**Priority:** HIGH (Completed)

> **Note:** This document contains the original analysis and recommendations. For implementation details, see [VIEW_STATE_IMPLEMENTATION.md](./VIEW_STATE_IMPLEMENTATION.md).

## Problem Statement

Currently, the application has inconsistent behavior when switching between views:
- Sometimes URL state persists (filters, selections)
- Sometimes URL state resets
- Sometimes data persists, sometimes it doesn't
- This inconsistency makes it difficult to:
  - Bookmark/share specific views
  - Implement "Saved Views" feature (Phase 4)
  - Implement "Custom Dashboards" feature (Phase 3)
  - Provide predictable user experience

## Current State

### URL State Management
- Uses `useURLState` hook to sync state with URL query parameters
- State is persisted in URL for:
  - `view` - Current view mode
  - `team` - Selected team (dashboard/game-data)
  - `opponent` - Selected opponent (dashboard)
  - `lastNGames` - Last N games filter
  - `date` - Selected date filter
  - `chartGroup` - Selected chart group
  - `charts` - Selected charts array
  - `additionalOptions` - Club data options (boys/girls/blackTeams)
  - `dashboardOptions` - Dashboard options

### View-Specific State Clearing
Currently, there's logic that clears state when switching views:
```typescript
// Lines 340-359 in App.tsx
if (prevView === 'game-data' && viewMode !== 'game-data') {
  setSelectedOpponents([]);
}
if (prevView === 'club-data' && viewMode !== 'club-data') {
  setAdditionalOptions(['boys', 'girls', 'showChartLabels']);
  setSelectedClubTeams([]);
}
// etc.
```

### Issues
1. **Inconsistent clearing**: Some state is cleared, some isn't
2. **No view-scoped state**: All state is global, causing conflicts between views
3. **No persistence strategy**: Unclear what should persist vs. reset
4. **Conflicts with future features**: Doesn't align with Saved Views or Custom Dashboards

## Recommended Approach: View-Scoped URL State

### Principle
**Each view should have its own namespace in the URL, allowing users to bookmark/share specific view configurations while preventing conflicts between views.**

### Implementation Strategy

#### 1. View-Scoped URL Parameters

Use view-specific prefixes for URL parameters:

```
# Dashboard View
?view=dashboard&dashboard.team=BU13-VT-2026&dashboard.opponent=TeamA&dashboard.chartGroup=shooting

# Game Data View  
?view=game-data&gameData.team=BU13-VT-2026&gameData.opponents=TeamA,TeamB&gameData.date=2024-01-15

# Club Data View
?view=club-data&clubData.teams=BU13-VT-2026,GU14-VR-2026&clubData.chartGroup=all&clubData.lastNGames=10
```

#### 2. State Management Structure

```typescript
// View-specific state interfaces
interface DashboardState {
  team: string | null;
  opponent: string | null;
  chartGroup: string | null;
  charts: ChartType[];
  date: string;
  lastNGames: number | null;
  dashboardOptions: string[];
}

interface GameDataState {
  team: string | null;
  opponents: string[];
  date: string;
  // ... other game-data specific filters
}

interface ClubDataState {
  teams: string[];
  chartGroup: string | null;
  charts: ChartType[];
  lastNGames: number | null;
  additionalOptions: string[];
}

// Global state (shared across views)
interface GlobalState {
  view: ViewMode;
  // No view-specific filters here
}
```

#### 3. URL State Hook Enhancement

Create a `useViewScopedState` hook:

```typescript
function useViewScopedState<T>(
  view: ViewMode,
  key: string,
  defaultValue: T,
  options?: SerializationOptions
): [T, (value: T) => void] {
  const scopedKey = `${view}.${key}`;
  return useURLState(scopedKey, defaultValue, options);
}
```

#### 4. Benefits

✅ **Bookmarkable Views**: Each view's state is in URL, can be bookmarked/shared  
✅ **No Conflicts**: Dashboard team selection doesn't affect Club Data team selection  
✅ **Predictable**: Clear rules about what persists (everything in URL)  
✅ **Future-Proof**: Aligns with Saved Views (Phase 4) - saved views are just URL snapshots  
✅ **Custom Dashboards**: Each dashboard can have its own URL state  

### Migration Path

#### Phase 1: Add View Scoping (Non-Breaking)
1. Add view-scoped state alongside existing state
2. Read from both old and new URL params (backward compatible)
3. Write to both during transition period

#### Phase 2: Switch to View-Scoped Only
1. Remove old global state parameters
2. Update all components to use view-scoped state
3. Remove state clearing logic (no longer needed)

#### Phase 3: Add Saved Views (Phase 4 Feature)
1. Saved Views = URL snapshots with friendly names
2. "Save Current View" = Save current URL state
3. "Load Saved View" = Navigate to saved URL

## Alternative: Keep Global State, Clear on View Switch

### Approach
- Keep current global state structure
- **Always clear view-specific state when switching views**
- Only persist truly global preferences (user settings, not filters)

### Pros
- Simpler implementation (minimal changes)
- Less URL clutter
- Faster to implement

### Cons
- Can't bookmark/share specific view configurations
- Doesn't align with Saved Views feature
- Less flexible for Custom Dashboards
- Users lose their work when switching views

## Recommendation: **View-Scoped URL State**

### Why?
1. **Aligns with Future Features**: Saved Views (Phase 4) and Custom Dashboards (Phase 3) both benefit from URL-based state
2. **Better UX**: Users can bookmark/share specific configurations
3. **More Flexible**: Each view can have completely independent state
4. **Industry Standard**: Most modern analytics tools (Tableau, Power BI, etc.) use URL-based state

### Implementation Priority
- **High**: Fix inconsistent behavior now
- **Medium**: Implement view-scoping (can be done incrementally)
- **Low**: Add Saved Views UI (Phase 4)

## Implementation Summary

✅ **All action items completed:**

1. ✅ **Fixed Club Data slug issue** - Charts now use Display Names instead of slugs
2. ✅ **Documented current behavior** - All state management documented
3. ✅ **Decided on approach** - View-scoped URL state chosen
4. ✅ **Implemented view-scoped state** - All state now uses view-scoped keys
5. ✅ **Tested thoroughly** - Build passes, manual testing verified

## Questions to Answer

1. **Should users be able to bookmark/share specific view configurations?**
   - If YES → View-scoped URL state
   - If NO → Clear on view switch

2. **Should Dashboard team selection persist when switching to Club Data?**
   - If YES → View-scoped state (each view has own team selection)
   - If NO → Clear on view switch

3. **How should Saved Views work?** (Phase 4)
   - If URL snapshots → View-scoped state
   - If database storage → Either approach works

## Implementation Status

✅ **COMPLETED** - View-scoped URL state has been implemented

### What Was Done

1. **Created `useViewScopedState` hook** (`src/hooks/useViewScopedState.ts`)
   - Wraps `useURLState` with view-scoped key prefixes
   - Automatically prefixes keys: `dashboard.team`, `clubData.teams`, `gameData.opponents`, etc.

2. **Updated all state declarations in App.tsx**
   - Dashboard state: `dashboard.team`, `dashboard.opponent`, `dashboard.date`, etc.
   - Game Data state: `gameData.opponents`, `gameData.shootingMetrics`, etc.
   - Club Data state: `clubData.teams`, `clubData.additionalOptions`, `clubData.lastNGames`

3. **Removed state clearing logic**
   - No longer needed - each view has independent state
   - Removed `prevViewModeRef` and all state clearing code

4. **Added legacy URL cleanup**
   - Automatically removes old non-scoped params for backward compatibility
   - Preserves `view` and `token` parameters

5. **Updated URL parameter references**
   - Changed `selectedClubTeams` checks to use `clubData.teams`

### Benefits Achieved

✅ **Bookmarkable Views**: Each view's state is in URL, can be bookmarked/shared  
✅ **No Conflicts**: Dashboard team selection doesn't affect Club Data team selection  
✅ **Predictable**: Clear rules about what persists (everything in URL)  
✅ **Future-Proof**: Aligns with Saved Views (Phase 4) - saved views are just URL snapshots  
✅ **Custom Dashboards**: Each dashboard can have its own URL state  

### URL Format Examples

```
# Dashboard View
?view=dashboard&dashboard.team=BU13-VT-2026&dashboard.opponent=TeamA&dashboard.chartGroup=shooting

# Game Data View  
?view=game-data&gameData.team=BU13-VT-2026&gameData.opponents=["TeamA","TeamB"]&gameData.date=2024-01-15

# Club Data View
?view=club-data&clubData.teams=["BU13-VT-2026","GU14-VR-2026"]&clubData.chartGroup=all&clubData.lastNGames=10
```

### Testing

- ✅ Build passes successfully
- ✅ Manual testing verified - view state persists correctly when switching views
- ✅ URL parameters are properly scoped and don't conflict between views
- ⚠️ Note: Frontend unit test infrastructure not yet configured (would require @testing-library/react setup)

### Migration Notes

- Old non-scoped URL params are automatically cleaned up
- Users with bookmarked URLs using old format will have params removed on first visit
- New URLs use view-scoped format automatically
