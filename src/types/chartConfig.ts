/**
 * Chart Configuration Types
 * Used for Phase 0.5: Chart Configuration
 */

export interface ChartConfig {
  visibleMetrics: string[];
  includeOpponent: boolean;
}

export interface ChartPreferences {
  [chartType: string]: ChartConfig;
}

export const DEFAULT_SHOTS_CONFIG: ChartConfig = {
  visibleMetrics: ['shotsFor'],
  includeOpponent: true,
};

export const DEFAULT_POSSESSION_CONFIG: ChartConfig = {
  visibleMetrics: ['possession', 'passShare'],
  includeOpponent: true,
};

/**
 * Generate chart title based on visible metrics
 */
export function getChartTitle(chartType: 'shots' | 'possession', visibleMetrics: string[]): string {
  if (chartType === 'shots') {
    const metricLabels: Record<string, string> = {
      shotsFor: 'Shots',
      attemptsFor: 'Attempts',
      goalsFor: 'Goals',
    };
    
    const labels = visibleMetrics
      .filter(m => metricLabels[m])
      .map(m => metricLabels[m]);
    
    return labels.length > 0 ? labels.join(' & ') : 'Shots';
  } else {
    // Possession chart
    const metricLabels: Record<string, string> = {
      possession: 'Possession',
      passShare: 'Pass Share',
      timeInPossession: 'Time in Possession',
    };
    
    const labels = visibleMetrics
      .filter(m => metricLabels[m])
      .map(m => metricLabels[m]);
    
    return labels.length > 0 ? labels.join(' & ') : 'Possession';
  }
}

/**
 * Check if a chart configuration has been customized from defaults
 */
export function isChartCustomized(
  chartType: 'shots' | 'possession',
  config: ChartConfig
): boolean {
  const defaultConfig = chartType === 'shots' ? DEFAULT_SHOTS_CONFIG : DEFAULT_POSSESSION_CONFIG;
  
  // Check if visibleMetrics differ
  const metricsMatch = 
    config.visibleMetrics.length === defaultConfig.visibleMetrics.length &&
    config.visibleMetrics.every(metric => defaultConfig.visibleMetrics.includes(metric)) &&
    defaultConfig.visibleMetrics.every(metric => config.visibleMetrics.includes(metric));
  
  // Check if includeOpponent differs
  const opponentMatch = config.includeOpponent === defaultConfig.includeOpponent;
  
  return !metricsMatch || !opponentMatch;
}
