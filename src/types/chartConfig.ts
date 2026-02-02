/**
 * Chart Configuration Types
 * Used for Phase 0.5: Chart Configuration
 */

export interface ChartConfig {
  visibleMetrics: string[];
  includeOpponent: boolean;
  isExpanded?: boolean; // Chart expansion state (default: false)
}

export interface ChartPreferences {
  [chartType: string]: ChartConfig;
}

export const DEFAULT_SHOTS_CONFIG: ChartConfig = {
  visibleMetrics: ['goalsFor', 'shotsFor', 'attemptsFor'],
  includeOpponent: false, // Turn off by default as requested
  isExpanded: true, // Full width by default
};

export const DEFAULT_POSSESSION_CONFIG: ChartConfig = {
  visibleMetrics: ['possession', 'passShare'], // All available metrics
  includeOpponent: false, // Turn off opponent by default
  isExpanded: false,
};

export const DEFAULT_GOALS_CONFIG: ChartConfig = {
  visibleMetrics: ['goalsFor', 'xG'],
  includeOpponent: true,
  isExpanded: false,
};

export const DEFAULT_XG_CONFIG: ChartConfig = {
  visibleMetrics: ['xG', 'goalsFor'],
  includeOpponent: true,
  isExpanded: false,
};

export const DEFAULT_CONVERSION_RATE_CONFIG: ChartConfig = {
  visibleMetrics: ['conversionRate', 'insideBoxConvRate', 'outsideBoxConvRate'], // Inside/Outside Box on by default
  includeOpponent: true,
  isExpanded: true, // Full width by default
};

export const DEFAULT_TSR_CONFIG: ChartConfig = {
  visibleMetrics: ['tsr', 'attemptsFor'], // Attempts on by default
  includeOpponent: false, // Turn off by default as requested
  isExpanded: false,
};

export const DEFAULT_PASSES_CONFIG: ChartConfig = {
  visibleMetrics: ['passesFor'], // All available metrics
  includeOpponent: false, // Turn off opponent by default
  isExpanded: false,
};

export const DEFAULT_PASS_SHARE_CONFIG: ChartConfig = {
  visibleMetrics: ['passShare'],
  includeOpponent: true,
  isExpanded: false,
};

export const DEFAULT_AVG_PASS_LENGTH_CONFIG: ChartConfig = {
  visibleMetrics: ['avgPassLength'],
  includeOpponent: true,
  isExpanded: false,
};

export const DEFAULT_PPM_CONFIG: ChartConfig = {
  visibleMetrics: ['ppm'], // All available metrics
  includeOpponent: false, // Turn off opponent by default
  isExpanded: false,
};

export const DEFAULT_PASS_STR_LENGTH_CONFIG: ChartConfig = {
  visibleMetrics: ['passStrings35', 'passStrings6Plus', 'lpc'], // All available metrics (excluding optional <4 and 4+)
  includeOpponent: false, // Turn off opponent by default
  isExpanded: true, // Full width by default
};

export const DEFAULT_SPI_CONFIG: ChartConfig = {
  visibleMetrics: ['spi', 'spiW'], // All available metrics
  includeOpponent: false, // Turn off opponent by default
  isExpanded: false,
};

export const DEFAULT_ATTEMPTS_CONFIG: ChartConfig = {
  visibleMetrics: ['attemptsFor'],
  includeOpponent: true,
  isExpanded: false,
};

export const DEFAULT_MISC_STATS_CONFIG: ChartConfig = {
  visibleMetrics: ['cornersFor', 'freeKickFor'],
  includeOpponent: true,
  isExpanded: false,
};

export const DEFAULT_POSITIONAL_ATTEMPTS_CONFIG: ChartConfig = {
  visibleMetrics: ['insideBoxConvRate', 'outsideBoxConvRate', 'insideBoxAttempts', 'outsideBoxAttempts'],
  includeOpponent: false, // Turn off by default as requested
  isExpanded: true, // Full width by default
};

export const DEFAULT_PASS_BY_ZONE_CONFIG: ChartConfig = {
  visibleMetrics: [], // Dynamic - will be populated from available zones
  includeOpponent: true,
  isExpanded: false,
};

export const DEFAULT_AUTO_CONFIG: ChartConfig = {
  visibleMetrics: [], // Dynamic - will be populated from column
  includeOpponent: false, // AutoChart handles opponent data differently
  isExpanded: false,
};

export type ChartType = 'shots' | 'possession' | 'goals' | 'xg' | 'conversionRate' | 'tsr' | 'passes' | 'passShare' | 'avgPassLength' | 'ppm' | 'passStrLength' | 'spi' | 'attempts' | 'miscStats' | 'positionalAttempts' | 'passByZone' | 'auto';

/**
 * Generate chart title based on visible metrics
 */
export function getChartTitle(chartType: ChartType, visibleMetrics: string[]): string {
  const metricLabels: Record<string, Record<string, string>> = {
    shots: {
      shotsFor: 'Shots',
      attemptsFor: 'Attempts',
      goalsFor: 'Goals',
    },
    possession: {
      possession: 'Possession',
      passShare: 'Pass Share',
      timeInPossession: 'Time in Possession',
    },
    goals: {
      goalsFor: 'Goals',
      xG: 'xG',
    },
    xg: {
      xG: 'xG',
      goalsFor: 'Goals',
    },
    conversionRate: {
      conversionRate: 'Conversion Rates',
      insideBoxConvRate: 'Inside Box Conv Rate',
      outsideBoxConvRate: 'Outside Box Conv Rate',
      attemptsFor: 'Attempts',
    },
    tsr: {
      tsr: 'Total Shots Ratio',
      attemptsFor: 'Attempts',
    },
    passes: {
      passesFor: 'Passes',
    },
    passShare: {
      passShare: 'Pass Share',
      possession: 'Possession',
    },
    avgPassLength: {
      avgPassLength: 'Avg Pass Length',
    },
    ppm: {
      ppm: 'PPM',
    },
    passStrLength: {
      passStrings35: '3-5 Strings',
      passStrings6Plus: '6+ Strings',
      lpc: 'LPC',
    },
    spi: {
      spi: 'SPI',
      spiW: 'SPI (w)',
    },
    attempts: {
      attemptsFor: 'Attempts',
      shotsFor: 'Shots',
      goalsFor: 'Goals',
    },
    miscStats: {
      cornersFor: 'Corners',
      freeKickFor: 'Free Kicks',
    },
    positionalAttempts: {
      insideBoxConvRate: 'Inside Box Conv Rate %',
      insideBoxAttempts: '% Attempts Inside Box',
      outsideBoxConvRate: 'Outside Box Conv Rate %',
      outsideBoxAttempts: '% Attempts Outside Box',
    },
    passByZone: {
      // Dynamic - zones will be added based on available data
    },
    auto: {
      // Dynamic - will use column name
    },
  };
  
  const labels = metricLabels[chartType];
  if (!labels) return 'Chart';
  
  const visibleLabels = visibleMetrics
    .filter(m => labels[m])
    .map(m => labels[m]);
  
  if (visibleLabels.length === 0) {
    // Fallback to default titles
    const defaultTitles: Record<ChartType, string> = {
      shots: 'Shots',
      possession: 'Possession',
      goals: 'Goals',
      xg: 'Expected Goals (xG)',
      conversionRate: 'Conversion Rates',
      tsr: 'Total Shots Ratio',
      passes: 'Passes',
      passShare: 'Pass Share',
      avgPassLength: 'Average Pass Length',
      ppm: 'Passes Per Minute',
      passStrLength: 'Pass Strings',
      spi: 'Sustained Passing Index',
      attempts: 'Attempts',
      miscStats: 'Corners & Free Kicks',
      positionalAttempts: 'Conversion Rates & Attempts by Field Position',
      passByZone: 'Pass % by Zone',
      auto: 'Chart',
    };
    return defaultTitles[chartType] || 'Chart';
  }
  
  return visibleLabels.join(' & ');
}

const CHART_DEFAULTS: Record<ChartType, ChartConfig> = {
  shots: DEFAULT_SHOTS_CONFIG,
  possession: DEFAULT_POSSESSION_CONFIG,
  goals: DEFAULT_GOALS_CONFIG,
  xg: DEFAULT_XG_CONFIG,
  conversionRate: DEFAULT_CONVERSION_RATE_CONFIG,
  tsr: DEFAULT_TSR_CONFIG,
  passes: DEFAULT_PASSES_CONFIG,
  passShare: DEFAULT_PASS_SHARE_CONFIG,
  avgPassLength: DEFAULT_AVG_PASS_LENGTH_CONFIG,
  ppm: DEFAULT_PPM_CONFIG,
  passStrLength: DEFAULT_PASS_STR_LENGTH_CONFIG,
  spi: DEFAULT_SPI_CONFIG,
  attempts: DEFAULT_ATTEMPTS_CONFIG,
  miscStats: DEFAULT_MISC_STATS_CONFIG,
  positionalAttempts: DEFAULT_POSITIONAL_ATTEMPTS_CONFIG,
  passByZone: DEFAULT_PASS_BY_ZONE_CONFIG,
  auto: DEFAULT_AUTO_CONFIG,
};

/**
 * Check if a chart configuration has been customized from defaults
 */
export function isChartCustomized(
  chartType: ChartType,
  config: ChartConfig
): boolean {
  const defaultConfig = CHART_DEFAULTS[chartType];
  if (!defaultConfig) return false;
  
  // Check if visibleMetrics differ
  const metricsMatch = 
    config.visibleMetrics.length === defaultConfig.visibleMetrics.length &&
    config.visibleMetrics.every(metric => defaultConfig.visibleMetrics.includes(metric)) &&
    defaultConfig.visibleMetrics.every(metric => config.visibleMetrics.includes(metric));
  
  // Check if includeOpponent differs
  const opponentMatch = config.includeOpponent === defaultConfig.includeOpponent;
  
  // Check if isExpanded differs (default is false)
  const expandedMatch = (config.isExpanded ?? false) === (defaultConfig.isExpanded ?? false);
  
  return !metricsMatch || !opponentMatch || !expandedMatch;
}
