/**
 * Chart Preferences Service
 * Handles saving and loading chart configurations
 */

import { ChartConfig, ChartPreferences, DEFAULT_SHOTS_CONFIG, DEFAULT_POSSESSION_CONFIG, DEFAULT_GOALS_CONFIG, DEFAULT_XG_CONFIG, DEFAULT_CONVERSION_RATE_CONFIG, DEFAULT_TSR_CONFIG, DEFAULT_POSITIONAL_ATTEMPTS_CONFIG, DEFAULT_PASSES_CONFIG, DEFAULT_PASS_STR_LENGTH_CONFIG, DEFAULT_SPI_CONFIG, DEFAULT_PPM_CONFIG } from '../types/chartConfig';
import { updateUserPreferences } from './authService';
import { getUserById } from './authService';

const CHART_DEFAULTS: Record<string, ChartConfig> = {
  shots: DEFAULT_SHOTS_CONFIG,
  possession: DEFAULT_POSSESSION_CONFIG,
  goals: DEFAULT_GOALS_CONFIG,
  xg: DEFAULT_XG_CONFIG,
  conversionRate: DEFAULT_CONVERSION_RATE_CONFIG,
  tsr: DEFAULT_TSR_CONFIG,
  positionalAttempts: DEFAULT_POSITIONAL_ATTEMPTS_CONFIG,
  passes: DEFAULT_PASSES_CONFIG,
  passStrLength: DEFAULT_PASS_STR_LENGTH_CONFIG,
  spi: DEFAULT_SPI_CONFIG,
  ppm: DEFAULT_PPM_CONFIG,
};

/**
 * Get chart preferences for the current user
 */
export async function getChartPreferences(userId: number): Promise<ChartPreferences> {
  try {
    const user = await getUserById(userId);
    if (!user) {
      return {};
    }

    return user.preferences?.chartPreferences || {};
  } catch (error) {
    console.error('Error loading chart preferences:', error);
    return {};
  }
}

/**
 * Get configuration for a specific chart type
 */
export async function getChartConfig(
  userId: number,
  chartType: string
): Promise<ChartConfig> {
  const preferences = await getChartPreferences(userId);
  return preferences[chartType] || CHART_DEFAULTS[chartType] || {
    visibleMetrics: [],
    includeOpponent: true,
  };
}

/**
 * Save chart configuration for a specific chart type
 */
export async function saveChartConfig(
  userId: number,
  chartType: string,
  config: ChartConfig
): Promise<void> {
  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const currentPreferences = user.preferences || {};
    const chartPreferences = currentPreferences.chartPreferences || {};

    // Ensure isExpanded is always a boolean (not undefined)
    const normalizedConfig: ChartConfig = {
      ...config,
      isExpanded: config.isExpanded ?? false,
    };

    const updatedPreferences = {
      ...currentPreferences,
      chartPreferences: {
        ...chartPreferences,
        [chartType]: normalizedConfig,
      },
    };

    console.log('Saving chart config:', { chartType, config: normalizedConfig, updatedPreferences });
    await updateUserPreferences(userId, updatedPreferences);
    console.log('Chart config saved successfully');
  } catch (error) {
    console.error('Error saving chart preferences:', error);
    // Re-throw with more context
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to save chart preferences: Unknown error');
  }
}

/**
 * Reset chart configuration to defaults
 */
export async function resetChartConfig(
  userId: number,
  chartType: string
): Promise<void> {
  const defaultConfig = CHART_DEFAULTS[chartType];
  if (defaultConfig) {
    await saveChartConfig(userId, chartType, defaultConfig);
  }
}

/**
 * Reset all chart configurations to defaults
 */
export async function resetAllChartConfigs(
  userId: number
): Promise<void> {
  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const currentPreferences = user.preferences || {};
    
    // Clear all chart preferences
    const updatedPreferences = {
      ...currentPreferences,
      chartPreferences: {},
    };

    console.log('Resetting all chart configs:', { updatedPreferences });
    await updateUserPreferences(userId, updatedPreferences);
    console.log('All chart configs reset successfully');
  } catch (error) {
    console.error('Error resetting all chart preferences:', error);
    // Re-throw with more context
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to reset all chart preferences: Unknown error');
  }
}
