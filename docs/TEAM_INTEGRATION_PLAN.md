# Team Integration Plan: Database Teams in Reporting Views

**Status:** Planning  
**Priority:** HIGH  
**Estimated Time:** 2-3 days

## Problem Statement

Currently, all reporting views (Dashboard, Game Data, Club Data) extract teams directly from match data (Google Sheets). This means:

1. **Team names in spreadsheet** (e.g., "BU13", "Boys U13") populate dropdowns
2. **New teams** created in Team Management use slugs (e.g., "BU13-VT-2026") which are not user-friendly
3. **User will update spreadsheet** to use team slugs (only 43 games, manageable)
4. **Dropdowns should show Display Names** (user-friendly) instead of slugs
5. **Filtering should work** by matching spreadsheet slugs to database teams

## Current Architecture

### How Teams Are Currently Extracted

1. **From Match Data (Google Sheets):**
   - Teams are extracted from a "Team" column in the sheet
   - `getTeamKey()` function finds the team column (e.g., "Team", "team", "Team Name")
   - Teams are extracted as unique values from match data: `[...new Set(matchData.map(m => m[teamKey]))]`
   - Used in: Dashboard, Game Data, Club Data views

2. **From Database:**
   - Teams are stored in `teams` table with structured fields (slug, displayName, gender, level, variant, season)
   - Only used in: Team Management view, Team Assignment
   - Not integrated into reporting views

### Views That Need Updates

1. **Dashboard View** (`App.tsx` - main dashboard)
   - Team selector dropdown
   - Chart filtering by team
   - Stats cards

2. **Game Data View** (`GameDataView.tsx`)
   - Team selector dropdown
   - Match filtering by team
   - Opponent filtering (filtered by selected team)

3. **Club Data View** (`ClubDataView.tsx`)
   - Multi-select team dropdown
   - Team comparison charts
   - Filtering by gender/level/variant

4. **Data at a Glance View** (`DataAtAGlanceView.tsx`)
   - Team extraction from match data

5. **Upload Game Data View** (`UploadGameDataView.tsx`)
   - Team dropdown for new match entry

## Solution Approach

### Simplified Solution: Display Name Mapping

**Goal:** Show user-friendly Display Names in dropdowns while using slugs for filtering

**Approach:**
1. **User updates spreadsheet** - Change team names in Google Sheets to match database team slugs (e.g., "BU13-VT-2026")
2. **Load database teams** - Fetch all active teams from database
3. **Map slugs to Display Names** - When extracting teams from spreadsheet:
   - Extract team names (which are now slugs) from match data
   - Look up each slug in database teams
   - Show Display Name in dropdown (fallback to slug if not found)
4. **Filter by slug** - When filtering match data, use the slug from spreadsheet to match database team

**Pros:**
- ✅ Simple implementation (no mapping UI needed)
- ✅ User-friendly dropdowns (Display Names)
- ✅ Accurate filtering (slugs are unique)
- ✅ Works automatically once spreadsheet is updated
- ✅ No schema changes needed

**Workflow:**
1. User creates teams in Team Management (gets slugs like "BU13-VT-2026")
2. User updates Google Sheets: Change team names to slugs (e.g., "BU13" → "BU13-VT-2026")
3. App loads database teams and creates slug → Display Name mapping
4. Dropdowns show Display Names, filtering uses slugs

### Implementation Plan

#### Step 1: Create Team Mapping Utility

**File:** `src/utils/teamMapping.ts`

```typescript
/**
 * Maps team slugs (from spreadsheet) to database teams
 * Shows Display Names in UI, uses slugs for filtering
 */

import { Team } from '../types/auth';

/**
 * Create a mapping of slug -> Team for quick lookups
 */
export function createTeamSlugMap(databaseTeams: Team[]): Map<string, Team> {
  const map = new Map<string, Team>();
  
  for (const team of databaseTeams) {
    if (team.isActive) {
      // Map by slug (normalized for case-insensitive matching)
      map.set(team.slug.toLowerCase().trim(), team);
    }
  }
  
  return map;
}

/**
 * Get Display Name for a team slug (from spreadsheet)
 * Returns slug if team not found
 */
export function getDisplayNameForSlug(
  slug: string,
  teamSlugMap: Map<string, Team>
): string {
  const normalized = slug.trim().toLowerCase();
  const team = teamSlugMap.get(normalized);
  
  if (team && team.displayName) {
    return team.displayName;
  }
  
  // Fallback to slug if no team found or no display name
  return slug;
}

/**
 * Get database team for a slug (from spreadsheet)
 */
export function getDatabaseTeamForSlug(
  slug: string,
  teamSlugMap: Map<string, Team>
): Team | null {
  const normalized = slug.trim().toLowerCase();
  return teamSlugMap.get(normalized) || null;
}

/**
 * Get teams for dropdown (extract from match data, map to Display Names)
 */
export function getTeamsForDropdown(
  matchDataTeamNames: string[],
  teamSlugMap: Map<string, Team>
): Array<{ slug: string; displayName: string }> {
  const unique = [...new Set(matchDataTeamNames)];
  
  return unique.map(slug => ({
    slug: slug.trim(),
    displayName: getDisplayNameForSlug(slug, teamSlugMap),
  })).sort((a, b) => a.displayName.localeCompare(b.displayName));
}
```

#### Step 2: Update App.tsx (Dashboard View)

**Changes:**
1. Load database teams on mount
2. Extract team slugs from match data (as before)
3. Map slugs to Display Names for dropdown
4. Filter match data by slug when team is selected

**Key Changes:**
```typescript
import { getAllTeams } from './services/teamService';
import { createTeamSlugMap, getTeamsForDropdown, getDatabaseTeamForSlug } from './utils/teamMapping';

// Load database teams
const [databaseTeams, setDatabaseTeams] = useState<Team[]>([]);
const teamSlugMap = useMemo(() => createTeamSlugMap(databaseTeams), [databaseTeams]);

useEffect(() => {
  const loadTeams = async () => {
    try {
      const teams = await getAllTeams();
      setDatabaseTeams(teams);
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };
  loadTeams();
}, []);

// Extract team slugs from match data (as before)
const teamSlugs = useMemo(() => {
  const teamKey = getTeamKey();
  const uniqueTeams = new Set<string>();
  matchData.forEach((match) => {
    const team = match[teamKey];
    if (team && typeof team === 'string' && team.trim()) {
      uniqueTeams.add(team.trim());
    }
  });
  return Array.from(uniqueTeams);
}, [matchData, columnKeys]);

// Map slugs to Display Names for dropdown
const teams = useMemo(() => {
  return getTeamsForDropdown(teamSlugs, teamSlugMap);
}, [teamSlugs, teamSlugMap]);

// Update team selector to show Display Names but store slugs
// In dropdown: show displayName, but value is slug
<select
  value={selectedTeam || ''}
  onChange={(e) => {
    setSelectedTeam(e.target.value || null); // Store slug
  }}
>
  <option value="">Choose a team...</option>
  {teams.map((team) => (
    <option key={team.slug} value={team.slug}>
      {team.displayName}
    </option>
  ))}
</select>

// Filter match data by slug
const filteredMatches = useMemo(() => {
  if (!selectedTeam) return matchData;
  
  const teamKey = getTeamKey();
  return matchData.filter(match => {
    const matchTeamSlug = (match[teamKey] as string)?.trim();
    return matchTeamSlug === selectedTeam; // selectedTeam is the slug
  });
}, [matchData, selectedTeam, columnKeys]);
```

#### Step 3: Update GameDataView.tsx

**Changes:**
1. Accept `teamSlugMap` as prop from App.tsx
2. Extract team slugs from match data (as before)
3. Map slugs to Display Names for dropdown
4. Filter matches by slug when team is selected

#### Step 4: Update ClubDataView.tsx

**Changes:**
1. Accept `teamSlugMap` as prop from App.tsx
2. Extract team slugs from match data (as before)
3. Filter slugs by matching database team properties (gender/level/variant)
4. Map filtered slugs to Display Names for dropdown
5. Filter match data by selected slugs

**Key Changes:**
```typescript
// Extract team slugs from match data
const teamSlugs = useMemo(() => {
  const teamKey = getTeamKey();
  const uniqueTeams = new Set<string>();
  matchData.forEach(match => {
    const team = match[teamKey];
    if (team && typeof team === 'string' && team.trim()) {
      uniqueTeams.add(team.trim());
    }
  });
  return Array.from(uniqueTeams);
}, [matchData, columnKeys]);

// Filter slugs by database team properties
const filteredSlugs = useMemo(() => {
  return teamSlugs.filter(slug => {
    const team = getDatabaseTeamForSlug(slug, teamSlugMap);
    if (!team) return false; // Exclude unmapped teams
    
    // Filter by gender
    if (includeBoysTeams && !includeGirlsTeams && team.gender !== 'boys') return false;
    if (includeGirlsTeams && !includeBoysTeams && team.gender !== 'girls') return false;
    
    // Filter by variant (black teams)
    if (!includeBlackTeams && team.variant === 'black') return false;
    
    return true;
  });
}, [teamSlugs, teamSlugMap, includeBoysTeams, includeGirlsTeams, includeBlackTeams]);

// Map to Display Names for dropdown
const availableClubTeams = useMemo(() => {
  return getTeamsForDropdown(filteredSlugs, teamSlugMap);
}, [filteredSlugs, teamSlugMap]);
```

#### Step 5: Update DataAtAGlanceView.tsx

**Changes:**
1. Accept `teamSlugMap` as prop from App.tsx
2. Extract team slugs from match data (as before)
3. Map slugs to Display Names when displaying teams

#### Step 6: Update UploadGameDataView.tsx

**Changes:**
1. Accept `teamSlugMap` as prop from App.tsx
2. Get all active database teams
3. Show Display Names in dropdown, but save slug to spreadsheet
4. When user selects a team, use the slug value

#### Step 7: Pass teamSlugMap to Child Components

**File:** `src/App.tsx`

**Changes:**
1. Create `teamSlugMap` from database teams
2. Pass `teamSlugMap` as prop to:
   - `GameDataView`
   - `ClubDataView`
   - `DataAtAGlanceView`
   - `UploadGameDataView`

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create `src/utils/teamMapping.ts` with mapping utilities
- [ ] Implement `createTeamSlugMap()` to build slug -> Team mapping
- [ ] Implement `getDisplayNameForSlug()` to get Display Name for a slug
- [ ] Implement `getDatabaseTeamForSlug()` to get Team for a slug
- [ ] Implement `getTeamsForDropdown()` to prepare teams for dropdowns
- [ ] Add team loading to App.tsx
- [ ] Create `teamSlugMap` from database teams
- [ ] Test team mapping with sample data

### Phase 2: Update Views
- [ ] Update App.tsx (Dashboard) to use slug mapping
- [ ] Update team selector to show Display Names, store slugs
- [ ] Update filtering to use slugs
- [ ] Pass `teamSlugMap` to child components

### Phase 2: Dashboard View
- [ ] Update App.tsx to load database teams
- [ ] Replace team extraction with database teams
- [ ] Update team selector to use database teams
- [ ] Filter match data by selected database team
- [ ] Test team filtering in charts

### Phase 3: Game Data View
- [ ] Update GameDataView.tsx to use database teams
- [ ] Replace team extraction with database teams
- [ ] Update team selector
- [ ] Filter matches by database teams
- [ ] Test opponent filtering

### Phase 4: Club Data View
- [ ] Update ClubDataView.tsx to use database teams
- [ ] Replace availableClubTeams with database teams
- [ ] Filter by gender/level/variant using database properties
- [ ] Update multi-select dropdown
- [ ] Filter match data by selected teams
- [ ] Test team comparison charts

### Phase 5: Other Views
- [ ] Update DataAtAGlanceView.tsx
- [ ] Update UploadGameDataView.tsx
- [ ] Test all views with new teams

### Phase 6: Edge Cases & Polish
- [ ] Handle teams in match data that don't match database teams
- [ ] Show warning/notification for unmapped teams
- [ ] Handle empty database teams (fallback to match data extraction)
- [ ] Add loading states for team loading
- [ ] Error handling for team API failures
- [ ] Performance optimization (memoization, caching)

## Edge Cases to Handle

1. **No Database Teams:**
   - Fallback to showing slugs in dropdowns (no Display Name mapping)
   - Show message: "No teams found in database. Showing team slugs from spreadsheet."

2. **Unmapped Teams in Match Data:**
   - If a slug in spreadsheet doesn't match any database team, show slug as-is in dropdown
   - Show warning: "Some teams in spreadsheet don't match database teams"
   - Option to create missing teams from unmapped slugs
   - Filtering still works (by slug), but no Display Name available

3. **Case Sensitivity:**
   - Slug matching should be case-insensitive
   - Normalize whitespace (trim)

4. **Performance:**
   - Cache database teams
   - Memoize teamSlugMap creation
   - Memoize team dropdown generation
   - Build mapping once, reuse for all views

## Testing Plan

1. **Unit Tests:**
   - Test team mapping utility
   - Test team name matching logic
   - Test filtering functions

2. **Integration Tests:**
   - Test team loading in App.tsx
   - Test team filtering in each view
   - Test edge cases (no teams, unmapped teams)

3. **Manual Testing:**
   - Create new teams in Team Management
   - Verify they appear in all reporting views
   - Test team filtering in charts
   - Test with existing match data
   - Test with new match data

## Migration Strategy

### User Workflow
1. **User creates teams** in Team Management (gets slugs like "BU13-VT-2026")
2. **User updates Google Sheets** manually:
   - Change team names in "Team" column to match slugs
   - Example: "BU13" → "BU13-VT-2026"
   - Only 43 games, manageable manual update
3. **App automatically reflects changes**:
   - Dropdowns show Display Names (user-friendly)
   - Filtering uses slugs (accurate)
   - No additional configuration needed

### Implementation Notes
- No gradual migration needed - user updates spreadsheet once
- App works immediately after spreadsheet update
- Fallback to showing slugs if team not found in database

## Success Criteria

1. ✅ New teams created in Team Management appear in all reporting views
2. ✅ Team selectors show database teams (not just match data teams)
3. ✅ Charts filter correctly by selected database teams
4. ✅ Match data is correctly matched to database teams
5. ✅ Existing functionality continues to work
6. ✅ Performance is acceptable (no significant slowdown)

## Future Enhancements

1. **Team Validation:**
   - Validate match data team names against database
   - Warn when uploading matches with unmapped teams
   - Show coverage statistics (how many matches mapped vs unmapped)

2. **Auto-Suggest Teams:**
   - When uploading matches, suggest database teams based on similarity
   - Help user select correct team slug

3. **Bulk Update Tool:**
   - Option to bulk update spreadsheet team names to slugs
   - Export list of current team names vs slugs for reference
   - Preview changes before applying

## Related Documentation

- [TEAM_MANAGEMENT.md](./TEAM_MANAGEMENT.md) - Team management features
- [OUTSTANDING_ITEMS.md](./OUTSTANDING_ITEMS.md) - Overall project roadmap
