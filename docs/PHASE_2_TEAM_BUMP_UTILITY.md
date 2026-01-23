# Phase 2: Team Bump Utility

## Overview

The Team Bump Utility is a feature that allows administrators to automatically create teams for the next season based on existing teams from the current season. This eliminates the need to manually create teams each year and automatically maintains parent-child relationships for team continuity.

## Goals

1. **Automate team creation** - Create next season's teams from current season's teams
2. **Maintain continuity** - Automatically link new teams as children of previous season's teams
3. **Update levels appropriately** - Increment age levels (U13 → U14, U12 → U13, etc.)
4. **Preserve team attributes** - Keep gender, variant, and other team properties
5. **Bulk operations** - Allow creating multiple teams at once with preview

## User Workflow

1. Admin navigates to Settings → Teams
2. Selects the current season (e.g., 2025)
3. Clicks "Create Next Season Teams" button
4. System shows preview modal with:
   - Source teams (current season)
   - Target teams (next season) with calculated levels
   - Parent-child relationship mappings
5. Admin can:
   - Select which teams to copy forward (checkboxes)
   - Review the mappings
   - See any warnings (e.g., next season doesn't exist)
6. Admin confirms creation
7. System creates all selected teams and links them as children

## Technical Implementation

### Backend API Endpoint

**POST `/api/teams/bump`**

Request body:
```typescript
{
  sourceSeasonId: number;
  targetSeasonId: number;
  teamIds?: number[]; // Optional: specific teams to bump, otherwise all active teams
}
```

Response:
```typescript
{
  created: number; // Number of teams created
  teams: Team[]; // Created teams
  errors?: string[]; // Any errors encountered
}
```

### Backend Service Function

```typescript
export async function bumpTeamsToNextSeason(
  sourceSeasonId: number,
  targetSeasonId: number,
  teamIds?: number[]
): Promise<{
  created: number;
  teams: Team[];
  errors: string[];
}> {
  // 1. Validate seasons exist
  // 2. Get source teams (filter by teamIds if provided)
  // 3. For each source team:
  //    - Calculate new level (increment age: U13 → U14)
  //    - Generate new slug with target season year
  //    - Create new team with same gender, variant, etc.
  //    - Link as child of source team (parent_team_id)
  // 4. Return results
}
```

### Frontend Component

**Location**: `src/components/TeamManagement.tsx`

Add button:
```tsx
<button
  onClick={() => setShowBumpModal(true)}
  className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
  disabled={!selectedSeasonId}
>
  Create Next Season Teams
</button>
```

**BumpTeamsModal Component**:
- Shows preview of teams to be created
- Allows selection of which teams to bump
- Shows calculated levels and slugs
- Shows parent-child relationships
- Handles creation and error display

## Level Calculation Logic

When bumping a team:
- Extract age from level (e.g., U13 → 13)
- Increment age by 1 (13 → 14)
- Generate new level (14 → U14)
- If level calculation fails, show warning and allow manual override

## Age Group Auto-Setting

When creating teams via the bump utility, age groups are automatically calculated using the level-to-age-group mapping:

- **Mapping function**: `calculateAgeGroupFromLevel(level, seasonYear)` 
  - Located in: `src/config/levelToAgeGroup.ts` (frontend) and `backend/src/services/teamService.ts` (backend)
- **Calculation**: `seasonYear - levelAge = birthYear` → `"Aug {birthYear} - July {birthYear + 1}"`
- **Example**: U13 in 2026 → Aug 2013 - July 2014

The calculated age group will be automatically set for each bumped team, ensuring coaches have the correct age group information without manual entry.

## Edge Cases

1. **Next season doesn't exist**
   - Show warning: "Target season must be created first"
   - Provide link/button to create season

2. **Team already exists in target season**
   - Check for duplicate slugs
   - Skip or show warning

3. **Invalid level format**
   - Show error for teams with invalid levels
   - Allow manual level override in preview

4. **No active teams in source season**
   - Show message: "No active teams found in selected season"

5. **Partial failures**
   - Continue creating other teams if one fails
   - Report all errors at the end

## Future Enhancements

1. **Bulk level adjustments** - Allow adjusting all levels by a custom amount
2. **Team merging** - Handle cases where multiple teams should merge
3. **Automatic season creation** - Optionally create next season if it doesn't exist
4. **Preview with changes** - Show what will change (level, slug, etc.) before confirming
5. **Undo functionality** - Allow rolling back a bump operation

## Database Considerations

- No schema changes needed
- Uses existing `parent_team_id` field
- Uses existing team creation logic
- Maintains referential integrity

## Testing Checklist

- [ ] Bump single team to next season
- [ ] Bump multiple teams at once
- [ ] Verify parent-child relationships are created
- [ ] Verify levels are incremented correctly
- [ ] Verify slugs include new season year
- [ ] Handle missing target season
- [ ] Handle duplicate team slugs
- [ ] Handle invalid level formats
- [ ] Verify age groups are auto-calculated for new teams
- [ ] Test with teams that already have children
- [ ] Test with teams from different seasons

## Related Documentation

- [Team Management](./TEAM_MANAGEMENT.md) - General team management features
- [Age Group System](./AGE_GROUP_SYSTEM.md) - Age group calculation and display
