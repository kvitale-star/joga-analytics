/**
 * Match Data Service
 * 
 * Provides match data from PostgreSQL database in MatchData format
 * for charts and data views. This replaces the mergedDataService which
 * combined Google Sheets and PostgreSQL.
 */

import { getMatches } from './matchService.js';
import type { MatchData } from './sheetsService.js';

/**
 * Convert a PostgreSQL match to MatchData format (for charts)
 */
function convertMatchToMatchData(match: any): MatchData {
  // Convert matchDate to MM/DD/YYYY format to match Google Sheets format
  // Handle various formats: Date object, ISO string (YYYY-MM-DD), or already formatted string
  const matchDateValue: any = match.matchDate;
  let dateString: string = '';
  
  // First, convert to a Date object if needed
  // IMPORTANT: Parse YYYY-MM-DD strings manually to avoid UTC timezone conversion
  let dateObj: Date | null = null;
  if (matchDateValue instanceof Date) {
    dateObj = matchDateValue;
  } else if (typeof matchDateValue === 'string') {
    if (matchDateValue.includes('T')) {
      // ISO string with time - parse it (but extract date parts using local methods)
      const isoDate = new Date(matchDateValue);
      // Use local date methods to avoid timezone shift
      const year = isoDate.getFullYear();
      const month = isoDate.getMonth();
      const day = isoDate.getDate();
      dateObj = new Date(year, month, day);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(matchDateValue)) {
      // YYYY-MM-DD format - parse manually to avoid UTC conversion
      const parts = matchDateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (parts) {
        const year = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10) - 1; // JavaScript months are 0-indexed
        const day = parseInt(parts[3], 10);
        dateObj = new Date(year, month, day);
      }
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(matchDateValue)) {
      // Already MM/DD/YYYY format - use as-is
      dateString = matchDateValue;
    } else {
      // Try to parse as date
      dateObj = new Date(matchDateValue);
    }
  } else if (matchDateValue && typeof matchDateValue === 'object' && 'toISOString' in matchDateValue) {
    // Handle Date-like objects - use local date methods
    const tempDate = new Date(matchDateValue.toISOString());
    const year = tempDate.getFullYear();
    const month = tempDate.getMonth();
    const day = tempDate.getDate();
    dateObj = new Date(year, month, day);
  }
  
  // Convert Date object to MM/DD/YYYY format using local date methods
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
    'Match ID': match.matchIdExternal || String(match.id), // Prefer external ID, fall back to database ID
    'Team': match.teamSlug || match.teamDisplayName || '', // Use team slug/name for frontend
    'Opponent': match.opponentName,
    'Date': dateString, // Ensure it's a string in YYYY-MM-DD format
    'Match Date': dateString, // Add both formats for compatibility
    'Competition Type': match.competitionType || '',
    'Result': match.result || '',
    'Home/Away': match.isHome === true ? 'Home' : match.isHome === false ? 'Away' : 'Tournament',
    'Venue': match.venue || '',
    'Referee': match.referee || '',
    'Notes': match.notes || '',
  };

  // Flatten stats_json into matchData
  // stats_json contains both raw stats and computed stats
  if (match.statsJson) {
    Object.entries(match.statsJson).forEach(([key, value]) => {
      matchData[key] = value as string | number;
    });
  }

  // Add team ID if available
  if (match.teamId) {
    matchData['Team ID'] = match.teamId;
  }

  return matchData;
}

/**
 * Get match data from PostgreSQL in MatchData format
 * This is the primary function for fetching match data for charts
 */
export async function getMatchData(options?: {
  teamId?: number;
  teamIds?: number[];
  startDate?: string;
  endDate?: string;
}): Promise<MatchData[]> {
  // Fetch matches from PostgreSQL
  const dbMatches = await getMatches({
    teamId: options?.teamId,
    teamIds: options?.teamIds,
    startDate: options?.startDate,
    endDate: options?.endDate,
  });

  // Convert to MatchData format
  const matchData = dbMatches.map(convertMatchToMatchData);

  // Sort by date (most recent first)
  matchData.sort((a, b) => {
    const dateA = String(a['Date'] || a['Match Date'] || a['date'] || '');
    const dateB = String(b['Date'] || b['Match Date'] || b['date'] || '');
    return dateB.localeCompare(dateA);
  });

  console.log(`📊 Match data: ${matchData.length} matches from PostgreSQL`);

  return matchData;
}
