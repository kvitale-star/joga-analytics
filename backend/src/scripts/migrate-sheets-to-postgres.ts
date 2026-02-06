/**
 * Migration Script: Import Google Sheets data into PostgreSQL
 * 
 * This script:
 * 1. Fetches all match data from Google Sheets
 * 2. For each match, checks if it exists in PostgreSQL (by match_id_external or date+opponent)
 * 3. If not exists, creates the match in PostgreSQL
 * 4. If exists, optionally updates (or skips)
 * 
 * Usage: npm run migrate-sheets
 */

import { fetchSheetData } from '../services/sheetsService.js';
import { getMatches, createMatch } from '../services/matchService.js';
import { normalizeFieldNames } from '../services/matchStatsService.js';
import { computeMatchStats } from '../services/matchStatsService.js';
import { db } from '../db/database.js';

interface MigrationOptions {
  dryRun?: boolean; // If true, don't actually insert/update, just log what would happen
  updateExisting?: boolean; // If true, update existing matches; if false, skip them
  sheetRange?: string;
}

async function findTeamBySlug(slug: string): Promise<number | null> {
  const team = await db
    .selectFrom('teams')
    .select('id')
    .where('slug', '=', slug)
    .where('is_active', '=', 1)
    .executeTakeFirst();
  
  return team?.id || null;
}

async function findExistingMatch(
  matchIdExternal: string | null,
  matchDate: string,
  opponentName: string
): Promise<number | null> {
  // First try by match_id_external
  if (matchIdExternal) {
    const match = await db
      .selectFrom('matches')
      .select('id')
      .where('match_id_external', '=', matchIdExternal)
      .executeTakeFirst();
    
    if (match) return match.id;
  }

  // Fall back to date + opponent
  const match = await db
    .selectFrom('matches')
    .select('id')
    .where('match_date', '=', matchDate)
    .where('opponent_name', '=', opponentName)
    .executeTakeFirst();

  return match?.id || null;
}

function parseDate(dateValue: string | number | undefined): string | null {
  if (!dateValue) return null;
  
  // If it's already a string in ISO format
  if (typeof dateValue === 'string') {
    // Try to parse various date formats
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  // If it's a number (Google Sheets serial date)
  if (typeof dateValue === 'number') {
    // Google Sheets serial date: days since December 30, 1899
    const epoch = new Date(1899, 11, 30);
    const date = new Date(epoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  return null;
}

async function migrateSheetsToPostgres(options: MigrationOptions = {}) {
  const { dryRun = false, updateExisting = false, sheetRange = 'Match Log!A1:ZZ1000' } = options;

  console.log('🚀 Starting Google Sheets to PostgreSQL migration...');
  console.log(`   Dry run: ${dryRun ? 'YES' : 'NO'}`);
  console.log(`   Update existing: ${updateExisting ? 'YES' : 'NO'}`);
  console.log(`   Sheet range: ${sheetRange}\n`);

  try {
    // Fetch all data from Google Sheets
    console.log('📊 Fetching data from Google Sheets...');
    const sheetData = await fetchSheetData(sheetRange);
    console.log(`   Found ${sheetData.length} matches in Google Sheets\n`);

    if (sheetData.length === 0) {
      console.log('⚠️  No data found in Google Sheets. Exiting.');
      return;
    }

    // Get existing matches from PostgreSQL
    console.log('📊 Fetching existing matches from PostgreSQL...');
    const existingMatches = await getMatches();
    const existingByExternalId = new Map<string, number>();
    const existingByDateOpponent = new Map<string, number>();

    existingMatches.forEach(match => {
      if (match.matchIdExternal) {
        existingByExternalId.set(match.matchIdExternal, match.id);
      }
      const key = `${match.matchDate}|${match.opponentName}`;
      existingByDateOpponent.set(key, match.id);
    });

    console.log(`   Found ${existingMatches.length} existing matches in PostgreSQL\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Process each match
    for (let i = 0; i < sheetData.length; i++) {
      const sheetMatch = sheetData[i];
      const matchIdExternal = sheetMatch['Match ID'] || sheetMatch['match id'] || sheetMatch['MatchId'] || sheetMatch['matchId'] || null;
      const matchDate = parseDate(sheetMatch['Date'] || sheetMatch['date'] || sheetMatch['Match Date'] || sheetMatch['match date']);
      const opponentName = sheetMatch['Opponent'] || sheetMatch['opponent'] || '';

      if (!matchDate || !opponentName) {
        console.log(`⚠️  Skipping match ${i + 1}/${sheetData.length}: Missing date or opponent (Match ID: ${matchIdExternal || 'none'})`);
        skipped++;
        continue;
      }

      // Check if match already exists
      const existingId = matchIdExternal 
        ? existingByExternalId.get(String(matchIdExternal))
        : existingByDateOpponent.get(`${matchDate}|${opponentName}`);

      if (existingId) {
        if (updateExisting && !dryRun) {
          console.log(`🔄 Updating match ${i + 1}/${sheetData.length}: ${opponentName} on ${matchDate} (ID: ${existingId})`);
          // TODO: Implement update logic if needed
          updated++;
        } else {
          console.log(`⏭️  Skipping existing match ${i + 1}/${sheetData.length}: ${opponentName} on ${matchDate} (ID: ${existingId})`);
          skipped++;
        }
        continue;
      }

      // Extract team slug/name from sheet data
      const teamValue = sheetMatch['Team'] || sheetMatch['team'] || sheetMatch['Team Name'] || sheetMatch['teamName'] || '';
      let teamId: number | null = null;

      if (teamValue) {
        // Try to find team by slug
        teamId = await findTeamBySlug(String(teamValue));
        if (!teamId) {
          console.log(`⚠️  Team not found for slug: ${teamValue} (match: ${opponentName} on ${matchDate})`);
        }
      }

      // Prepare match data
      const competitionType = sheetMatch['Competition Type'] || sheetMatch['competition type'] 
        ? String(sheetMatch['Competition Type'] || sheetMatch['competition type']) 
        : null;
      const result = sheetMatch['Result'] || sheetMatch['result'] 
        ? String(sheetMatch['Result'] || sheetMatch['result']) 
        : null;
      const isHome = sheetMatch['Home/Away'] || sheetMatch['home/away'] || null;
      const isHomeBool = isHome === 'Home' ? true : isHome === 'Away' ? false : null;
      const venue = sheetMatch['Venue'] || sheetMatch['venue'] 
        ? String(sheetMatch['Venue'] || sheetMatch['venue']) 
        : null;
      const referee = sheetMatch['Referee'] || sheetMatch['referee'] 
        ? String(sheetMatch['Referee'] || sheetMatch['referee']) 
        : null;
      const notes = sheetMatch['Notes'] || sheetMatch['notes'] 
        ? String(sheetMatch['Notes'] || sheetMatch['notes']) 
        : null;

      // Extract all stats from sheet match (everything except core fields)
      const coreFields = ['Match ID', 'match id', 'MatchId', 'matchId', 'Date', 'date', 'Match Date', 'match date', 
                          'Opponent', 'opponent', 'Team', 'team', 'Team Name', 'teamName',
                          'Competition Type', 'competition type', 'Result', 'result', 
                          'Home/Away', 'home/away', 'Venue', 'venue', 'Referee', 'referee', 'Notes', 'notes'];
      
      const rawStats: any = {};
      Object.keys(sheetMatch).forEach(key => {
        if (!coreFields.includes(key)) {
          rawStats[key] = sheetMatch[key];
        }
      });

      // Normalize and compute stats
      let statsJson: any = null;
      let statsComputedAt: string | null = null;

      if (Object.keys(rawStats).length > 0) {
        try {
          const normalizedStats = normalizeFieldNames({
            ...rawStats,
            teamId,
            opponentName,
            matchDate,
            competitionType,
            result,
            venue,
            referee,
            notes,
          });

          const computedStats = computeMatchStats(normalizedStats);
          statsJson = {
            ...normalizedStats,
            ...computedStats,
          };
          statsComputedAt = new Date().toISOString();
        } catch (error) {
          console.error(`⚠️  Error computing stats for match ${i + 1}/${sheetData.length}:`, error);
          // Still create the match with raw stats
          statsJson = rawStats;
        }
      }

      if (dryRun) {
        console.log(`📝 Would create match ${i + 1}/${sheetData.length}: ${opponentName} on ${matchDate} (Match ID: ${matchIdExternal || 'none'})`);
        created++;
      } else {
        try {
          await createMatch({
            teamId,
            opponentName: String(opponentName), // Ensure it's a string
            matchDate,
            competitionType,
            result,
            isHome: isHomeBool,
            matchIdExternal: matchIdExternal ? (typeof matchIdExternal === 'string' ? matchIdExternal : String(matchIdExternal)) : null,
            statsJson,
            statsSource: 'google_sheets_migration',
            statsComputedAt,
            notes,
            venue,
            referee,
          });

          console.log(`✅ Created match ${i + 1}/${sheetData.length}: ${opponentName} on ${matchDate} (Match ID: ${matchIdExternal || 'none'})`);
          created++;
        } catch (error: any) {
          console.error(`❌ Error creating match ${i + 1}/${sheetData.length}: ${error.message}`);
          errors++;
        }
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${sheetData.length}`);

    if (dryRun) {
      console.log('\n⚠️  This was a dry run. No data was actually migrated.');
      console.log('   Run without --dry-run to perform the actual migration.');
    } else {
      console.log('\n✅ Migration completed!');
    }
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const updateExisting = args.includes('--update-existing');

  migrateSheetsToPostgres({ dryRun, updateExisting })
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateSheetsToPostgres };
