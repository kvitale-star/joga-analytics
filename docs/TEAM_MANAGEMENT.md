# Team Management Documentation

## Overview

Team management allows administrators to create, edit, and organize teams across multiple seasons. Teams can be linked via parent-child relationships to maintain continuity across seasons (e.g., "U13 Boys 2025" → "U13 Boys 2026").

## Current Implementation Status

### ✅ Completed Features

#### 1. **Team CRUD Operations**
- Create teams with structured data (gender, level, variant, birth years, season)
- Edit existing teams
- Deactivate teams (soft delete - teams remain in history)
- View all teams filtered by season

#### 2. **Parent-Child Relationships**
- **Parent Team Selection**: When creating or editing a team, you can select a parent team from a different season
- **Visual Indicators**: Teams table shows:
  - Parent relationship: "Parent: BU13 (2025)"
  - Child count: "2 child team(s)"
- **Automatic Filtering**: Parent team dropdown only shows:
  - Teams from different seasons
  - Active teams
  - Excludes the current team (can't be own parent)

#### 3. **Team Structure**
- **Required Fields**:
  - Season (year-based, e.g., "2025", "2026")
  - Gender (boys/girls)
  - Level (e.g., "U13", "U12")
  - Variant (volt/valor)
  - Birth year start/end
- **Auto-Generated**:
  - Slug (e.g., "BU13" for Boys U13 Volt, "BU13VR" for Boys U13 Valor)
  - Display name (if not provided)

#### 4. **Coach Assignments**
- Assign multiple coaches to teams
- View assigned coaches per team
- Remove coach assignments

#### 5. **Season Management**
- Create new seasons (year-based)
- Set active season
- Filter teams by season

## How to Use

### Creating Teams Across Seasons

**Scenario**: Create "U13 Boys" for both 2025 and 2026 seasons, linking them.

1. **Create Previous Season Team**:
   - Navigate to Settings → Teams
   - Click "+ Create Team"
   - Select previous season (e.g., "2025")
   - Fill in:
     - Gender: Boys
     - Level: U13
     - Variant: Volt
     - Birth year start: 2013
     - Birth year end: 2014
   - Leave "Parent Team" as "None (no parent)"
   - Click "Save"
   - Note the team slug (e.g., "BU13-2025")

2. **Create Current Season Team**:
   - Click "+ Create Team" again
   - Select current season (e.g., "2026")
   - Fill in the same team details:
     - Gender: Boys
     - Level: U13
     - Variant: Volt
     - Birth year start: 2013
     - Birth year end: 2014
   - In "Parent Team" dropdown, select the 2025 team:
     - Look for: "BU13-2025 - U13 Boys (2013-2014) (2025)"
   - Click "Save"
   - The team slug will be "BU13-2026"

3. **Verify Relationship**:
   - In the teams table, the 2026 team will show:
     - "Parent: BU13-2025"
   - The 2025 team will show:
     - "1 child team(s)"

### Editing Teams

- Click "Edit" on any team
- Modify any field (season, gender, level, variant, birth years, display name, parent team)
- Changing structured fields (gender/level/variant) will regenerate the slug
- You can change or clear the parent team relationship

### Assigning Coaches

- Click "Assign Coaches" on a team
- In the modal, assign coaches from the "Available coaches" list
- Remove coaches from the "Assigned coaches" list
- Coaches can be assigned to multiple teams

## Technical Details

### Database Schema

- **`teams` table**:
  - `parent_team_id`: Foreign key to `teams.id` (nullable)
  - `season_id`: Foreign key to `seasons.id`
  - `gender`, `level`, `variant`: Structured identity fields
  - `birth_year_start`, `birth_year_end`: Birth year range
  - `slug`: Auto-generated unique identifier
  - `is_active`: Soft delete flag (0 = deactivated)

### API Endpoints

- `GET /api/teams` - Get all teams (admin only)
- `POST /api/teams` - Create team (admin only)
- `PUT /api/teams/:id` - Update team (admin only)
- `DELETE /api/teams/:id` - Deactivate team (admin only, sets `is_active = 0`)
- `GET /api/teams/users/:userId/teams` - Get user's assigned teams
- `POST /api/teams/users/:userId/teams` - Assign team to user (admin only)
- `DELETE /api/teams/users/:userId/teams/:teamId` - Remove team assignment (admin only)

### Slug Generation Rules

- Format: `{Gender}{Level}{VariantSuffix}-{SeasonYear}`
- Gender: "B" (boys) or "G" (girls)
- Level: Normalized to uppercase (e.g., "U13", "U12")
- Variant suffix:
  - Volt: No suffix (e.g., "BU13")
  - Valor: "VR" suffix (e.g., "BU13VR")
- Season year: Appended with hyphen (e.g., "-2026")
- Examples:
  - Boys U13 Volt in 2026: "BU13-2026"
  - Girls U12 Valor in 2025: "GU12VR-2025"
- Uniqueness: Enforced at database level (slug must be unique across all teams)
- **Note**: The season year is automatically included to allow the same team identity (e.g., "BU13") to exist in multiple seasons without slug conflicts

## What's Not in Scope (Future Enhancements)

### 1. **Team Inheritance Logic**
- **Current**: Parent-child relationship is stored but not functionally inherited
- **Future**: Could implement:
  - Auto-inherit coach assignments from parent team
  - Inherit metadata or preferences
  - Bulk operations (create child teams for new season based on parent)

### 2. **Circular Reference Prevention**
- **Current**: No validation prevents circular parent chains (A → B → A)
- **Future**: Add backend validation to prevent:
  - Direct circular references
  - Deep circular chains
  - Self-referencing

### 3. **Visual Hierarchy**
- **Current**: Flat table view with text indicators
- **Future**: Could add:
  - Indented/hierarchical tree view
  - Expandable parent-child groups
  - Team timeline/history view

### 4. **Smart Parent Suggestions**
- **Current**: Shows all teams from other seasons
- **Future**: Could enhance with:
  - Filter by matching gender/level/variant (same team identity)
  - Sort by most recent season
  - Highlight "likely parent" based on team identity match

### 5. **Bulk Operations**
- **Current**: Create teams one at a time
- **Future**: Could add:
  - "Create teams for new season" wizard
  - Duplicate team structure across seasons
  - Bulk coach assignments

### 6. **Team Templates**
- **Current**: Manual entry for each team
- **Future**: Could add:
  - Save team configurations as templates
  - Apply templates when creating new teams
  - Pre-populate common team structures

### 7. **Team History/Timeline**
- **Current**: Can see parent/child relationships
- **Future**: Could add:
  - Visual timeline showing team evolution across seasons
  - View all teams in a parent chain
  - Track team name/slug changes over time

### 8. **Advanced Filtering & Search**
- **Current**: Filter by season only
- **Future**: Could add:
  - Filter by gender, level, variant
  - Search by slug or display name
  - Filter by parent/child status
  - Show only teams with/without parents

### 9. **Team Deletion**
- **Current**: Only soft delete (deactivation)
- **Future**: Could add:
  - Hard delete option (with confirmation and cascade handling)
  - Archive teams instead of deactivate
  - Restore deactivated teams

### 10. **Export/Import**
- **Current**: No export/import functionality
- **Future**: Could add:
  - Export teams to CSV/JSON
  - Import teams from spreadsheet
  - Bulk team creation from import

### 11. **Team Aliases**
- **Current**: Database has `team_aliases` table but no UI
- **Future**: Could add:
  - Manage team name aliases
  - Search teams by alias
  - Handle team name changes over time

### 12. **Role-Based Team Access**
- **Current**: Coaches see only assigned teams in some views
- **Future**: Could enhance:
  - Coaches see parent/child teams in their assigned team's hierarchy
  - Viewers see team relationships but can't modify
  - Admin-only team management features clearly marked

## Known Limitations

1. **No Validation for Circular References**: The backend doesn't prevent creating circular parent chains (though the UI prevents direct self-reference)

2. **Parent Filtering is Basic**: The parent team dropdown shows all teams from other seasons without smart filtering by team identity (gender/level/variant match)

3. **No Bulk Operations**: Creating teams for a new season requires creating each team individually

4. **No Inheritance**: Parent-child relationships are stored but don't automatically inherit properties (coaches, metadata, etc.)

5. **Limited Visual Hierarchy**: The table shows parent/child info as text, not as a visual tree structure

## Migration Notes

If you have existing teams without structured fields (`gender`, `level`, `variant`, `birth_year_start`, `birth_year_end`), you'll need to:

1. Edit each team to add the required structured fields
2. The slug will be auto-regenerated based on the new fields
3. Parent relationships can be established after teams have structured data

## Related Documentation

- **Database Schema**: See `backend/src/db/schema.ts` for full team table structure
- **API Routes**: See `backend/src/routes/teams.ts` for endpoint implementations
- **Service Layer**: See `backend/src/services/teamService.ts` for business logic
- **Frontend Service**: See `src/services/teamService.api.ts` for API client
- **Slug Utilities**: See `src/utils/teamSlug.ts` for slug generation logic

## Support

For issues or questions about team management:
1. Check this documentation first
2. Review the code comments in `TeamManagement.tsx`
3. Check backend logs for API errors
4. Verify database constraints if teams aren't saving
