import { JOGA_COLORS, OPPONENT_COLORS, isJogaTeamData } from './colors';

/**
 * Determines the best chart type based on column name patterns
 */
export type ChartType = 'bar' | 'line' | 'area' | 'combo';

export interface ChartConfig {
  type: ChartType;
  color: string;
  title: string;
  yAxisLabel?: string;
  domain?: [number, number];
}

/**
 * Detects if a column name matches certain patterns
 */
function matchesPattern(columnName: string, patterns: string[]): boolean {
  const lower = columnName.toLowerCase();
  return patterns.some(pattern => lower.includes(pattern.toLowerCase()));
}

/**
 * Determines chart type and styling based on column name
 */
export function getChartConfig(columnName: string, hasPair: boolean = false): ChartConfig {
  const name = columnName.toLowerCase();

  // Determine if this is JOGA team data or opponent data
  const isJogaData = isJogaTeamData(columnName, columnName);
  
  // Percentage-based metrics (0-100) - use line charts
  if (matchesPattern(columnName, ['possession', 'pass%', 'pass accuracy', 'completion%', 'accuracy', 'rate', '%'])) {
    return {
      type: 'line',
      color: isJogaData ? JOGA_COLORS.voltYellow : OPPONENT_COLORS.primary,
      title: columnName,
      yAxisLabel: '%',
      domain: [0, 100],
    };
  }

  // Passing statistics - use bar charts
  if (matchesPattern(columnName, ['pass', 'passes', 'passing', 'assist'])) {
    return {
      type: 'bar',
      color: isJogaData ? JOGA_COLORS.voltYellow : OPPONENT_COLORS.primary,
      title: columnName,
    };
  }

  // Shooting statistics - use bar charts
  if (matchesPattern(columnName, ['shot', 'goal', 'shooting', 'conversion'])) {
    return {
      type: 'bar',
      color: isJogaData ? JOGA_COLORS.voltYellow : OPPONENT_COLORS.primary,
      title: columnName,
    };
  }

  // Defensive statistics - use bar charts
  if (matchesPattern(columnName, ['tackle', 'intercept', 'clearance', 'block', 'defensive', 'defense'])) {
    return {
      type: 'bar',
      color: isJogaData ? JOGA_COLORS.voltYellow : OPPONENT_COLORS.primary,
      title: columnName,
    };
  }

  // Expected goals (xG) - use area charts
  if (matchesPattern(columnName, ['xg', 'expected', 'xga'])) {
    return {
      type: 'area',
      color: isJogaData ? JOGA_COLORS.voltYellow : OPPONENT_COLORS.primary,
      title: columnName,
    };
  }

  // Cards - use bar charts
  if (matchesPattern(columnName, ['card', 'yellow', 'red', 'foul'])) {
    return {
      type: 'bar',
      color: isJogaData ? JOGA_COLORS.voltYellow : OPPONENT_COLORS.primary,
      title: columnName,
    };
  }

  // Set pieces - use bar charts
  if (matchesPattern(columnName, ['corner', 'free kick', 'penalty', 'set piece'])) {
    return {
      type: 'bar',
      color: isJogaData ? JOGA_COLORS.voltYellow : OPPONENT_COLORS.primary,
      title: columnName,
    };
  }

  // Time-based or sequential metrics - use line charts
  if (matchesPattern(columnName, ['time', 'minute', 'duration', 'sequence', 'trend'])) {
    return {
      type: 'line',
      color: isJogaData ? JOGA_COLORS.voltYellow : OPPONENT_COLORS.primary,
      title: columnName,
    };
  }

  // If there's a pair (for/against), use combo chart
  // Note: title will be updated by getPairTitle when rendering
  if (hasPair) {
    return {
      type: 'combo',
      color: JOGA_COLORS.voltYellow, // JOGA color for "For" (first color)
      title: columnName,
    };
  }

  // Default: bar chart for most numeric data
  return {
    type: 'bar',
    color: isJogaData ? JOGA_COLORS.voltYellow : OPPONENT_COLORS.primary,
    title: columnName,
  };
}

/**
 * Groups columns that might be related (e.g., "Shots For" and "Shots Against")
 */
export function findColumnPairs(columns: string[]): Map<string, string | null> {
  const pairs = new Map<string, string | null>();
  const processed = new Set<string>();

  columns.forEach(col => {
    if (processed.has(col)) return;

    const lower = col.toLowerCase().trim();
    
    // Look for "for/against" pairs - more flexible matching
    // Match patterns like: "X For", "X for", "for X", etc.
    const hasFor = lower.includes(' for') || 
                   lower.endsWith(' for') || 
                   lower.startsWith('for ') ||
                   (lower.includes('for') && !lower.includes('against'));
    
    if (hasFor) {
      // Extract the base metric name (remove "for" and variations)
      let baseMetric = lower
        .replace(/\s*(for|f)\s*$/i, '')
        .replace(/^\s*(for|f)\s+/i, '')
        .replace(/\s+(for|f)\s+/i, ' ')
        .trim();
      
      // Normalize plural/singular (e.g., "goal" vs "goals")
      const singularMetric = baseMetric.replace(/s$/, '');
      
      // Look for matching "against" column
      const againstCol = columns.find(c => {
        if (c === col || processed.has(c)) return false;
        
        const cLower = c.toLowerCase().trim();
        
        // Check if it contains "against"
        const hasAgainst = cLower.includes(' against') || 
                          cLower.endsWith(' against') ||
                          cLower.startsWith('against ') ||
                          (cLower.includes('against') && !cLower.includes('for'));
        
        if (!hasAgainst) return false;
        
        // Extract base metric from the "against" column
        let againstBase = cLower
          .replace(/\s*(against|a)\s*$/i, '')
          .replace(/^\s*(against|a)\s+/i, '')
          .replace(/\s+(against|a)\s+/i, ' ')
          .trim();
        
        // Normalize plural/singular
        const singularAgainst = againstBase.replace(/s$/, '');
        
        // Check if base metrics match (allowing for flexibility)
        // Match exact, or if one contains the other, or if singular forms match
        return baseMetric === againstBase || 
               baseMetric.includes(againstBase) || 
               againstBase.includes(baseMetric) ||
               singularMetric === singularAgainst ||
               singularMetric === againstBase ||
               baseMetric === singularAgainst;
      });
      
      if (againstCol) {
        pairs.set(col, againstCol);
        pairs.set(againstCol, col);
        processed.add(col);
        processed.add(againstCol);
      }
    }
  });

  return pairs;
}

/**
 * Gets a combined title for paired columns
 */
export function getPairTitle(columnKey: string, pairColumnKey: string | null): string {
  if (!pairColumnKey) return columnKey;
  
  // Helper to safely remove suffix without cutting words
  const removeSuffix = (text: string, suffix: string): string => {
    const lower = text.toLowerCase();
    const suffixLower = suffix.toLowerCase();
    
    // Remove suffix only if it appears as a separate word at the end
    if (lower.endsWith(` ${suffixLower}`)) {
      return text.slice(0, -(suffixLower.length + 1)).trim();
    }
    // Try removing from the end more carefully
    const regex = new RegExp(`\\s+${suffixLower}\\s*$`, 'i');
    return text.replace(regex, '').trim();
  };
  
  const lower1 = columnKey.toLowerCase();
  const lower2 = pairColumnKey.toLowerCase();
  
  // Extract base metric name (remove "for" and "against" carefully)
  let base1 = removeSuffix(columnKey, 'for');
  if (base1 === columnKey) {
    // Try removing 'f' only if it's a separate word
    base1 = columnKey.replace(/\s+f\s*$/i, '').trim();
  }
  
  let base2 = removeSuffix(pairColumnKey, 'against');
  if (base2 === pairColumnKey) {
    // Try removing 'a' only if it's a separate word
    base2 = pairColumnKey.replace(/\s+a\s*$/i, '').trim();
  }
  
  // Use the longer base name (more descriptive), or try to match them
  let baseMetric = base1.length > base2.length ? base1 : base2;
  
  // If they're similar, use the one that's more complete
  if (base1.toLowerCase().includes(base2.toLowerCase()) || base2.toLowerCase().includes(base1.toLowerCase())) {
    baseMetric = base1.length > base2.length ? base1 : base2;
  }
  
  // Capitalize first letter of each word
  const capitalized = baseMetric
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return capitalized || 'Statistics';
}

/**
 * Checks if a column should be excluded from auto-charting
 */
export function shouldExcludeColumn(columnName: string, teamKey: string, opponentKey: string): boolean {
  const name = columnName.toLowerCase();
  const excludePatterns = [
    teamKey.toLowerCase(),
    opponentKey.toLowerCase(),
    'date',
    'match',
    'game',
    'id',
    'team',
    'opponent',
    'pass strings',
    'pass chains',
    'cpi',
    'behavioral avg',
    'behavioral average',
    'spi',
    'spi (w)',
    'opp spi',
    'opp spi (w)',
    'xg',
    'xg (opp)',
    'goals for',
    'goals against',
    'shots for',
    'shots against',
  ];
  
  return excludePatterns.some(pattern => name === pattern || name.includes(pattern));
}

