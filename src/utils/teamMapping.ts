/**
 * Maps team slugs (from spreadsheet) to database teams
 * Shows Display Names in UI, uses slugs for filtering
 */

import { Team } from '../types/auth';

/**
 * Create a mapping of slug -> Team for quick lookups
 */
export function createTeamSlugMap(databaseTeams: Team[]): Map<string, Team> {
  const map = new Map<string, Team>();
  
  for (const team of databaseTeams) {
    if (team.isActive) {
      // Map by slug (normalized for case-insensitive matching)
      map.set(team.slug.toLowerCase().trim(), team);
    }
  }
  
  return map;
}

/**
 * Get Display Name for a team slug (from spreadsheet)
 * Returns slug if team not found
 */
export function getDisplayNameForSlug(
  slug: string,
  teamSlugMap: Map<string, Team>
): string {
  if (!slug || !slug.trim()) return slug;
  
  const normalized = slug.trim().toLowerCase();
  const team = teamSlugMap.get(normalized);
  
  if (team && team.displayName) {
    return team.displayName;
  }
  
  // Fallback to slug if no team found or no display name
  return slug;
}

/**
 * Get database team for a slug (from spreadsheet)
 */
export function getDatabaseTeamForSlug(
  slug: string,
  teamSlugMap: Map<string, Team>
): Team | null {
  if (!slug || !slug.trim()) return null;
  
  const normalized = slug.trim().toLowerCase();
  return teamSlugMap.get(normalized) || null;
}

/**
 * Get teams for dropdown (extract from match data, map to Display Names)
 */
export function getTeamsForDropdown(
  matchDataTeamNames: string[],
  teamSlugMap: Map<string, Team>
): Array<{ slug: string; displayName: string }> {
  const unique = [...new Set(matchDataTeamNames.filter(Boolean))];
  
  return unique.map(slug => ({
    slug: slug.trim(),
    displayName: getDisplayNameForSlug(slug, teamSlugMap),
  })).sort((a, b) => a.displayName.localeCompare(b.displayName));
}
