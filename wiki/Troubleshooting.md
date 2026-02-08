# Troubleshooting Guide

Solutions to common problems and issues.

## Login Issues

### Can't Log In
**Symptoms:** Login fails, error message appears

**Solutions:**
1. **Check Credentials**
   - Verify email address is correct
   - Check for typos in password
   - Ensure Caps Lock is off

2. **Password Issues**
   - Try resetting your password
   - Contact administrator if reset doesn't work
   - Verify account is active

3. **Browser Issues**
   - Clear browser cache and cookies
   - Try a different browser
   - Disable browser extensions temporarily

### Session Expired
**Symptoms:** Logged out unexpectedly, "Session expired" message

**Solutions:**
1. Simply log in again
2. Sessions expire after inactivity for security
3. Check "Remember Me" if available

## Data Display Issues

### No Data Showing in Charts
**Symptoms:** Charts are empty, no data points visible

**Solutions:**
1. **Check Team Selection**
   - Ensure a team is selected
   - Verify team has matches in the system

2. **Check Date Filters**
   - Remove or adjust date filters
   - Ensure date range includes matches

3. **Check Other Filters**
   - Remove opponent filters
   - Check "Last N Games" setting
   - Clear all filters and try again

4. **Verify Data Exists**
   - Check Game Data view for matches
   - Verify matches were submitted successfully
   - Check that matches are in the date range

### Charts Not Updating
**Symptoms:** Changes to filters don't update charts

**Solutions:**
1. **Refresh the Page**
   - Press F5 or Cmd+R
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

2. **Check Filters**
   - Ensure filters are actually changing
   - Try changing and changing back

3. **Browser Console**
   - Open browser developer tools (F12)
   - Check for JavaScript errors
   - Report errors to administrator

### Missing Metrics
**Symptoms:** Expected metrics don't appear

**Solutions:**
1. **Check Data Entry**
   - Verify metrics were entered for matches
   - Some metrics are optional
   - Not all metrics available for all matches

2. **Check Metric Selection**
   - Verify metrics are selected in Game Data view
   - Check chart configuration
   - Ensure metrics aren't hidden

3. **Computed Metrics**
   - Some metrics are computed from other data
   - Requires source data to be present
   - Check Metric Glossary for requirements

## Data Entry Issues

### Form Won't Submit
**Symptoms:** Submit button doesn't work, form stays on page

**Solutions:**
1. **Check Required Fields**
   - Team, Date, and Opponent are required
   - Red highlights indicate missing fields
   - Fill all required fields

2. **Check Validation Errors**
   - Look for error messages below fields
   - Fix validation errors
   - Ensure date format is YYYY-MM-DD

3. **Browser Issues**
   - Try a different browser
   - Disable browser extensions
   - Check browser console for errors

### Match Detection Not Working
**Symptoms:** Existing match not detected, duplicate created

**Solutions:**
1. **Check Opponent Name**
   - Ensure opponent name matches exactly
   - Use autocomplete suggestions when available
   - Check for typos

2. **Check Date**
   - Verify date matches existing match
   - Check date format
   - Ensure same team selected

3. **Manual Check**
   - Use Match Editor to find existing matches
   - Check Game Data view
   - Verify match details

### OCR Not Working
**Symptoms:** Image upload doesn't extract data

**Solutions:**
1. **Image Quality**
   - Ensure image is clear and readable
   - Check image is not too small
   - Verify text is visible

2. **Image Format**
   - Use common formats (PNG, JPG)
   - Check file size (not too large)
   - Ensure image isn't corrupted

3. **Manual Entry**
   - Enter data manually if OCR fails
   - OCR is a convenience feature
   - Manual entry is always available

## Performance Issues

### Slow Loading
**Symptoms:** Pages take long to load, charts slow to render

**Solutions:**
1. **Internet Connection**
   - Check your internet speed
   - Try a different network
   - Check for network issues

2. **Browser Performance**
   - Close other browser tabs
   - Clear browser cache
   - Update browser to latest version

3. **Data Volume**
   - Reduce date range
   - Select fewer teams
   - Limit number of charts

### Charts Not Rendering
**Symptoms:** Charts appear blank or don't display

**Solutions:**
1. **Browser Compatibility**
   - Use a modern browser
   - Update browser to latest version
   - Try a different browser

2. **JavaScript**
   - Ensure JavaScript is enabled
   - Check for JavaScript errors in console
   - Disable browser extensions

3. **Refresh**
   - Refresh the page
   - Clear browser cache
   - Try incognito/private mode

## AI Chat Issues

### AI Not Responding
**Symptoms:** Chat doesn't respond, error messages

**Solutions:**
1. **Check Question Format**
   - Ensure question is clear
   - Try rephrasing
   - Check for typos

2. **Data Availability**
   - Verify data exists for your question
   - Check team selection
   - Ensure matches in date range

3. **Connection**
   - Check internet connection
   - Wait a few seconds (first response can be slow)
   - Try again if timeout occurs

### Incorrect Answers
**Symptoms:** AI provides wrong information

**Solutions:**
1. **Verify Data**
   - Check charts and data views
   - Compare AI answer to actual data
   - Report discrepancies

2. **Rephrase Question**
   - Try asking more specifically
   - Include team names and dates
   - Break complex questions into parts

3. **Use Charts**
   - Verify important information in charts
   - AI is a convenience, charts are authoritative
   - Cross-reference when needed

## Account Issues

### Can't Access Features
**Symptoms:** Features grayed out, access denied

**Solutions:**
1. **Check Role**
   - Verify your user role
   - Some features are admin-only
   - Contact administrator for access

2. **Permissions**
   - Check team assignments
   - Verify you have access to selected team
   - Contact administrator if needed

### Password Reset Not Working
**Symptoms:** Reset email not received, link doesn't work

**Solutions:**
1. **Check Email**
   - Verify email address is correct
   - Check spam/junk folder
   - Wait a few minutes

2. **Link Expiration**
   - Reset links expire after a time
   - Request a new reset if expired
   - Contact administrator if issues persist

## Still Having Issues?

### Contact Support
1. **Document the Problem**
   - Note what you were trying to do
   - Record error messages
   - Note browser and version

2. **Check Logs**
   - Open browser console (F12)
   - Note any error messages
   - Take screenshots if helpful

3. **Contact Administrator**
   - Provide details of the issue
   - Include error messages
   - Describe steps to reproduce

---

**Related Pages:**
- [FAQ](FAQ) - Common questions
- [Getting Started](Getting-Started) - Setup guide
