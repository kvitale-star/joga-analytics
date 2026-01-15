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
  visibleMetrics: ['shotsFor'],
  includeOpponent: true,
  isExpanded: false,
};

export const DEFAULT_POSSESSION_CONFIG: ChartConfig = {
  visibleMetrics: ['possession', 'passShare'],
  includeOpponent: true,
  isExpanded: false,
};

export const DEFAULT_GOALS_CONFIG: ChartConfig = {
  visibleMetrics: ['goalsFor', 'goalsAgainst'],
  includeOpponent: true,
  isExpanded: false,
};

export const DEFAULT_XG_CONFIG: ChartConfig = {
  visibleMetrics: ['xG'],
  includeOpponent: true,
  isExpanded: false,
};

export const DEFAULT_CONVERSION_RATE_CONFIG: ChartConfig = {
  visibleMetrics: ['conversionRate'],
  includeOpponent: true,
  isExpanded: false,
};

export const DEFAULT_TSR_CONFIG: ChartConfig = {
  visibleMetrics: ['tsr'],
  includeOpponent: true,
  isExpanded: false,
};

export type ChartType = 'shots' | 'possession' | 'goals' | 'xg' | 'conversionRate' | 'tsr';

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
      goalsAgainst: 'Goals',
      xG: 'xG',
      xGA: 'xGA',
    },
    xg: {
      xG: 'xG',
      goalsFor: 'Goals',
      goalsAgainst: 'Goals',
    },
    conversionRate: {
      conversionRate: 'Conversion Rate',
      shotsFor: 'Shots',
      goalsFor: 'Goals',
    },
    tsr: {
      tsr: 'TSR',
      shotsFor: 'Shots',
      shotsAgainst: 'Shots',
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
      conversionRate: 'Conversion Rate',
      tsr: 'Total Shots Ratio',
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
