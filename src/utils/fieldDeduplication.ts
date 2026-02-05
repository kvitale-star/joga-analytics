/**
 * Field Deduplication Utilities
 * 
 * Handles duplicate field names in match data by:
 * 1. Normalizing field names to a canonical format
 * 2. Merging values from duplicate fields
 * 3. Ensuring no data loss
 */

export interface DeduplicatedMatchData {
  [key: string]: string | number;
}

/**
 * Normalize a field name to canonical format (Title Case with spaces)
 * Examples:
 * - "shotsAgainst" -> "Shots Against"
 * - "opponentName" -> "Opponent Name"
 * - "Shots Against" -> "Shots Against" (already normalized)
 */
export function normalizeFieldName(fieldName: string): string {
  const trimmed = fieldName.trim();
  
  // First, normalize multiple spaces to single spaces
  // This handles cases like "Corners  Against" -> "Corners Against"
  let normalized = trimmed.replace(/\s+/g, ' ');
  
  // Then, normalize half indicators to consistent format: "(1st)" or "(2nd)"
  // Handle variations like "1stHalf", "1st Half", "(1st Half)", "For1st Half", etc.
  
  // Handle cases where "1st" or "2nd" appears without space (e.g., "For1st Half" -> "For (1st)")
  normalized = normalized.replace(/([a-z])(1st)\s+half/gi, '$1 ($2)');
  normalized = normalized.replace(/([a-z])(2nd)\s+half/gi, '$1 ($2)');
  
  // Replace "1stHalf" or "1st Half" with "(1st)"
  normalized = normalized.replace(/\b1st\s*half\b/gi, '(1st)');
  normalized = normalized.replace(/\b1sthalf\b/gi, '(1st)');
  normalized = normalized.replace(/\bfirst\s*half\b/gi, '(1st)');
  normalized = normalized.replace(/\bfirsthalf\b/gi, '(1st)');
  normalized = normalized.replace(/\(1st\s*half\)/gi, '(1st)');
  
  // Replace "2ndHalf" or "2nd Half" with "(2nd)"
  normalized = normalized.replace(/\b2nd\s*half\b/gi, '(2nd)');
  normalized = normalized.replace(/\b2ndhalf\b/gi, '(2nd)');
  normalized = normalized.replace(/\bsecond\s*half\b/gi, '(2nd)');
  normalized = normalized.replace(/\bsecondhalf\b/gi, '(2nd)');
  normalized = normalized.replace(/\(2nd\s*half\)/gi, '(2nd)');
  
  // Handle incomplete parentheses like "(1st)" or "(2nd)" - already correct, just ensure consistency
  normalized = normalized.replace(/\(first\)/gi, '(1st)');
  normalized = normalized.replace(/\(second\)/gi, '(2nd)');
  
  // Fix common typos/misspellings BEFORE other processing
  // Fix "Passed Comp" -> "Passes Comp" (should be plural, not past tense)
  // This must happen before the early return check
  normalized = normalized.replace(/\bpassed\s+comp\b/gi, 'Passes Comp');
  normalized = normalized.replace(/\bpassed\s+completed\b/gi, 'Passes Completed');
  normalized = normalized.replace(/\bopp\s+passed\s+comp\b/gi, 'Opp Passes Comp');
  normalized = normalized.replace(/\bopp\s+passed\s+completed\b/gi, 'Opp Passes Completed');
  
  // Normalize "Opponent Conversion Rate" or "Opp Conversion Rate" to "Opp Conv Rate" (shorter, consistent format)
  // Handle various forms: "Opponent Conversion Rate", "Opp Conversion Rate", "Opponent Conv Rate", etc.
  // Must check longer forms first to avoid partial replacements
  // Use word boundaries and be flexible with spacing
  normalized = normalized.replace(/\bopp\s+conversion\s+rate\b/gi, 'Opp Conv Rate');
  normalized = normalized.replace(/\bopponent\s+conversion\s+rate\b/gi, 'Opp Conv Rate');
  normalized = normalized.replace(/\bopponent\s+conv\s+rate\b/gi, 'Opp Conv Rate');
  
  // Also handle if it's already partially normalized but inconsistent (e.g., "Opp Conv Rate" vs "Opp Conv. Rate")
  // This ensures consistency even if some fields are already partially normalized
  normalized = normalized.replace(/\bopp\s+conv\.?\s+rate\b/gi, 'Opp Conv Rate');
  
  // If already in Title Case with spaces and proper parentheses, normalize spaces and return
  if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*(\s*\([^)]+\))?$/.test(normalized)) {
    // Normalize multiple spaces to single spaces before returning
    return normalized.replace(/\s+/g, ' ');
  }
  
  // Handle camelCase (e.g., "shotsAgainst" -> "Shots Against")
  if (/[a-z][A-Z]/.test(normalized)) {
    normalized = normalized
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  // Handle snake_case (e.g., "shots_against" -> "Shots Against")
  if (normalized.includes('_')) {
    normalized = normalized
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  // Handle lowercase (e.g., "opponent" -> "Opponent")
  if (normalized === normalized.toLowerCase() && !normalized.includes(' ') && !normalized.includes('(')) {
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
  
  // Special cases for common field names
  const specialCases: Record<string, string> = {
    'opponent': 'Opponent',
    'opponentname': 'Opponent',
    'opponent name': 'Opponent',
    'team': 'Team',
    'teamname': 'Team',
    'team name': 'Team',
    'team id': 'Team ID', // Keep Team ID separate (it's a number, not a name)
    'teamid': 'Team ID',
    'date': 'Date', // Prefer "Date" over "Match Date"
    'matchdate': 'Date',
    'match date': 'Date', // Normalize "Match Date" to "Date"
    'competitiontype': 'Competition Type',
    'competition type': 'Competition Type',
    'homeaway': 'Home/Away',
    'home/away': 'Home/Away',
    'home away': 'Home/Away',
  };
  
  const lowerNormalized = normalized.toLowerCase();
  if (specialCases[lowerNormalized]) {
    return specialCases[lowerNormalized];
  }
  
  // Default: capitalize first letter of each word, preserving parentheses
  // Split on any whitespace (including multiple spaces) and join with single space
  return normalized
    .split(/\s+/)
    .filter(word => word.length > 0) // Remove empty strings from multiple spaces
    .map(word => {
      // Preserve parentheses and their contents
      if (word.includes('(') && word.includes(')')) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Deduplicate match data by normalizing field names and merging values
 * 
 * Strategy:
 * 1. Normalize all field names to canonical format
 * 2. If duplicate normalized names exist, merge their values (prefer non-empty values)
 * 3. Return deduplicated data with canonical field names
 */
export function deduplicateMatchData(matchData: Record<string, string | number>): DeduplicatedMatchData {
  const normalized: Record<string, { value: string | number; originalKeys: string[] }> = {};
  
  // First pass: normalize all field names and collect values
  for (const [key, value] of Object.entries(matchData)) {
    if (value === undefined || value === null) continue;
    
    const normalizedKey = normalizeFieldName(key);
    
    if (!normalized[normalizedKey]) {
      normalized[normalizedKey] = {
        value: value,
        originalKeys: [key],
      };
    } else {
      // Merge: prefer non-empty/non-zero values
      const existingValue = normalized[normalizedKey].value;
      
      // If existing value is empty/null/zero and new value is not, use new value
      if (
        (existingValue === '' || existingValue === null || existingValue === 0 || existingValue === undefined) &&
        (value !== '' && value !== null && value !== 0 && value !== undefined)
      ) {
        normalized[normalizedKey].value = value;
      }
      // Special handling for Game Info fields: prefer shorter canonical names
      else if (normalizedKey === 'Date' && (key.toLowerCase() === 'match date' || key.toLowerCase() === 'matchdate')) {
        // Prefer "Date" over "Match Date" - keep existing "Date" value
        // (don't overwrite)
      }
      else if (normalizedKey === 'Opponent' && (key.toLowerCase().includes('opponent name') || key.toLowerCase().includes('opponentname'))) {
        // Prefer "Opponent" over "Opponent Name" - keep existing "Opponent" value
        // (don't overwrite)
      }
      // If both have values and they're different, prefer the one that looks more "complete"
      // (e.g., prefer "Shots Against" over "shotsAgainst" if both exist)
      else if (existingValue !== value) {
        // Prefer the value from the more "normalized" key (Title Case)
        if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(key)) {
          normalized[normalizedKey].value = value;
        }
      }
      
      normalized[normalizedKey].originalKeys.push(key);
    }
  }
  
  // Second pass: create final deduplicated object
  const result: DeduplicatedMatchData = {};
  for (const [normalizedKey, { value }] of Object.entries(normalized)) {
    result[normalizedKey] = value;
  }
  
  return result;
}

/**
 * Deduplicate column keys from match data array
 * Returns a deduplicated list of canonical field names
 */
export function deduplicateColumnKeys(matchDataArray: Record<string, string | number>[]): string[] {
  if (matchDataArray.length === 0) return [];
  
  // Collect all unique normalized field names across all matches
  const normalizedKeys = new Set<string>();
  
  for (const match of matchDataArray) {
    const deduplicated = deduplicateMatchData(match);
    Object.keys(deduplicated).forEach(key => normalizedKeys.add(key));
  }
  
  return Array.from(normalizedKeys).sort();
}

/**
 * Apply deduplication to an array of match data
 */
export function deduplicateMatchDataArray(
  matchDataArray: Record<string, string | number>[]
): DeduplicatedMatchData[] {
  return matchDataArray.map(match => deduplicateMatchData(match));
}
