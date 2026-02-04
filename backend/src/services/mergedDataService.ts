/**
 * Merged Data Service
 * 
 * Combines match data from Google Sheets and PostgreSQL database
 * to provide a unified data source for charts and data views.
 */

import { fetchSheetData, type MatchData } from './sheetsService.js';
import { getMatches } from './matchService.js';

/**
 * Convert a PostgreSQL match to MatchData format (for charts)
 */
function convertMatchToMatchData(match: any): MatchData {
  // Convert matchDate to MM/DD/YYYY format to match Google Sheets format
  // Handle various formats: Date object, ISO string (YYYY-MM-DD), or already formatted string
  const matchDateValue: any = match.matchDate;
  let dateString: string = '';
  
  // First, convert to a Date object if needed
  let dateObj: Date | null = null;
  if (matchDateValue instanceof Date) {
    dateObj = matchDateValue;
  } else if (typeof matchDateValue === 'string') {
    if (matchDateValue.includes('T')) {
      // ISO string - parse it
      dateObj = new Date(matchDateValue);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(matchDateValue)) {
      // YYYY-MM-DD format - parse it
      dateObj = new Date(matchDateValue);
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(matchDateValue)) {
      // Already MM/DD/YYYY format - use as-is
      dateString = matchDateValue;
    } else {
      // Try to parse as date
      dateObj = new Date(matchDateValue);
    }
  } else if (matchDateValue && typeof matchDateValue === 'object' && 'toISOString' in matchDateValue) {
    // Handle Date-like objects
    dateObj = new Date(matchDateValue.toISOString());
  }
  
  // Convert Date object to MM/DD/YYYY format
  if (dateObj && !isNaN(dateObj.getTime()) && !dateString) {
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const year = dateObj.getFullYear();
    dateString = `${month}/${day}/${year}`;
  } else if (!dateString) {
    dateString = String(matchDateValue || '');
  }
  
  const matchData: MatchData = {
    // Core match info
    // Note: Match ID will be set from stats_json if available, otherwise use database ID
    // The merge logic will preserve Google Sheets Match IDs when overriding
    'Match ID': match.matchIdExternal || match.id, // Prefer external ID, fall back to database ID
    'Team': match.teamSlug || match.teamDisplayName || '', // Use team slug/name for frontend (required for dropdowns)
    'Opponent': match.opponentName,
    'Date': dateString, // Use "Date" as primary - ensure it's a string in YYYY-MM-DD format
    'Competition Type': match.competitionType || '',
    'Result': match.result || '',
    'Home/Away': match.isHome === true ? 'Home' : match.isHome === false ? 'Away' : 'Tournament',
    'Venue': match.venue || '',
    'Referee': match.referee || '',
    'Notes': match.notes || '',
  };

  // Flatten stats_json into matchData
  // stats_json contains both raw stats and computed stats
  // Use normalized keys only to avoid duplicates
  if (match.statsJson) {
    Object.entries(match.statsJson).forEach(([key, value]) => {
      // Normalize key to canonical format (Title Case with spaces)
      const normalizedKey = normalizeKey(key);
      
      // Only add if we don't already have this normalized key, or if the new value is non-empty
      if (!matchData[normalizedKey] || 
          (matchData[normalizedKey] === '' || matchData[normalizedKey] === null || matchData[normalizedKey] === 0) &&
          (value !== '' && value !== null && value !== 0)) {
        matchData[normalizedKey] = value as string | number;
      }
      
      // If stats_json contains a Match ID, use it (this would be from form input)
      if (key.toLowerCase() === 'match id' || key.toLowerCase() === 'matchid') {
        matchData['Match ID'] = value as string | number;
      }
    });
  }

  // Add team info if available
  if (match.teamId) {
    matchData['Team ID'] = match.teamId;
  }

  return matchData;
}

/**
 * Normalize field names to match Google Sheets format
 * e.g., "goalsFor" -> "Goals For", "tsr" -> "TSR"
 */
function normalizeKey(key: string): string {
  // Handle camelCase
  if (key.includes('For') || key.includes('Against')) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
  
  // Handle snake_case
  if (key.includes('_')) {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  // Handle already normalized keys
  return key;
}

/**
 * Create a unique match identifier for deduplication
 * Uses Match ID if available, otherwise falls back to date + opponent
 */
function getMatchKey(matchData: MatchData): string | null {
  // First, try to use Match ID if available (most reliable)
  const matchId = matchData['Match ID'] || matchData['match id'] || matchData['MatchId'] || matchData['matchId'];
  if (matchId) {
    return `id:${String(matchId).toLowerCase()}`;
  }
  
  // Fall back to date + opponent
  const date = matchData['Date'] || matchData['date'] || '';
  const opponent = matchData['Opponent'] || matchData['opponent'] || matchData['Opponent Name'] || '';
  
  // If we have both date and opponent, use them
  if (date && opponent) {
    return `date:${date}|opponent:${opponent}`.toLowerCase();
  }
  
  // If we only have date, use it (less reliable but better than nothing)
  if (date) {
    return `date:${date}`.toLowerCase();
  }
  
  // If we only have opponent, use it (less reliable but better than nothing)
  if (opponent) {
    return `opponent:${opponent}`.toLowerCase();
  }
  
  // If we have nothing, return null (will be skipped)
  return null;
}

/**
 * Merge Google Sheets data with PostgreSQL matches
 * 
 * Strategy:
 * 1. Load data from both sources
 * 2. Convert PostgreSQL matches to MatchData format
 * 3. Deduplicate by match date + opponent name
 * 4. Prefer PostgreSQL data over Google Sheets for duplicates (more recent/computed)
 * 5. Return merged array sorted by date
 */
export async function getMergedMatchData(options?: {
  sheetRange?: string;
  teamId?: number;
  teamIds?: number[];
  startDate?: string;
  endDate?: string;
}): Promise<MatchData[]> {
  const sheetRange = options?.sheetRange || 'Match Log!A1:ZZ1000';
  
  // Load data from both sources in parallel
  const [sheetData, dbMatches] = await Promise.allSettled([
    fetchSheetData(sheetRange).catch(err => {
      console.warn('⚠️ Failed to fetch Google Sheets data:', err.message);
      return [] as MatchData[];
    }),
    getMatches({
      teamId: options?.teamId,
      teamIds: options?.teamIds,
      startDate: options?.startDate,
      endDate: options?.endDate,
    }).catch(err => {
      console.warn('⚠️ Failed to fetch PostgreSQL matches:', err.message);
      return [];
    }),
  ]);

  const sheetMatches: MatchData[] = sheetData.status === 'fulfilled' ? sheetData.value : [];
  const dbMatchesData = dbMatches.status === 'fulfilled' ? dbMatches.value : [];

  // Convert PostgreSQL matches to MatchData format
  const convertedDbMatches: MatchData[] = dbMatchesData.map(convertMatchToMatchData);

  // Merge and deduplicate
  const matchMap = new Map<string, MatchData>();
  const sheetMatchIds = new Map<string, string>(); // Track Match IDs from Google Sheets

  // First, add Google Sheets data and track their Match IDs
  // Use Match ID as primary key if available, otherwise use date+opponent
  sheetMatches.forEach(match => {
    const matchId = match['Match ID'] || match['match id'] || match['MatchId'] || match['matchId'];
    let key: string | null = null;
    
    // Prefer Match ID as the key
    if (matchId) {
      key = `id:${String(matchId).toLowerCase()}`;
    } else {
      // Fall back to date+opponent
      key = getMatchKey(match);
    }
    
    if (key) {
      // Only add if we don't already have this match (by key)
      if (!matchMap.has(key)) {
        matchMap.set(key, match);
        // Store the Match ID from Google Sheets for this match
        if (matchId) {
          sheetMatchIds.set(key, String(matchId));
        }
      } else {
        // If we already have this match, log it for debugging
        console.log(`⚠️ Duplicate match skipped (Sheet): ${key} (Match ID: ${matchId || 'none'})`);
      }
    } else {
      // Log matches that couldn't be keyed (missing date and opponent)
      console.warn(`⚠️ Match skipped (no date/opponent/Match ID): ${matchId || 'unknown'}`);
    }
  });

  // Then, add/override with PostgreSQL data (prefer DB over Sheet)
  convertedDbMatches.forEach(match => {
    const matchId = match['Match ID'] || match['match id'] || match['MatchId'] || match['matchId'];
    let key: string | null = null;
    
    // Prefer Match ID as the key
    if (matchId) {
      key = `id:${String(matchId).toLowerCase()}`;
    } else {
      // Fall back to date+opponent
      key = getMatchKey(match);
    }
    
    if (key) {
      // Preserve Match ID from Google Sheets if available (for display/lookup purposes)
      const sheetMatchId = sheetMatchIds.get(key);
      if (sheetMatchId) {
        // Use the Google Sheets Match ID instead of database integer ID
        match['Match ID'] = sheetMatchId;
      }
      // Override if exists, or add if new
      matchMap.set(key, match);
      console.log(`✅ Added DB match to merged data: ID=${matchId}, Date=${match['Date']}, Opponent=${match['Opponent']}, Key=${key}`);
    } else {
      // Log matches that couldn't be keyed with more details
      console.warn(`⚠️ DB match skipped (no date/opponent/Match ID):`, {
        matchId: matchId || 'none',
        date: match['Date'] || match['date'] || 'none',
        opponent: match['Opponent'] || match['opponent'] || 'none',
        team: match['Team'] || 'none',
        fullMatch: match
      });
    }
  });

  // Convert map to array and sort by date
  const merged = Array.from(matchMap.values());
  
  // Ensure all dates are in MM/DD/YYYY format to match Google Sheets format
  // This ensures consistency across all matches
  merged.forEach(match => {
    if (match['Date']) {
      const dateValue: any = match['Date'];
      let dateStr: string = '';
      
      // Convert to Date object if needed
      let dateObj: Date | null = null;
      if (dateValue instanceof Date) {
        dateObj = dateValue;
      } else if (typeof dateValue === 'string') {
        if (dateValue.includes('T')) {
          dateObj = new Date(dateValue);
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
          // YYYY-MM-DD format - convert to MM/DD/YYYY
          dateObj = new Date(dateValue);
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateValue)) {
          // Already MM/DD/YYYY - keep as-is
          dateStr = dateValue;
        } else {
          dateObj = new Date(dateValue);
        }
      }
      
      // Convert Date object to MM/DD/YYYY
      if (dateObj && !isNaN(dateObj.getTime()) && !dateStr) {
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const year = dateObj.getFullYear();
        dateStr = `${month}/${day}/${year}`;
        match['Date'] = dateStr;
      } else if (!dateStr) {
        match['Date'] = String(dateValue || '');
      }
    }
  });
  
  // Sort by date (most recent first)
  merged.sort((a, b) => {
    const dateA = String(a['Date'] || a['date'] || '');
    const dateB = String(b['Date'] || b['date'] || '');
    return dateB.localeCompare(dateA);
  });

  console.log(`📊 Merged data: ${sheetMatches.length} from Sheets, ${convertedDbMatches.length} from DB, ${merged.length} total (after deduplication)`);

  return merged;
}
