# View-Scoped URL State Implementation

**Status:** ✅ **COMPLETED** (Updated: Metric selections moved to localStorage)  
**Date:** January 2025  
**Priority:** HIGH

## Overview

The application now uses **view-scoped URL state** to manage filter and selection state across different views. This enables bookmarkable views, prevents state conflicts between views, and aligns with future features like Saved Views and Custom Dashboards.

**Update:** Metric selections in Game Data view are now stored in localStorage (not URL) to keep URLs short and readable. Only critical filters (team, opponent, date) remain in URLs for bookmarking.

## What Changed

### Before
- Global URL parameters (e.g., `?team=BU13-VT-2026`)
- State conflicts when switching views
- Inconsistent behavior (some state cleared, some persisted)
- Couldn't bookmark specific view configurations

### After
- View-scoped URL parameters (e.g., `?dashboard.team=BU13-VT-2026&clubData.teams=["GU14-VR-2026"]`)
- Each view has independent state
- Predictable behavior (filters in URL, preferences in localStorage)
- Bookmarkable/shareable view configurations (critical filters only)
- Short, readable URLs (metric selections in localStorage)

## Implementation Details

### 1. New Hook: `useViewScopedState`

**Location:** `src/hooks/useViewScopedState.ts`

Wraps `useURLState` with automatic view-scoping:

```typescript
// Dashboard view
const [team, setTeam] = useViewScopedState('dashboard', 'team', null);
// Creates URL param: dashboard.team

// Club Data view
const [teams, setTeams] = useViewScopedState('club-data', 'teams', []);
// Creates URL param: clubData.teams
```

### 1.1. New Hook: `useLocalStorageState`

**Location:** `src/hooks/useLocalStorageState.ts`

Stores UI preferences in localStorage (not URL) to keep URLs short:

```typescript
// Game Data view - metric selections (UI preferences)
const [metrics, setMetrics] = useLocalStorageState('joga.gameData.shootingMetrics', []);
// Stored in localStorage, not URL
```

### 2. View Prefixes

| View Mode | URL Prefix | Example |
|-----------|------------|---------|
| `dashboard` | `dashboard` | `dashboard.team` |
| `game-data` | `gameData` | `gameData.opponents` |
| `club-data` | `clubData` | `clubData.teams` |
| `upload-game-data` | `uploadGameData` | `uploadGameData.*` |
| `data-at-a-glance` | `dataAtAGlance` | `dataAtAGlance.*` |
| `settings` | `settings` | `settings.*` |
| `chat` | `chat` | `chat.*` |

### 3. State Mapping

#### Dashboard View
- `dashboard.team` - Selected team
- `dashboard.opponent` - Selected opponent
- `dashboard.date` - Selected date filter
- `dashboard.chartGroup` - Selected chart group
- `dashboard.dashboardOptions` - Dashboard options (showChartLabels, etc.)
- **Chart selections** - Stored in localStorage (not URL) to keep URLs short:
  - `joga.dashboard.charts` - Selected charts array (localStorage)

#### Game Data View
- `gameData.opponents` - Selected opponents array
- `gameData.team` - Selected team (slug)
- `gameData.date` - Selected date filter
- **Metric selections** - Stored in localStorage (not URL) to keep URLs short:
  - `joga.gameData.shootingMetrics` - Selected shooting metrics (localStorage)
  - `joga.gameData.passingMetrics` - Selected passing metrics (localStorage)
  - `joga.gameData.possessionMetrics` - Selected possession metrics (localStorage)
  - `joga.gameData.jogaMetrics` - Selected JOGA metrics (localStorage)
  - `joga.gameData.defenseMetrics` - Selected defense metrics (localStorage)
  - `joga.gameData.setPiecesMetrics` - Selected set pieces metrics (localStorage)
  - `joga.gameData.otherMetrics` - Selected other metrics (localStorage)

#### Club Data View
- `clubData.teams` - Selected teams array (slugs)
- `clubData.additionalOptions` - Options (boys, girls, blackTeams, showChartLabels)
- `clubData.lastNGames` - Last N games filter
- `clubData.chartGroup` - Selected chart group
- **Chart selections** - Stored in localStorage (not URL) to keep URLs short:
  - `joga.clubData.charts` - Selected charts array (localStorage)

### 4. Removed Code

- ❌ State clearing logic (no longer needed)
- ❌ `prevViewModeRef` tracking
- ❌ Manual state reset on view switch

### 5. Legacy URL Cleanup

The app automatically removes old non-scoped URL parameters for backward compatibility:
- `team`, `opponent`, `date`, `chartGroup`, `charts`
- `gameOpponents`, `selectedClubTeams`, `additionalOptions`
- All metric selection parameters (both non-scoped and view-scoped `gameData.*Metrics`)
- Chart selection parameters (`dashboard.charts`, `clubData.charts`)

**Note:** Metric and chart selections are now stored in localStorage to keep URLs short. Only critical filters (team, opponent, date, chartGroup) remain in URLs for bookmarking. Chart preferences (which metrics are visible in each chart) are stored in the database and sync across devices.

## Benefits

✅ **Bookmarkable Views** - Critical filters (team, opponent, date) are in URL, can be bookmarked/shared  
✅ **Short URLs** - Metric selections stored in localStorage, keeping URLs readable  
✅ **No Conflicts** - Dashboard team selection doesn't affect Club Data team selection  
✅ **Predictable** - Clear rules about what persists (filters in URL, preferences in localStorage)  
✅ **Future-Proof** - Aligns with Saved Views (Phase 4) - saved views are URL snapshots + localStorage preferences  
✅ **Custom Dashboards** - Each dashboard can have its own URL state  
✅ **Persistent Preferences** - Metric selections persist across sessions via localStorage  

## URL Examples

### Dashboard View
```
?view=dashboard&dashboard.team=BU13-VT-2026&dashboard.opponent=TeamA&dashboard.chartGroup=shooting
```
**Note:** Chart selections are stored in localStorage (not URL) to keep URLs short. Only critical filters (team, opponent, date, chartGroup) are in the URL for bookmarking.

### Game Data View
```
?view=game-data&gameData.team=BU13-VT-2026&gameData.opponents=["TeamA","TeamB"]&gameData.date=2024-01-15
```
**Note:** Metric selections are stored in localStorage (not URL) to keep URLs short and readable. Only critical filters (team, opponent, date) are in the URL for bookmarking.

### Club Data View
```
?view=club-data&clubData.teams=["BU13-VT-2026","GU14-VR-2026"]&clubData.chartGroup=all&clubData.lastNGames=10
```
**Note:** Chart selections are stored in localStorage (not URL) to keep URLs short. Only critical filters (teams, chartGroup, lastNGames) are in the URL for bookmarking.

## Migration Notes

- **Backward Compatibility**: Old non-scoped URL params are automatically cleaned up
- **Metric Selections**: Moved from URL to localStorage to keep URLs short and readable
- **Chart Selections**: Moved from URL to localStorage (dashboard.charts, clubData.charts) to keep URLs short
- **Chart Preferences**: Stored in database (synced across devices) - these are different from chart selections
- **URL Length**: URLs now only contain critical filters (team, opponent, date, chartGroup), not UI preferences (metric/chart selections)
- **Consistent Behavior**: Selections persist across sessions via localStorage, while filters are bookmarkable via URL
- **Automatic Cleanup**: Old URL parameters for selections (`gameData.shootingMetrics`, `dashboard.charts`, etc.) are automatically removed from URLs on page load
- **User Impact**: Users with bookmarked URLs using old format will have params removed on first visit
- **New URLs**: All new URLs use view-scoped format automatically
- **No Breaking Changes**: Existing functionality continues to work

## Future Enhancements

### Phase 4: Saved Views
- Saved views will store view-scoped URL state (filters) + localStorage preferences (metric selections)
- Loading a saved view = navigating to the saved URL + restoring localStorage preferences
- Leverages existing infrastructure

### Phase 3: Custom Dashboards
- Each dashboard can have its own URL state namespace
- Dashboard configurations persisted in view-scoped URL
- Enables bookmarking and sharing
- Metric selections stored in localStorage to keep URLs manageable

## Related Documentation

- [VIEW_STATE_MANAGEMENT_RECOMMENDATIONS.md](./VIEW_STATE_MANAGEMENT_RECOMMENDATIONS.md) - Original recommendations and analysis
- [OUTSTANDING_ITEMS.md](./OUTSTANDING_ITEMS.md) - Overall project roadmap
- [STRATEGY_USER_AGENCY.md](./STRATEGY_USER_AGENCY.md) - User agency strategy (references view-scoped state)
