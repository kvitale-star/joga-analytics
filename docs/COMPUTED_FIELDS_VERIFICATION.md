# Computed Fields Verification

This document tracks all computed fields and their verification status.

## Currently Implemented Computed Fields


IMPORTANT NOTE: shots are shots that are not goals. attempts = shots + goals. This is Veo-specific.

### ✅ Fully Implemented

1. **TSR (Total Shots Ratio)**
   - Formula: `totalAttemptsFor / (totalAttemptsFor + totalAttemptsAgainst) * 100`
   - Opponent: `totalAttemptsAgainst / (totalAttemptsFor + totalAttemptsAgainst) * 100`
   - Status: UPDATED
   - Location: `backend/src/services/matchStatsService.ts:185-192`

2. **Conversion Rate**
   - Formula: `goalsFor / totalAttemptsFor * 100`
   - Opponent: `goalsAgainst / totalAttemptsAgainst * 100`
   - Status: UPDATED
   - Location: `backend/src/services/matchStatsService.ts:194-200`

3. **Pass Share**
   - Formula: `passesFor / (passesFor + passesAgainst) * 100`
   - Opponent: `passesAgainst / (passesFor + passesAgainst) * 100`
   - Status: ✅ Implemented
   - Location: `backend/src/services/matchStatsService.ts:213-220`

4. **PPM (Passes Per Minute)**
   - Formula: `passesFor / possessionMins`
   - Opponent: `passesAgainst / oppPossessionMins`
   - Status: UPDATED
   - Location: `backend/src/services/matchStatsService.ts:222-228`

5. **Inside/Outside Box Attempts %**
   - Formula: `insideBoxAttempts`
   - Outside: `100 - insideBoxAttempts`
   - Opponent Inside: `oppInsideBoxAttempts`
   - Opponent Outside: `100 - oppInsideBoxAttempts`
   - Status: UPDATED
   - Location: `backend/src/services/matchStatsService.ts:230-242`

6. **LPC (Longest Pass Chain)**
   - Formula: Highest numbered "X-pass string" field (3-10) with value > 0
   - Example: If "8-pass string" = 2 and all higher are 0, LPC = 8
   - Status: ✅ Implemented
   - Location: `backend/src/services/matchStatsService.ts:118-133`

7. **Full Game Stats (from halves)**
   - Goals For: `goalsFor1stHalf + goalsFor2ndHalf`
   - Goals Against: `goalsAgainst1stHalf + goalsAgainst2ndHalf`
   - Shots For: `shotsFor1stHalf + shotsFor2ndHalf`
   - Shots Against: `shotsAgainst1stHalf + shotsAgainst2ndHalf`
   - Attempts For: `attemptsFor1stHalf + attemptsFor2ndHalf`
   - Attempts Against: `attemptsAgainst1stHalf + attemptsAgainst2ndHalf`
   - Passes For: `passesFor1stHalf + passesFor2ndHalf`
   - Passes Against: `passesAgainst1stHalf + passesAgainst2ndHalf`
   - Total Attempts (1st): `goalsFor1stHalf + shotsFor1stHalf`
   - Total Attempts (2nd): `goalsFor2ndHalf + shotsFor2ndHalf`
   - Opp Total Attempts (1st): `goalsAgainst1stHalf + shotsAgainst1stHalf`
   - Opp Total Attempts (2nd): `goalsAgsinst2ndHalf + shotsAgainst2ndHalf`
   - Total Attempts: Total Attempts (1st) + Total Attempts (2nd)
   - Opp Total Attempts: Opp Total Attempts (1st) + Opp Total Attempts (2nd)
   - Status: UPDATED
   - Location: `backend/src/services/matchStatsService.ts:155-211, 270-289`

### ⚠️ Needs Verification/Implementation

**📝 WHERE TO PROVIDE FORMULAS:**

You can provide formulas in one of these ways:

1. **Edit this document** - Add formulas in the sections below
2. **Edit the service file directly** - Update `backend/src/services/matchStatsService.ts` with comments
3. **Tell me directly** - I'll update the code and documentation

---

1. **SPI (Sustained Passing Index)**
   - Formula: Sum of passes in pass strings / total number of passes * 100
   - Note: Each "X-pass string" value represents the number of strings, so multiply by X to get total passes (e.g., "3-pass string" = 3 means 9 total passes)
   - Status: ✅ PARTIALLY IMPLEMENTED - Basic SPI and weighted SPI implemented, opponent versions still TODO
   - Location: `backend/src/services/matchStatsService.ts:158-220, 331-344`
   - **SPI (w) - Weighted SPI:**
     - Formula: Includes 15% bonus for each pass in a pass string over 3
     - Example: 3 3-pass strings, 4 5-pass strings, 2 6-pass strings, 150 total passes
     - Calculation: `((3*3*1) + (5*4*1.3) + (6*2*1.45)) / 150`
     - Multipliers: 3-pass=1.0, 4-pass=1.15, 5-pass=1.30, 6-pass=1.45, 7-pass=1.60, 8-pass=1.75, 9-pass=1.90, 10-pass=2.05
     - Status: ✅ Implemented
   - **Opp SPI - Opponent SPI:**
     - Formula: Sum of opponent passes in pass strings / total opponent passes * 100
     - Status: ✅ Implemented - Looks for fields like "Opp 3-pass string", "Opponent 3-pass string", etc.
     - Location: `backend/src/services/matchStatsService.ts:209-250`
   - **Opp SPI (w) - Weighted Opponent SPI:**
     - Formula: Same as SPI (w) but for opponent pass strings
     - Status: ✅ Implemented - Uses same 15% bonus formula as weighted SPI
     - Location: `backend/src/services/matchStatsService.ts:209-250`


4. **Pass Strings (3-5)**
   - Formula: Sum of "3-pass string" + "4-pass string" + "5-pass string"
   - Status: ✅ Implemented
   - Location: `backend/src/services/matchStatsService.ts:318-321`

5. **Pass Strings (6+)**
   - Formula: Sum of "6-pass string" + "7-pass string" + "8-pass string" + "9-pass string" + "10-pass string"
   - Status: ✅ Implemented
   - Location: `backend/src/services/matchStatsService.ts:323-327`

6. **Pass Strings <4**
   - Formula: "3-pass string" (less than 4, only 3-pass string)
   - Status: ✅ Implemented
   - Location: `backend/src/services/matchStatsService.ts:329-332`

7. **Pass Strings 4+**
   - Formula: Sum of "4-pass string" + "5-pass string" + "6-pass string" + "7-pass string" + "8-pass string" + "9-pass string" + "10-pass string" (4 or more)
   - Status: ✅ Implemented
   - Location: `backend/src/services/matchStatsService.ts:334-339`

8. **Possession by Zone**
   - Status: ✅ NOT COMPUTED - Pass-through only (manually entered values)
   - Location: `backend/src/services/matchStatsService.ts:301-310`
   - Note: These are NOT computed stats, just passed through if provided in raw data

## Fields Excluded from Form (Computed)

The following fields are excluded from the form as computed fields:

- TSR (Total Shots Ratio), Opp TSR
- Conversion Rate, Opp Conversion Rate
- SPI, SPI (w), Opp SPI, Opp SPI (w)
- Pass Share, Opp Pass Share
- PPM (Passes Per Minute), Opp PPM
- LPC (Longest Pass Chain)
- Possess % (def), Possess % (mid), Possess % (att)
- Inside Box Attempts %, Outside Box Attempts %
- Opp Inside Box Attempts %, Opp Outside Box Attempts %
- Total Attempts (1st Half), Total Attempts (2nd Half) - ✅ COMPUTED
- Pass Strings (3-5), Pass Strings (6+) - ✅ COMPUTED
- Pass Strings <4, Pass Strings 4+ - ✅ COMPUTED
- Possession by Zone (def, mid, att) - ⚠️ NOT COMPUTED (pass-through only, manually entered)

## Verification Checklist

- [x] Verify TSR formula is correct
- [x] Verify Conversion Rate formula is correct
- [x] Verify Pass Share formula is correct
- [x] Verify PPM formula is correct
- [x] Verify Attempts % formulas are correct
- [x] Verify LPC calculation logic is correct
- [x] **Confirm SPI formula and implement** - ✅ Implemented (basic SPI, weighted still TODO)
- [x] **Confirm Total Attempts formula and implement** - ✅ Implemented
- [x] **Implement Pass Strings (3-5) computation** - ✅ Implemented
- [x] **Implement Pass Strings (6+) computation** - ✅ Implemented
- [x] **Implement Pass Strings <4 computation** - ✅ Implemented
- [x] **Implement Pass Strings 4+ computation** - ✅ Implemented
- [x] Verify full game stats summation from halves is correct - ✅ Verified
- [ ] Test with sample data to ensure all computations match expected values

## How to Verify Computed Fields

### Method 1: Run Verification Script

A verification script has been created to test computed fields with sample data:

```bash
cd backend
npm run verify-computed-fields
# or
npx tsx src/scripts/verify-computed-fields.ts
```

This script will:
- Test all computed fields with sample data
- Show computed values vs. expected values
- Highlight any mismatches
- Show which fields are not yet implemented

**To test with your own data:**
1. Edit `backend/src/scripts/verify-computed-fields.ts`
2. Modify the `sampleRawData` object with your test values
3. Run the script again

### Method 2: Test via Upload Form

1. Fill out the Upload Game Data form with known test values
2. Submit the form
3. Check the stored match data in the database
4. Verify computed values match your expected calculations

### Method 3: Compare with Google Sheets

If you still have Google Sheets with formulas:
1. Enter the same test data in both:
   - Upload Game Data form (new system)
   - Google Sheets (old system)
2. Compare the computed values
3. Note any discrepancies

### Method 4: Manual Formula Verification

For each computed field, verify the formula matches your expectations:

**Example for TSR:**
- Input: shotsFor = 14, shotsAgainst = 7
- Expected: TSR = 14 / (14 + 7) * 100 = 66.67%
- Check: Does the computed value match?

## Next Steps

1. **Run the verification script** with sample data
2. **Confirm exact formulas** for remaining missing fields:
   - SPI (w) - Weighted SPI formula
   - Opp SPI - Needs opponent pass string fields
   - Opp SPI (w) - Weighted Opponent SPI formula
3. **Test with real match data** to ensure accuracy
4. **Add unit tests** for all computed fields
