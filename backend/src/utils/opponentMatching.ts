/**
 * Opponent Name Matching Utilities
 * 
 * Handles fuzzy matching of opponent names to account for:
 * - Case differences (e.g., "Titans" vs "TITANS")
 * - Whitespace variations
 * - Common formatting differences
 * - Typos and similar strings (Levenshtein distance)
 */

/**
 * Normalize opponent name for fuzzy matching
 * Handles case differences, whitespace, and common variations
 */
export function normalizeOpponentName(name: string): string {
  if (!name) return '';
  
  // Trim whitespace
  let normalized = name.trim();
  
  // Convert to lowercase for case-insensitive matching
  normalized = normalized.toLowerCase();
  
  // Remove multiple spaces
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Remove common punctuation that might cause mismatches
  normalized = normalized.replace(/[.,\-_]/g, '');
  
  return normalized;
}

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed to transform one string into another
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Create a matrix
  const matrix: number[][] = [];
  
  // Initialize first row and column
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Calculate similarity score between two opponent names (0-1, where 1 is identical)
 */
export function calculateOpponentSimilarity(name1: string, name2: string): number {
  const norm1 = normalizeOpponentName(name1);
  const norm2 = normalizeOpponentName(name2);
  
  if (norm1 === norm2) return 1.0;
  if (norm1.length === 0 || norm2.length === 0) return 0.0;
  
  // Check if one contains the other (partial match)
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return 0.8; // High similarity for partial matches
  }
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(norm1, norm2);
  const maxLen = Math.max(norm1.length, norm2.length);
  
  // Convert distance to similarity (0-1 scale)
  const similarity = 1 - (distance / maxLen);
  
  return Math.max(0, similarity);
}

/**
 * Check if two opponent names match (fuzzy)
 * Uses similarity threshold of 0.7 (70% similar) for fuzzy matching
 */
export function opponentNamesMatch(name1: string, name2: string, threshold: number = 0.7): boolean {
  const similarity = calculateOpponentSimilarity(name1, name2);
  return similarity >= threshold;
}

/**
 * Find the best matching opponent name from a list
 * Returns the best match if similarity is above threshold, null otherwise
 */
export function findBestOpponentMatch(
  inputName: string,
  candidateNames: string[],
  threshold: number = 0.7
): { name: string; similarity: number } | null {
  if (!inputName || candidateNames.length === 0) return null;
  
  let bestMatch: { name: string; similarity: number } | null = null;
  
  for (const candidate of candidateNames) {
    const similarity = calculateOpponentSimilarity(inputName, candidate);
    
    if (similarity >= threshold) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { name: candidate, similarity };
      }
    }
  }
  
  return bestMatch;
}
