/**
 * JOGA Brand Colors
 * Nike Volt Yellow and Nike Valor Blue
 */

// JOGA Brand Colors
export const JOGA_COLORS = {
  voltYellow: '#ceff00',      // rgb(206, 255, 0) - Nike Volt Yellow
  valorBlue: '#6787aa',       // rgb(103, 135, 170) - Nike Valor Blue
  voltYellowRgb: 'rgb(206, 255, 0)',
  valorBlueRgb: 'rgb(103, 135, 170)',
};

// Opponent colors - shades of gray
export const OPPONENT_COLORS = {
  primary: '#6b7280',         // gray-500
  secondary: '#9ca3af',       // gray-400
  dark: '#4b5563',            // gray-600
  light: '#d1d5db',           // gray-300
};

// Complementary colors for Valor Blue (often paired with white and black)
export const VALOR_BLUE_COMPLEMENTS = {
  white: '#ffffff',
  black: '#000000',
  darkBlue: '#4a5568',        // darker shade for contrast
};

// Complementary colors for Volt Yellow (often paired with black)
export const VOLT_YELLOW_COMPLEMENTS = {
  black: '#000000',
  darkGray: '#1f2937',        // dark gray for contrast
};

/**
 * Get colors for JOGA team data (primary colors)
 */
export function getJogaTeamColors(): string[] {
  return [JOGA_COLORS.voltYellow, JOGA_COLORS.valorBlue];
}

/**
 * Get colors for opponent data (gray shades)
 */
export function getOpponentColors(): string[] {
  return [OPPONENT_COLORS.primary, OPPONENT_COLORS.secondary];
}

/**
 * Get default chart colors (JOGA primary, opponent gray)
 */
export function getDefaultChartColors(): string[] {
  return [JOGA_COLORS.voltYellow, OPPONENT_COLORS.primary];
}

/**
 * Determine if a column/key represents JOGA team data vs opponent data
 */
export function isJogaTeamData(key: string, columnName: string): boolean {
  const lowerKey = key.toLowerCase();
  const lowerColumn = columnName.toLowerCase();
  
  // Check for opponent indicators
  const opponentPatterns = ['opp', 'against', 'opponent', 'opp ', 'opp.'];

  // Check for JOGA team indicators (not opponent)
  const isOpponent = opponentPatterns.some(pattern => 
    lowerKey.includes(pattern) || lowerColumn.includes(pattern)
  );

  return !isOpponent;
}

