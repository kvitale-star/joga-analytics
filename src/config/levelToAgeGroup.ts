/**
 * Level to Age Group Mapping
 * 
 * Maps team levels (e.g., U13, U14) to age groups based on season year.
 * Used for auto-setting age groups when creating/bumping teams.
 * 
 * Calculation: Age group = season year - level age
 * Example: U13 in 2026 → players are 13 in 2026 → born in 2013 → "Aug 2013 - July 2014"
 */

/**
 * Calculate age group from level and season year
 * Returns format: "Aug YYYY - July YYYY" (e.g., "Aug 2014 - July 2015")
 * 
 * @param level - Team level (e.g., "U13", "U14")
 * @param seasonYear - Season year (e.g., 2026, "2026")
 * @returns Age group string in format "Aug YYYY - July YYYY"
 */
export function calculateAgeGroupFromLevel(
  level: string,
  seasonYear: number | string
): string {
  const levelNum = parseInt(level.replace(/^U/i, ''), 10);
  if (isNaN(levelNum)) {
    throw new Error(`Invalid level format: ${level}`);
  }

  const year = typeof seasonYear === 'string' ? parseInt(seasonYear, 10) : seasonYear;
  if (isNaN(year)) {
    throw new Error(`Invalid season year: ${seasonYear}`);
  }

  // Calculate birth year: season year - age
  const birthYear = year - levelNum;

  // Age group is Aug [birthYear] - July [birthYear + 1]
  // e.g., U13 in 2026: Aug 2013 - July 2014
  return `Aug ${birthYear} - July ${birthYear + 1}`;
}

/**
 * Get all available age group options for dropdown
 * Returns array with month ranges first, then single years
 */
export function getAgeGroupOptions(): string[] {
  const monthRanges: string[] = [];
  const singleYears: string[] = [];

  // Month ranges: Aug 2010 - July 2011 through Aug 2017 - July 2018
  for (let year = 2010; year <= 2017; year++) {
    monthRanges.push(`Aug ${year} - July ${year + 1}`);
  }

  // Single years: 2011 through 2018
  for (let year = 2011; year <= 2018; year++) {
    singleYears.push(String(year));
  }

  return [...monthRanges, ...singleYears];
}
