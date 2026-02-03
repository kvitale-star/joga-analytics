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
  const matchData: MatchData = {
    // Core match info
    'Match ID': match.matchIdExternal || String(match.id), // Prefer external ID, fall back to database ID
    'Team': match.teamSlug || match.teamDisplayName || '', // Use team slug/name for frontend
    'Opponent': match.opponentName,
    'Date': match.matchDate,
    'Match Date': match.matchDate, // Add both formats for compatibility
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
