# Column Metadata Guide

This guide explains how to provide context about your Google Sheet data columns to improve AI responses.

## Overview

The system uses a **hybrid approach** combining:
1. **Config file metadata** (`src/config/coachingRules.ts`) - Business rules and conventions
2. **Sheet metadata tab** - Technical definitions and calculations

## Best Practices

### 1. Config File (`coachingRules.ts`) - Use For:
- ✅ **Business rules** (e.g., "G = Girls, B = Boys")
- ✅ **Club-specific conventions** (e.g., team naming patterns)
- ✅ **Data quality notes** (e.g., "may not be available for all teams")
- ✅ **Priority/importance** indicators
- ✅ **Domain knowledge** that doesn't change

**Example:**
```typescript
columnMetadata: {
  "Team": {
    description: "Team identifier - G prefix indicates Girls teams, B prefix indicates Boys teams",
    notes: "G = Girls, B = Boys",
  },
  "xG": {
    availability: "May not be available for all teams",
    notes: "Expected Goals - may not be available for all teams",
  },
}
```

### 2. Metadata Tab in Google Sheet - Use For:
- ✅ **Technical definitions** (what the metric actually measures)
- ✅ **Calculations/formulas** (how it's computed)
- ✅ **Units** (percentage, count, goals, etc.)
- ✅ **Data types** (number, string, percentage, date)
- ✅ **Examples** (sample values)
- ✅ **Column-specific notes** that may change

**Sheet Format:**
Create a tab named "Metadata" or "Column Definitions" with these columns:

| Column Name | Description | Units | Calculation | Notes | Example | Data Type | Availability |
|------------|-------------|-------|-------------|-------|---------|-----------|--------------|
| xG | Expected Goals - statistical measure of goal-scoring chances | goals | | May not be available for all teams | 2.3 | number | Some teams |
| SPI | Sustained Passing Index | | Passes in chain / Total passes | Measures passing continuity | 0.65 | number | All teams |
| Possession | Percentage of time team had ball | percentage | | | 58.5 | percentage | All teams |

**Column Headers (flexible matching):**
- Column Name / Column / Name
- Description / Desc
- Units / Unit
- Calculation / Calc / Formula
- Notes / Note
- Example
- Data Type / Type
- Availability / Available

## Conflict Resolution

When both sources define the same column, the system merges them with **priority rules**:

### Priority Rules:
1. **Description**: Config preferred (business context) → Sheet (technical)
2. **Units**: Sheet preferred (accuracy) → Config
3. **Calculation**: Sheet preferred (actual formula) → Config
4. **Notes**: **Both merged** (separated by " | ")
5. **Example**: Sheet preferred (real data) → Config
6. **Data Type**: Sheet preferred (technical) → Config
7. **Availability**: Config preferred (business rules) → Sheet

### Example Conflict:
**Config:**
```typescript
"SPI": {
  description: "Sustained Passing Index - measures passing continuity",
  notes: "SPI is calculated by passes in chain / total passes",
}
```

**Sheet Metadata:**
```
SPI | Sustained Passing Index | | Passes in chain / Total passes | | 0.65 | number
```

**Result (merged):**
- Description: "Sustained Passing Index - measures passing continuity" (from config)
- Calculation: "Passes in chain / Total passes" (from sheet)
- Notes: "SPI is calculated by passes in chain / total passes | " (both merged)
- Data Type: "number" (from sheet)
- Example: "0.65" (from sheet)

## Maintenance Guidelines

### When to Update Config File:
- Business rules change (e.g., new team naming convention)
- Club priorities shift
- New club-defining metrics identified
- Format preferences change

### When to Update Sheet Metadata:
- New columns added to data
- Calculation formulas change
- Units need clarification
- Technical definitions need updating

### Keeping Them in Sync:
1. **Config = Business Logic**: Update when your analysis approach changes
2. **Sheet = Technical Details**: Update when data structure changes
3. **Avoid Duplication**: Don't repeat the same info in both places
4. **Use Each for Its Strength**: Config for "why", Sheet for "what/how"

## Recommended Workflow

1. **Initial Setup:**
   - Add column metadata to config file for business rules
   - Create "Metadata" tab in Google Sheet for technical definitions

2. **Adding New Columns:**
   - Add technical definition to Sheet Metadata tab
   - Add business context to config if it affects analysis priorities

3. **Updating Definitions:**
   - Technical changes → Update Sheet Metadata
   - Business rule changes → Update Config

4. **Resolving Conflicts:**
   - If definitions conflict, config takes precedence for business rules
   - Sheet takes precedence for technical accuracy
   - Both notes are merged so nothing is lost

## Example: Complete Setup

### Config File (`coachingRules.ts`):
```typescript
columnMetadata: {
  "Team": {
    description: "Team identifier - G prefix indicates Girls teams, B prefix indicates Boys teams",
    notes: "G = Girls, B = Boys",
  },
  "xG": {
    availability: "May not be available for all teams",
    notes: "Expected Goals - may not be available for all teams",
  },
}
```

### Sheet Metadata Tab:
| Column Name | Description | Units | Calculation | Notes | Example |
|------------|-------------|-------|-------------|-------|---------|
| Team | Team identifier | | | G = Girls, B = Boys | G2011 |
| xG | Expected Goals | goals | | Statistical measure | 2.3 |
| SPI | Sustained Passing Index | | Passes in chain / Total passes | | 0.65 |

**Result**: AI gets both business context (from config) and technical details (from sheet), with smart merging to avoid conflicts.

