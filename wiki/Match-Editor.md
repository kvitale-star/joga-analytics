# Match Editor (Admin Only)

Edit existing match records and manage match data.

## Overview

The Match Editor allows administrators to:
- Find matches using various criteria
- Edit match information and statistics
- Link matches to teams
- Correct data errors
- Update match details

## Accessing Match Editor

1. **Admin Access Required**: Only administrators can access this feature
2. Click **"Match Editor"** in the Admin section of the sidebar
3. The Match Editor view opens

## Finding Matches

### Search Filters

#### Season Filter (Required)
- Select a season from the dropdown
- Required for searching
- Defaults to active season
- Yellow border when selected

#### Team Filter
- Select a team to filter matches
- Filtered by selected season
- Shows matches for that team
- Yellow border when selected

#### Opponent Filter
- Type opponent name (with autocomplete)
- Fuzzy matching suggests similar names
- Filter matches by opponent
- Yellow border when selected

#### Date Range
- **Start Date**: Beginning of date range
- **End Date**: End of date range
- Leave empty to search all dates
- Yellow borders when dates selected

### Search Results

#### Match List
- Shows matches matching your criteria
- Displays key information:
  - Match ID
  - Team name
  - Opponent name
  - Match date
  - Result, competition, location
- Paginated (20 matches per page)

#### Selecting a Match
- Click a match to select it
- Click again to deselect
- Selected match appears highlighted
- Edit form appears below

## Editing Matches

### Game Info Section
Edit basic match information:
- **Team**: Link match to a team (or remove link)
- **Opponent Name**: Edit opponent name
- **Match Date**: Change match date
- **Competition Type**: Update competition
- **Result**: Edit match result
- **Home/Away**: Set location
- **Notes**: Add or edit notes

### Statistics Sections
Edit match statistics organized by category:
- **Basic Stats (1st Half)**: First half statistics
- **Basic Stats (2nd Half)**: Second half statistics
- **Pass Strings**: Passing sequences
- **Shots Map**: Shot locations
- **Other**: Additional statistics

### Using Image Upload
Some sections support OCR:
1. Click **"Upload"** button in section header
2. Select an image file
3. Wait for processing
4. Review extracted values
5. Edit if needed

**Supported Sections:**
- Basic Stats (1st Half)
- Basic Stats (2nd Half)

## Saving Changes

### Save Button
1. Make your edits
2. Click **"Save Changes"** button
3. Changes are saved to database
4. Success message appears

### Validation
- Required fields must be filled (Team, Opponent, Date)
- Invalid data is highlighted
- Save is disabled until valid

### Cancel
- Click **"Cancel"** to discard changes
- Returns to search view
- No changes are saved

## Tips

1. **Use Filters**: Combine filters to find specific matches
2. **Check Pagination**: Use page navigation for large result sets
3. **Verify Changes**: Review before saving
4. **Use OCR**: Save time with image upload when possible
5. **Link Matches**: Use Team dropdown to link unlinked matches

## Common Tasks

### Linking Unlinked Matches
1. Search for matches with no team (leave Team filter empty)
2. Select a match
3. Choose appropriate team from Team dropdown
4. Save changes

### Correcting Data Errors
1. Find the match using filters
2. Select the match
3. Edit incorrect fields
4. Save changes

### Updating Match Information
1. Search for the match
2. Select it
3. Update any fields
4. Save changes

---

**Related Pages:**
- [Upload Game Data](Upload-Game-Data) - Adding new matches
- [User Management](User-Management) - Managing users
