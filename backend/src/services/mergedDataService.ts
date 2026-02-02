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
  const matchData: MatchData = {
    // Core match info
    // Note: Match ID will be set from stats_json if available, otherwise use database ID
    // The merge logic will preserve Google Sheets Match IDs when overriding
    'Match ID': match.id, // Default to database ID, may be overridden
    'Opponent': match.opponentName,
    'Date': match.matchDate,
    'Competition Type': match.competitionType || '',
    'Result': match.result || '',
    'Home/Away': match.isHome === true ? 'Home' : match.isHome === false ? 'Away' : '',
    'Venue': match.venue || '',
    'Referee': match.referee || '',
    'Notes': match.notes || '',
  };

  // Flatten stats_json into matchData
  // stats_json contains both raw stats and computed stats
  if (match.statsJson) {
    Object.entries(match.statsJson).forEach(([key, value]) => {
      // Convert key to match Google Sheets format (capitalize, add spaces)
      // Keep original key as well for flexibility
      matchData[key] = value as string | number;
      
      // If stats_json contains a Match ID, use it (this would be from form input)
      if (key.toLowerCase() === 'match id' || key.toLowerCase() === 'matchid') {
        matchData['Match ID'] = value as string | number;
      }
      
      // Also add normalized version for compatibility
      const normalizedKey = normalizeKey(key);
      if (normalizedKey !== key) {
        matchData[normalizedKey] = value as string | number;
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
    } else {
      // Log matches that couldn't be keyed
      console.warn(`⚠️ DB match skipped (no date/opponent/Match ID): ${matchId || 'unknown'}`);
    }
  });

  // Convert map to array and sort by date
  const merged = Array.from(matchMap.values());
  
  // Sort by date (most recent first)
  merged.sort((a, b) => {
    const dateA = String(a['Date'] || a['date'] || '');
    const dateB = String(b['Date'] || b['date'] || '');
    return dateB.localeCompare(dateA);
  });

  console.log(`📊 Merged data: ${sheetMatches.length} from Sheets, ${convertedDbMatches.length} from DB, ${merged.length} total (after deduplication)`);

  return merged;
}
