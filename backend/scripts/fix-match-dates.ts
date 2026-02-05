/**
 * Fix Match Dates Script
 * 
 * Increments all match dates by 1 day to fix timezone-related date shifts.
 * 
 * Usage:
 *   tsx backend/scripts/fix-match-dates.ts [--dry-run]
 * 
 * Options:
 *   --dry-run: Show what would be changed without actually updating the database
 */

import { db } from '../src/db/database.js';

interface Match {
  id: number;
  match_date: string | Date;
  opponent_name: string;
  team_id: number | null;
}

/**
 * Add one day to a date string (YYYY-MM-DD format)
 * Uses local date methods to avoid timezone issues
 */
function addOneDay(dateStr: string): string {
  // Parse the date string (YYYY-MM-DD)
  const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!parts) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  
  const year = parseInt(parts[1], 10);
  const month = parseInt(parts[2], 10) - 1; // JavaScript months are 0-indexed
  const day = parseInt(parts[3], 10);
  
  // Create a date object in local timezone
  const date = new Date(year, month, day);
  
  // Add one day
  date.setDate(date.getDate() + 1);
  
  // Format back to YYYY-MM-DD using local date methods
  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  
  return `${newYear}-${newMonth}-${newDay}`;
}

/**
 * Convert a date value to YYYY-MM-DD string format
 */
function normalizeDate(dateValue: string | Date): string {
  if (typeof dateValue === 'string') {
    // If it's already a string, check if it's in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
      return dateValue.split('T')[0];
    }
    // Try to parse it
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return dateValue;
  } else if (dateValue instanceof Date) {
    // Use local date methods to avoid timezone conversion
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(dateValue);
}

async function fixMatchDates(dryRun: boolean = false) {
  try {
    console.log('🔍 Fetching all matches from database...\n');
    
    // Get all matches
    const matches = await db
      .selectFrom('matches')
      .select(['id', 'match_date', 'opponent_name', 'team_id'])
      .orderBy('id', 'asc')
      .execute();
    
    if (matches.length === 0) {
      console.log('⚠️  No matches found in database.');
      await db.destroy();
      process.exit(0);
    }
    
    console.log(`📊 Found ${matches.length} match(es) to process.\n`);
    
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }
    
    let updated = 0;
    let errors = 0;
    
    // Process each match
    for (const match of matches) {
      try {
        // Show raw date value from database
        const rawDate = match.match_date;
        const originalDate = normalizeDate(match.match_date);
        const newDate = addOneDay(originalDate);
        
        // Show first few matches with full details for debugging
        if (matches.indexOf(match) < 5) {
          console.log(`\n🔍 Match ID ${match.id} (${match.opponent_name || 'N/A'}):`);
          console.log(`   Raw DB value: ${rawDate} (type: ${typeof rawDate})`);
          console.log(`   Normalized: ${originalDate}`);
          console.log(`   After +1 day: ${newDate}`);
        }
        
        // Only update if the date actually changes
        if (originalDate === newDate) {
          if (matches.indexOf(match) < 5) {
            console.log(`   ⚠️  Date unchanged - this shouldn't happen!`);
          }
          continue;
        }
        
        console.log(`📅 Match ID ${match.id} (${match.opponent_name || 'N/A'}): ${originalDate} → ${newDate}`);
        
        if (!dryRun) {
          await db
            .updateTable('matches')
            .set({ match_date: newDate })
            .where('id', '=', match.id)
            .execute();
        }
        
        updated++;
      } catch (error) {
        console.error(`❌ Error processing match ID ${match.id}:`, error);
        errors++;
      }
    }
    
    console.log(`\n${dryRun ? '🔍 DRY RUN: ' : ''}✅ Processed ${matches.length} match(es)`);
    console.log(`   - Updated: ${updated}`);
    console.log(`   - Unchanged: ${matches.length - updated - errors}`);
    if (errors > 0) {
      console.log(`   - Errors: ${errors}`);
    }
    
    if (dryRun) {
      console.log('\n💡 Run without --dry-run to apply changes.');
    } else {
      console.log('\n✅ All match dates have been incremented by 1 day.');
    }
    
    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await db.destroy().catch(() => {});
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

fixMatchDates(dryRun);
