/**
 * Match Statistics Computation Service
 * 
 * Computes all derived metrics from raw match data input.
 * This replaces Google Sheets formulas and ensures consistency.
 */

export interface RawMatchStats {
  // Game Info
  teamId?: number;
  opponentName: string;
  matchDate: string;
  competitionType?: string;
  result?: string;
  venue?: string;
  referee?: string;
  notes?: string;
  
  // 1st Half Stats
  goalsFor1stHalf?: number;
  goalsAgainst1stHalf?: number;
  shotsFor1stHalf?: number;
  shotsAgainst1stHalf?: number;
  attemptsFor1stHalf?: number;
  attemptsAgainst1stHalf?: number;
  passesFor1stHalf?: number;
  passesAgainst1stHalf?: number;
  
  // 2nd Half Stats
  goalsFor2ndHalf?: number;
  goalsAgainst2ndHalf?: number;
  shotsFor2ndHalf?: number;
  shotsAgainst2ndHalf?: number;
  attemptsFor2ndHalf?: number;
  attemptsAgainst2ndHalf?: number;
  passesFor2ndHalf?: number;
  passesAgainst2ndHalf?: number;
  
  // Full Game Stats (computed from halves or entered directly)
  shotsFor?: number;
  shotsAgainst?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  attemptsFor?: number;
  attemptsAgainst?: number;
  insideBoxAttempts?: number;
  outsideBoxAttempts?: number;
  oppInsideBoxAttempts?: number;
  oppOutsideBoxAttempts?: number;
  xG?: number;
  xGA?: number;
  
  // Passing
  passesFor?: number;
  passesAgainst?: number;
  // Pass strings: "3-pass string", "4-pass string", ..., "10-pass string"
  [key: string]: any; // Allow dynamic pass string fields
  
  // Possession
  possession?: number;
  possessionDef?: number;
  possessionMid?: number;
  possessionAtt?: number;
  possessionMins?: number; // Possession minutes (for PPM calculation)
  oppPossessionMins?: number; // Opponent possession minutes (for Opp PPM calculation)
  
  // Set Pieces
  cornersFor?: number;
  cornersAgainst?: number;
  freeKicksFor?: number;
  freeKicksAgainst?: number;
  
  // Match Info
  matchDuration?: number; // minutes
}

export interface ComputedMatchStats {
  // TSR (Total Shots Ratio) - Veo-specific: uses total attempts (shots + goals)
  tsr?: number; // totalAttemptsFor / (totalAttemptsFor + totalAttemptsAgainst) * 100
  'opp tsr'?: number; // totalAttemptsAgainst / (totalAttemptsFor + totalAttemptsAgainst) * 100
  
  // Conversion Rate - Veo-specific: uses total attempts (shots + goals)
  'conversion rate'?: number; // goalsFor / totalAttemptsFor * 100
  'opp conversion rate'?: number; // goalsAgainst / totalAttemptsAgainst * 100
  
  // Pass Share
  'pass share'?: number; // passesFor / (passesFor + passesAgainst) * 100
  'opp pass share'?: number; // passesAgainst / (passesFor + passesAgainst) * 100
  
  // PPM (Passes Per Minute)
  ppm?: number; // passesFor / possessionMins
  'opp ppm'?: number; // passesAgainst / oppPossessionMins
  
  // Attempts Percentage (values are already percentages)
  'inside box attempts %'?: number; // insideBoxAttempts (direct value)
  'outside box attempts %'?: number; // 100 - insideBoxAttempts
  'opp inside box attempts %'?: number; // oppInsideBoxAttempts (direct value)
  'opp outside box attempts %'?: number; // 100 - oppInsideBoxAttempts
  
  // Possession by Zone
  'possess % (def)'?: number;
  'possess % (mid)'?: number;
  'possess % (att)'?: number;
  
  // LPC (Longest Pass Chain)
  'lpc avg'?: number; // Highest numbered "X-pass string" field with value > 0
  
  // SPI (Sustained Passing Index)
  spi?: number; // Sum of passes in pass strings / total passes * 100
  'spi (w)'?: number; // Weighted SPI (TODO: formula needed)
  'opp spi'?: number; // Opponent SPI: Sum of opponent passes in pass strings / total opponent passes * 100
  'opp spi (w)'?: number; // Weighted Opponent SPI (TODO: formula needed)
  
  // Total Attempts (Veo-specific: attempts = shots + goals)
  'total attempts (1st half)'?: number;
  'total attempts (2nd half)'?: number;
  'total attempts'?: number;
  'opp total attempts (1st half)'?: number;
  'opp total attempts (2nd half)'?: number;
  'opp total attempts'?: number;
  
  // Pass Strings aggregates
  'pass strings (3-5)'?: number;
  'pass strings (6+)'?: number;
  'pass strings <4'?: number; // Less than 4 (only 3-pass string)
  'pass strings 4+'?: number; // 4 or more (4, 5, 6, 7, 8, 9, 10-pass strings)
  
  // Allow dynamic fields
  [key: string]: any;
}

/**
 * Calculate LPC (Longest Pass Chain)
 * LPC is the highest numbered "X-pass string" field (3-10) with a non-zero value
 * Example: If "8-pass string" = 2 and all higher fields are 0/blank, LPC = 8
 */
function calculateLPC(rawStats: RawMatchStats): number | undefined {
  let maxLPC = 0;
  
  // Check fields from 3 to 10
  for (let i = 3; i <= 10; i++) {
    const fieldName = `${i}-pass string`;
    const value = rawStats[fieldName];
    
    // If field exists and has a non-zero value, this is a candidate
    if (value !== undefined && value !== null && value !== '' && Number(value) > 0) {
      maxLPC = Math.max(maxLPC, i);
    }
  }
  
  return maxLPC > 0 ? maxLPC : undefined;
}

/**
 * Calculate SPI (Sustained Passing Index)
 * Formula: Sum of passes in pass strings / total number of passes
 * NOTE: If "3-pass string" = 3, that means 3 strings of 3 passes each = 9 total passes
 * So for each pass string field, multiply by the number of passes: 3-pass × 3, 4-pass × 4, etc.
 * 
 * Weighted SPI (SPI (w)):
 * - Includes a 15% bonus for each pass in a pass string over 3
 * - Formula: ((3*count*1) + (4*count*1.15) + (5*count*1.30) + ...) / total passes
 * - Example: 3 3-pass strings, 4 5-pass strings, 2 6-pass strings, 150 total passes
 *   = ((3*3*1) + (5*4*1.3) + (6*2*1.45)) / 150
 */
function calculateSPI(rawStats: RawMatchStats): { spi?: number; spiW?: number; oppSpi?: number; oppSpiW?: number } {
  const result: { spi?: number; spiW?: number; oppSpi?: number; oppSpiW?: number } = {};
  
  // Calculate total passes from pass strings
  // Each "X-pass string" value represents the number of strings, so multiply by X to get total passes
  let totalPassesInStrings = 0;
  let weightedPassesInStrings = 0;
  
  for (let i = 3; i <= 10; i++) {
    const fieldName = `${i}-pass string`;
    const stringCount = rawStats[fieldName];
    if (stringCount !== undefined && stringCount !== null && stringCount !== '' && Number(stringCount) > 0) {
      const count = Number(stringCount);
      const passesInStrings = count * i; // Total passes for this string length
      totalPassesInStrings += passesInStrings;
      
      // Calculate weighted passes: 15% bonus for each pass over 3
      // For 3-pass: multiplier = 1.0 (no bonus)
      // For 4-pass: multiplier = 1.15 (1 pass over 3 = 15% bonus)
      // For 5-pass: multiplier = 1.30 (2 passes over 3 = 30% bonus)
      // For 6-pass: multiplier = 1.45 (3 passes over 3 = 45% bonus)
      // etc.
      const passesOver3 = Math.max(0, i - 3);
      const bonusMultiplier = 1 + (passesOver3 * 0.15);
      weightedPassesInStrings += passesInStrings * bonusMultiplier;
    }
  }
  
  // Get total passes for the team
  const passesFor1st = rawStats.passesFor1stHalf ?? 0;
  const passesFor2nd = rawStats.passesFor2ndHalf ?? 0;
  const totalPassesFor = passesFor1st + passesFor2nd > 0 ? passesFor1st + passesFor2nd : (rawStats.passesFor ?? 0);
  
  // Calculate SPI: total passes in strings / total passes
  if (totalPassesFor > 0 && totalPassesInStrings > 0) {
    result.spi = (totalPassesInStrings / totalPassesFor) * 100;
  }
  
  // Calculate Weighted SPI: weighted passes in strings / total passes
  if (totalPassesFor > 0 && weightedPassesInStrings > 0) {
    result.spiW = (weightedPassesInStrings / totalPassesFor) * 100;
  }
  
  // Calculate opponent SPI if opponent pass string fields are available
  // Look for fields like "OPP 3-Pass Strings", "Opp 3-pass string", "Opponent 3-pass string", etc.
  // Note: Google Sheet uses "OPP 3-Pass Strings" (plural, capitalized)
  let totalOppPassesInStrings = 0;
  let weightedOppPassesInStrings = 0;
  
  for (let i = 3; i <= 10; i++) {
    // Try various field name patterns for opponent pass strings
    // Match Google Sheet format: "OPP 3-Pass Strings" (case-insensitive)
    const possibleFieldNames = [
      `opp ${i}-pass strings`,      // "OPP 3-Pass Strings" (normalized)
      `opp ${i}-pass string`,       // Singular variant
      `opponent ${i}-pass strings`, // "Opponent 3-Pass Strings"
      `opponent ${i}-pass string`,  // Singular variant
      `opp ${i} pass strings`,      // Without hyphen
      `opponent ${i} pass strings`, // Without hyphen
      `opp ${i}-pass`,              // Short form
      `opponent ${i}-pass`,         // Short form
    ];
    
    let oppStringCount: number | undefined;
    for (const fieldName of possibleFieldNames) {
      // Check both exact case and case-insensitive
      const value = rawStats[fieldName] ?? rawStats[fieldName.toLowerCase()] ?? rawStats[fieldName.toUpperCase()];
      if (value !== undefined && value !== null && value !== '' && Number(value) > 0) {
        oppStringCount = Number(value);
        break;
      }
    }
    
    // Also check original key format (case-insensitive search in all keys)
    if (oppStringCount === undefined) {
      const lowerI = i.toString();
      for (const key in rawStats) {
        const lowerKey = key.toLowerCase();
        // Match patterns like "opp 3-pass strings", "opp 3 pass strings", etc.
        if ((lowerKey.includes('opp') || lowerKey.includes('opponent')) &&
            (lowerKey.includes(`${lowerI}-pass`) || lowerKey.includes(`${lowerI} pass`)) &&
            (lowerKey.includes('string') || lowerKey.includes('strings'))) {
          const value = rawStats[key];
          if (value !== undefined && value !== null && value !== '' && Number(value) > 0) {
            oppStringCount = Number(value);
            break;
          }
        }
      }
    }
    
    if (oppStringCount !== undefined && oppStringCount > 0) {
      const oppPassesInStrings = oppStringCount * i;
      totalOppPassesInStrings += oppPassesInStrings;
      
      // Calculate weighted passes with 15% bonus for each pass over 3
      const passesOver3 = Math.max(0, i - 3);
      const bonusMultiplier = 1 + (passesOver3 * 0.15);
      weightedOppPassesInStrings += oppPassesInStrings * bonusMultiplier;
    }
  }
  
  // Get total passes against (opponent passes)
  const passesAgainst1st = rawStats.passesAgainst1stHalf ?? 0;
  const passesAgainst2nd = rawStats.passesAgainst2ndHalf ?? 0;
  const totalPassesAgainst = passesAgainst1st + passesAgainst2nd > 0 ? passesAgainst1st + passesAgainst2nd : (rawStats.passesAgainst ?? 0);
  
  // Calculate Opp SPI: total opponent passes in strings / total opponent passes
  if (totalPassesAgainst > 0 && totalOppPassesInStrings > 0) {
    result.oppSpi = (totalOppPassesInStrings / totalPassesAgainst) * 100;
  }
  
  // Calculate Weighted Opp SPI: weighted opponent passes in strings / total opponent passes
  if (totalPassesAgainst > 0 && weightedOppPassesInStrings > 0) {
    result.oppSpiW = (weightedOppPassesInStrings / totalPassesAgainst) * 100;
  }
  
  return result;
}

/**
 * Compute all derived metrics from raw match statistics
 */
export function computeMatchStats(raw: RawMatchStats): ComputedMatchStats {
  const computed: ComputedMatchStats = {};
  
  // Sum 1st and 2nd half stats to get full game stats
  // Priority: compute from halves if available, otherwise use direct input
  const goalsFor1st = raw.goalsFor1stHalf ?? 0;
  const goalsFor2nd = raw.goalsFor2ndHalf ?? 0;
  const goalsForSum = goalsFor1st + goalsFor2nd;
  const goalsFor = (goalsFor1st > 0 || goalsFor2nd > 0) ? goalsForSum : (raw.goalsFor ?? undefined);
  
  const goalsAgainst1st = raw.goalsAgainst1stHalf ?? 0;
  const goalsAgainst2nd = raw.goalsAgainst2ndHalf ?? 0;
  const goalsAgainstSum = goalsAgainst1st + goalsAgainst2nd;
  const goalsAgainst = (goalsAgainst1st > 0 || goalsAgainst2nd > 0) ? goalsAgainstSum : (raw.goalsAgainst ?? undefined);
  
  const shotsFor1st = raw.shotsFor1stHalf ?? 0;
  const shotsFor2nd = raw.shotsFor2ndHalf ?? 0;
  const shotsForSum = shotsFor1st + shotsFor2nd;
  const shotsFor = (shotsFor1st > 0 || shotsFor2nd > 0) ? shotsForSum : (raw.shotsFor ?? undefined);
  
  const shotsAgainst1st = raw.shotsAgainst1stHalf ?? 0;
  const shotsAgainst2nd = raw.shotsAgainst2ndHalf ?? 0;
  const shotsAgainstSum = shotsAgainst1st + shotsAgainst2nd;
  const shotsAgainst = (shotsAgainst1st > 0 || shotsAgainst2nd > 0) ? shotsAgainstSum : (raw.shotsAgainst ?? undefined);
  
  const attemptsFor1st = raw.attemptsFor1stHalf ?? 0;
  const attemptsFor2nd = raw.attemptsFor2ndHalf ?? 0;
  const attemptsForSum = attemptsFor1st + attemptsFor2nd;
  const attemptsFor = (attemptsFor1st > 0 || attemptsFor2nd > 0) ? attemptsForSum : (raw.attemptsFor ?? undefined);
  
  const attemptsAgainst1st = raw.attemptsAgainst1stHalf ?? 0;
  const attemptsAgainst2nd = raw.attemptsAgainst2ndHalf ?? 0;
  const attemptsAgainstSum = attemptsAgainst1st + attemptsAgainst2nd;
  const attemptsAgainst = (attemptsAgainst1st > 0 || attemptsAgainst2nd > 0) ? attemptsAgainstSum : (raw.attemptsAgainst ?? undefined);
  
  // Calculate Total Attempts (Veo-specific: attempts = shots + goals)
  // Total Attempts = goals + shots (since shots are non-goal shots)
  const totalAttemptsFor1st = goalsFor1st + shotsFor1st;
  const totalAttemptsFor2nd = goalsFor2nd + shotsFor2nd;
  const totalAttemptsFor = totalAttemptsFor1st + totalAttemptsFor2nd;
  
  const totalAttemptsAgainst1st = goalsAgainst1st + shotsAgainst1st;
  const totalAttemptsAgainst2nd = goalsAgainst2nd + shotsAgainst2nd;
  const totalAttemptsAgainst = totalAttemptsAgainst1st + totalAttemptsAgainst2nd;
  
  // TSR Calculation (Total Shots Ratio) - using total attempts (Veo-specific)
  // TSR = totalAttemptsFor / (totalAttemptsFor + totalAttemptsAgainst) * 100
  if (totalAttemptsFor !== undefined && totalAttemptsAgainst !== undefined) {
    const totalAttempts = totalAttemptsFor + totalAttemptsAgainst;
    if (totalAttempts > 0) {
      computed.tsr = (totalAttemptsFor / totalAttempts) * 100;
      computed['opp tsr'] = (totalAttemptsAgainst / totalAttempts) * 100;
    }
  }
  
  // Conversion Rate - using total attempts (Veo-specific: attempts = shots + goals)
  // Conversion Rate = goalsFor / totalAttemptsFor * 100
  if (goalsFor !== undefined && totalAttemptsFor !== undefined && totalAttemptsFor > 0) {
    computed['conversion rate'] = (goalsFor / totalAttemptsFor) * 100;
  }
  if (goalsAgainst !== undefined && totalAttemptsAgainst !== undefined && totalAttemptsAgainst > 0) {
    computed['opp conversion rate'] = (goalsAgainst / totalAttemptsAgainst) * 100;
  }
  
  // Sum 1st and 2nd half passes to get full game passes
  const passesFor1st = raw.passesFor1stHalf ?? 0;
  const passesFor2nd = raw.passesFor2ndHalf ?? 0;
  const passesForSum = passesFor1st + passesFor2nd;
  const passesFor = (passesFor1st > 0 || passesFor2nd > 0) ? passesForSum : (raw.passesFor ?? undefined);
  
  const passesAgainst1st = raw.passesAgainst1stHalf ?? 0;
  const passesAgainst2nd = raw.passesAgainst2ndHalf ?? 0;
  const passesAgainstSum = passesAgainst1st + passesAgainst2nd;
  const passesAgainst = (passesAgainst1st > 0 || passesAgainst2nd > 0) ? passesAgainstSum : (raw.passesAgainst ?? undefined);
  
  // Pass Share - using full game stats
  if (passesFor !== undefined && passesAgainst !== undefined) {
    const totalPasses = passesFor + passesAgainst;
    if (totalPasses > 0) {
      computed['pass share'] = (passesFor / totalPasses) * 100;
      computed['opp pass share'] = (passesAgainst / totalPasses) * 100;
    }
  }
  
  // PPM (Passes Per Minute) - using possession minutes (not match duration)
  if (passesFor !== undefined && raw.possessionMins !== undefined && raw.possessionMins > 0) {
    computed.ppm = passesFor / raw.possessionMins;
  }
  if (passesAgainst !== undefined && raw.oppPossessionMins !== undefined && raw.oppPossessionMins > 0) {
    computed['opp ppm'] = passesAgainst / raw.oppPossessionMins;
  }
  
  // Inside/Outside Box Attempts % - values are already percentages
  // Inside box attempts % is the value directly (not a calculation)
  // Outside box attempts % = 100 - inside box attempts %
  if (raw.insideBoxAttempts !== undefined) {
    computed['inside box attempts %'] = raw.insideBoxAttempts;
    computed['outside box attempts %'] = 100 - raw.insideBoxAttempts;
  }
  if (raw.oppInsideBoxAttempts !== undefined) {
    computed['opp inside box attempts %'] = raw.oppInsideBoxAttempts;
    computed['opp outside box attempts %'] = 100 - raw.oppInsideBoxAttempts;
  }
  
  // Possession by Zone (if provided directly)
  if (raw.possessionDef !== undefined) {
    computed['possess % (def)'] = raw.possessionDef;
  }
  if (raw.possessionMid !== undefined) {
    computed['possess % (mid)'] = raw.possessionMid;
  }
  if (raw.possessionAtt !== undefined) {
    computed['possess % (att)'] = raw.possessionAtt;
  }
  
  // LPC (Longest Pass Chain)
  const lpc = calculateLPC(raw);
  if (lpc !== undefined) {
    computed['lpc avg'] = lpc;
  }
  
  // Pass Strings (3-5) - sum of 3, 4, 5 pass strings
  const passStrings35 = (raw['3-pass string'] ?? 0) + (raw['4-pass string'] ?? 0) + (raw['5-pass string'] ?? 0);
  if (passStrings35 > 0) {
    (computed as any)['pass strings (3-5)'] = passStrings35;
  }
  
  // Pass Strings (6+) - sum of 6, 7, 8, 9, 10 pass strings
  const passStrings6Plus = (raw['6-pass string'] ?? 0) + (raw['7-pass string'] ?? 0) + 
                           (raw['8-pass string'] ?? 0) + (raw['9-pass string'] ?? 0) + (raw['10-pass string'] ?? 0);
  if (passStrings6Plus > 0) {
    (computed as any)['pass strings (6+)'] = passStrings6Plus;
  }
  
  // Pass Strings <4 - less than 4 (only 3-pass string)
  const passStringsLessThan4 = raw['3-pass string'] ?? 0;
  if (passStringsLessThan4 > 0) {
    (computed as any)['pass strings <4'] = passStringsLessThan4;
  }
  
  // Pass Strings 4+ - 4 or more (4, 5, 6, 7, 8, 9, 10-pass strings)
  const passStrings4Plus = (raw['4-pass string'] ?? 0) + (raw['5-pass string'] ?? 0) + 
                           (raw['6-pass string'] ?? 0) + (raw['7-pass string'] ?? 0) + 
                           (raw['8-pass string'] ?? 0) + (raw['9-pass string'] ?? 0) + (raw['10-pass string'] ?? 0);
  if (passStrings4Plus > 0) {
    (computed as any)['pass strings 4+'] = passStrings4Plus;
  }
  
  // SPI (Sustained Passing Index)
  const spiResult = calculateSPI(raw);
  if (spiResult.spi !== undefined) {
    computed.spi = spiResult.spi;
  }
  if (spiResult.spiW !== undefined) {
    computed['spi (w)'] = spiResult.spiW;
  }
  if (spiResult.oppSpi !== undefined) {
    computed['opp spi'] = spiResult.oppSpi;
  }
  if (spiResult.oppSpiW !== undefined) {
    computed['opp spi (w)'] = spiResult.oppSpiW;
  }
  
  // Include computed full game stats in the output (for charts/display)
  // These are computed from 1st/2nd half stats
  if (goalsFor !== undefined) {
    (computed as any).goalsFor = goalsFor;
  }
  if (goalsAgainst !== undefined) {
    (computed as any).goalsAgainst = goalsAgainst;
  }
  if (shotsFor !== undefined) {
    (computed as any).shotsFor = shotsFor;
  }
  if (shotsAgainst !== undefined) {
    (computed as any).shotsAgainst = shotsAgainst;
  }
  if (attemptsFor !== undefined) {
    (computed as any).attemptsFor = attemptsFor;
  }
  if (attemptsAgainst !== undefined) {
    (computed as any).attemptsAgainst = attemptsAgainst;
  }
  if (passesFor !== undefined) {
    (computed as any).passesFor = passesFor;
  }
  if (passesAgainst !== undefined) {
    (computed as any).passesAgainst = passesAgainst;
  }
  
  // Total Attempts (Veo-specific: attempts = shots + goals)
  if (totalAttemptsFor1st > 0 || totalAttemptsFor2nd > 0) {
    (computed as any)['total attempts (1st half)'] = totalAttemptsFor1st;
    (computed as any)['total attempts (2nd half)'] = totalAttemptsFor2nd;
    (computed as any)['total attempts'] = totalAttemptsFor;
  }
  if (totalAttemptsAgainst1st > 0 || totalAttemptsAgainst2nd > 0) {
    (computed as any)['opp total attempts (1st half)'] = totalAttemptsAgainst1st;
    (computed as any)['opp total attempts (2nd half)'] = totalAttemptsAgainst2nd;
    (computed as any)['opp total attempts'] = totalAttemptsAgainst;
  }
  
  return computed;
}

/**
 * Normalize field names from form input to match expected raw stats format
 * Handles various field name formats (e.g., "Shots For" vs "shotsFor")
 */
export function normalizeFieldNames(formData: Record<string, any>): RawMatchStats {
  const normalized: any = {};
  
  // Field name mappings (case-insensitive)
  const fieldMappings: Record<string, string> = {
    // Game Info
    'team': 'teamId',
    'team id': 'teamId',
    'opponent': 'opponentName',
    'opponent name': 'opponentName',
    'date': 'matchDate',
    'match date': 'matchDate',
    'competition': 'competitionType',
    'competition type': 'competitionType',
    'result': 'result',
    
    // 1st Half Stats
    'goals for (1st half)': 'goalsFor1stHalf',
    'goals for 1st half': 'goalsFor1stHalf',
    'goalsfor1sthalf': 'goalsFor1stHalf',
    'goals against (1st half)': 'goalsAgainst1stHalf',
    'goals against 1st half': 'goalsAgainst1stHalf',
    'goalsagainst1sthalf': 'goalsAgainst1stHalf',
    'shots for (1st half)': 'shotsFor1stHalf',
    'shots for 1st half': 'shotsFor1stHalf',
    'shotsfor1sthalf': 'shotsFor1stHalf',
    'shots against (1st half)': 'shotsAgainst1stHalf',
    'shots against 1st half': 'shotsAgainst1stHalf',
    'shotsagainst1sthalf': 'shotsAgainst1stHalf',
    'attempts for (1st half)': 'attemptsFor1stHalf',
    'attempts for 1st half': 'attemptsFor1stHalf',
    'attemptsfor1sthalf': 'attemptsFor1stHalf',
    'attempts against (1st half)': 'attemptsAgainst1stHalf',
    'attempts against 1st half': 'attemptsAgainst1stHalf',
    'attemptsagainst1sthalf': 'attemptsAgainst1stHalf',
    'passes completed (1st half)': 'passesFor1stHalf',
    'passes completed 1st half': 'passesFor1stHalf',
    'passesfor1sthalf': 'passesFor1stHalf',
    'passes for (1st half)': 'passesFor1stHalf',
    'passes for 1st half': 'passesFor1stHalf',
    'opp passes completed (1st half)': 'passesAgainst1stHalf',
    'opp passes completed 1st half': 'passesAgainst1stHalf',
    'passesagainst1sthalf': 'passesAgainst1stHalf',
    'passes against (1st half)': 'passesAgainst1stHalf',
    'passes against 1st half': 'passesAgainst1stHalf',
    
    // 2nd Half Stats
    'goals for (2nd half)': 'goalsFor2ndHalf',
    'goals for 2nd half': 'goalsFor2ndHalf',
    'goalsfor2ndhalf': 'goalsFor2ndHalf',
    'goals against (2nd half)': 'goalsAgainst2ndHalf',
    'goals against 2nd half': 'goalsAgainst2ndHalf',
    'goalsagainst2ndhalf': 'goalsAgainst2ndHalf',
    'shots for (2nd half)': 'shotsFor2ndHalf',
    'shots for 2nd half': 'shotsFor2ndHalf',
    'shotsfor2ndhalf': 'shotsFor2ndHalf',
    'shots against (2nd half)': 'shotsAgainst2ndHalf',
    'shots against 2nd half': 'shotsAgainst2ndHalf',
    'shotsagainst2ndhalf': 'shotsAgainst2ndHalf',
    'attempts for (2nd half)': 'attemptsFor2ndHalf',
    'attempts for 2nd half': 'attemptsFor2ndHalf',
    'attemptsfor2ndhalf': 'attemptsFor2ndHalf',
    'attempts against (2nd half)': 'attemptsAgainst2ndHalf',
    'attempts against 2nd half': 'attemptsAgainst2ndHalf',
    'attemptsagainst2ndhalf': 'attemptsAgainst2ndHalf',
    'passes completed (2nd half)': 'passesFor2ndHalf',
    'passes completed 2nd half': 'passesFor2ndHalf',
    'passesfor2ndhalf': 'passesFor2ndHalf',
    'passes for (2nd half)': 'passesFor2ndHalf',
    'passes for 2nd half': 'passesFor2ndHalf',
    'opp passes completed (2nd half)': 'passesAgainst2ndHalf',
    'opp passes completed 2nd half': 'passesAgainst2ndHalf',
    'passesagainst2ndhalf': 'passesAgainst2ndHalf',
    'passes against (2nd half)': 'passesAgainst2ndHalf',
    'passes against 2nd half': 'passesAgainst2ndHalf',
    
    // Full Game Stats (for backward compatibility or direct entry)
    'shots for': 'shotsFor',
    'shotsfor': 'shotsFor',
    'shots against': 'shotsAgainst',
    'shotsagainst': 'shotsAgainst',
    'goals for': 'goalsFor',
    'goalsfor': 'goalsFor',
    'goals against': 'goalsAgainst',
    'goalsagainst': 'goalsAgainst',
    'attempts for': 'attemptsFor',
    'attemptsfor': 'attemptsFor',
    'attempts against': 'attemptsAgainst',
    'attemptsagainst': 'attemptsAgainst',
    'inside box attempts': 'insideBoxAttempts',
    'outside box attempts': 'outsideBoxAttempts',
    'opp inside box attempts': 'oppInsideBoxAttempts',
    'opp outside box attempts': 'oppOutsideBoxAttempts',
    'xg': 'xG',
    'xga': 'xGA',
    
    // Passing
    'passes for': 'passesFor',
    'passesfor': 'passesFor',
    'passes against': 'passesAgainst',
    'passesagainst': 'passesAgainst',
    
    // Possession
    'possession': 'possession',
    'poss': 'possession',
    'possession def': 'possessionDef',
    'possession mid': 'possessionMid',
    'possession att': 'possessionAtt',
    'possession mins': 'possessionMins',
    'possession minutes': 'possessionMins',
    'opp possession mins': 'oppPossessionMins',
    'opp possession minutes': 'oppPossessionMins',
    
    // Set Pieces
    'corners for': 'cornersFor',
    'corners against': 'cornersAgainst',
    'free kicks for': 'freeKicksFor',
    'free kicks against': 'freeKicksAgainst',
    
    // Match Info
    'match duration': 'matchDuration',
    'duration': 'matchDuration',
    'venue': 'venue',
    'referee': 'referee',
    'notes': 'notes',
  };
  
  // Normalize field names
  for (const [key, value] of Object.entries(formData)) {
    const lowerKey = key.toLowerCase().trim();
    
    // Check if there's an exact mapping first
    if (fieldMappings[lowerKey]) {
      normalized[fieldMappings[lowerKey]] = value;
    } else {
      // Try pattern matching for 1st/2nd half fields
      let matched = false;
      
      // Check for 1st half patterns
      if ((lowerKey.includes('1st half') || lowerKey.includes('first half') || lowerKey.includes('(1st') || lowerKey.includes('(first')) &&
          (lowerKey.includes('goal') || lowerKey.includes('shot') || lowerKey.includes('attempt'))) {
        if (lowerKey.includes('goal') && lowerKey.includes('for')) {
          normalized.goalsFor1stHalf = value;
          matched = true;
        } else if (lowerKey.includes('goal') && lowerKey.includes('against')) {
          normalized.goalsAgainst1stHalf = value;
          matched = true;
        } else if (lowerKey.includes('shot') && lowerKey.includes('for')) {
          normalized.shotsFor1stHalf = value;
          matched = true;
        } else if (lowerKey.includes('shot') && lowerKey.includes('against')) {
          normalized.shotsAgainst1stHalf = value;
          matched = true;
        } else if (lowerKey.includes('attempt') && lowerKey.includes('for')) {
          normalized.attemptsFor1stHalf = value;
          matched = true;
        } else if (lowerKey.includes('attempt') && lowerKey.includes('against')) {
          normalized.attemptsAgainst1stHalf = value;
          matched = true;
        }
      }
      
      // Check for 2nd half patterns
      if (!matched && (lowerKey.includes('2nd half') || lowerKey.includes('second half') || lowerKey.includes('(2nd') || lowerKey.includes('(second')) &&
          (lowerKey.includes('goal') || lowerKey.includes('shot') || lowerKey.includes('attempt'))) {
        if (lowerKey.includes('goal') && lowerKey.includes('for')) {
          normalized.goalsFor2ndHalf = value;
          matched = true;
        } else if (lowerKey.includes('goal') && lowerKey.includes('against')) {
          normalized.goalsAgainst2ndHalf = value;
          matched = true;
        } else if (lowerKey.includes('shot') && lowerKey.includes('for')) {
          normalized.shotsFor2ndHalf = value;
          matched = true;
        } else if (lowerKey.includes('shot') && lowerKey.includes('against')) {
          normalized.shotsAgainst2ndHalf = value;
          matched = true;
        } else if (lowerKey.includes('attempt') && lowerKey.includes('for')) {
          normalized.attemptsFor2ndHalf = value;
          matched = true;
        } else if (lowerKey.includes('attempt') && lowerKey.includes('against')) {
          normalized.attemptsAgainst2ndHalf = value;
          matched = true;
        }
      }
      
      // If not matched by pattern, check for pass string or keep original
      if (!matched) {
        if (lowerKey.includes('pass string')) {
          // Pass string fields: keep as-is (e.g., "3-pass string")
          normalized[key] = value;
        } else {
          // Keep original key if no mapping found
          normalized[key] = value;
        }
      }
    }
  }
  
  return normalized as RawMatchStats;
}
