# Upload Game Data

Learn how to add new match data to the JOGA Analytics system.

## Overview

The Upload Game Data view allows you to enter match statistics and save them to the database. The system will automatically:
- Detect if a match already exists
- Compute derived metrics
- Make the data available in all views

## Accessing Upload Game Data

1. Click **"Upload Game Data"** in the left sidebar
2. You'll see a form with multiple sections
3. Fill in the required information

## Required Fields

### Game Info Section
These fields are always required:

- **Team** (Dropdown): Select the team that played
- **Date**: Match date (YYYY-MM-DD format)
- **Opponent Name**: Name of the opposing team
- **Home/Away**: Whether the match was home or away
- **Competition Type**: League, Cup, Friendly, etc.

### Optional Game Info
- **Result**: Match result (e.g., "2-1", "W", "L", "D")
- **Notes**: Additional notes about the match

## Entering Statistics

### Basic Stats (1st Half)
Enter first-half statistics:
- Shots, Goals, Possession
- Passes, Corners, Free Kicks
- And more...

### Basic Stats (2nd Half)
Enter second-half statistics:
- Same metrics as first half
- System automatically calculates full-game totals

### Advanced Metrics
- Expected Goals (xG)
- Shot locations
- Pass strings
- Defensive statistics
- Set pieces

## Using Image Upload (OCR)

For some sections, you can upload screenshots and the system will extract data automatically:

1. Click the **"Upload"** button in a section header
2. Select an image file (screenshot of stats)
3. Wait for processing
4. Review extracted values
5. Edit if needed

**Supported Sections:**
- Basic Stats (1st Half)
- Basic Stats (2nd Half)

## Match Detection

The system automatically checks if a match already exists based on:
- Team
- Opponent
- Date

### If Match Found
- A button appears in the Game Info header
- Click it to see match details
- Choose to:
  - **Pre-fill Form**: Load existing data and update
  - **Continue Without Pre-fill**: Create a new match (if different competition)

### If No Match Found
- Continue filling the form
- Submit to create a new match

## Opponent Autocomplete

When typing the opponent name:
- The system suggests similar opponent names
- Helps ensure consistency
- Prevents duplicate opponent entries

**How to Use:**
1. Start typing the opponent name
2. Suggestions appear below the input
3. Click a suggestion to select it
4. Or continue typing to enter a new name

## Form Validation

### Required Fields
- Team, Date, and Opponent Name must be filled
- Missing required fields are highlighted in red

### Data Types
- Numbers: Enter numeric values only
- Dates: Use YYYY-MM-DD format
- Text: Free-form text for names and notes

### Error Messages
- Appear below invalid fields
- Explain what needs to be corrected

## Preview Before Submit

1. Click **"Preview"** button
2. Review all entered data
3. Check computed metrics
4. Verify everything looks correct
5. Click **"Submit"** to save, or **"Cancel"** to go back

## Submitting Data

### Creating New Match
1. Fill in all required fields
2. Enter statistics
3. Click **"Preview"**
4. Review the preview
5. Click **"Submit"**
6. Success message appears
7. Data is immediately available in all views

### Updating Existing Match
1. System detects existing match
2. Click the match detection button
3. Choose **"Pre-fill Form"**
4. Existing data loads into form
5. Make your changes
6. Click **"Preview"**
7. Click **"Submit"** to update

## Tips for Accurate Data Entry

### 1. Be Consistent
- Use the same opponent name format
- Use consistent date format
- Enter all available data

### 2. Double-Check Numbers
- Verify totals match (e.g., 1st half + 2nd half = full game)
- Check that numbers make sense
- Review computed metrics

### 3. Use OCR When Available
- Screenshots can be faster than manual entry
- Review extracted values for accuracy
- Edit if OCR makes mistakes

### 4. Complete All Sections
- More complete data = better analysis
- Some metrics depend on others
- Missing data limits analysis options

### 5. Save Notes
- Use the Notes field for context
- Record important game details
- Helps with future analysis

## Common Issues

### "Match Already Exists" Warning
- **Solution**: Use the pre-fill option to update existing match
- **Or**: Verify it's actually a different match (different competition, etc.)

### Opponent Not Found in Suggestions
- **Solution**: Type the full name and continue
- **Note**: System will create a new opponent entry
- **Tip**: Check spelling to avoid duplicates

### Form Not Submitting
- **Check**: Are all required fields filled?
- **Check**: Are there validation errors?
- **Check**: Is the date in correct format?

### OCR Not Working
- **Check**: Is the image clear and readable?
- **Check**: Does it show the correct section?
- **Solution**: Enter data manually if OCR fails

## After Submission

### Immediate Availability
- Data appears in all views immediately
- Charts update automatically
- No refresh needed

### Verification
1. Navigate to **Game Data** view
2. Filter by your team and date
3. Verify the match appears
4. Check that metrics are correct

## Best Practices

1. **Enter Data Promptly**: Enter matches soon after they're played
2. **Be Accurate**: Double-check numbers before submitting
3. **Use OCR**: Save time with image upload when possible
4. **Complete Data**: Enter all available statistics
5. **Add Notes**: Include context that might be useful later

---

**Related Pages:**
- [Game Data View](Game-Data-View) - View and analyze entered matches
- [Match Editor](Match-Editor) - Edit existing matches (Admin only)
- [Team Data View](Team-Data-View) - See how new data appears in charts
