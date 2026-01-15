/**
 * Chart Preferences Service
 * Handles saving and loading chart configurations
 */

import { ChartConfig, ChartPreferences, DEFAULT_SHOTS_CONFIG, DEFAULT_POSSESSION_CONFIG } from '../types/chartConfig';
import { updateUserPreferences } from './authService';
import { getUserById } from './authService';

const CHART_DEFAULTS: Record<string, ChartConfig> = {
  shots: DEFAULT_SHOTS_CONFIG,
  possession: DEFAULT_POSSESSION_CONFIG,
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

    const updatedPreferences = {
      ...currentPreferences,
      chartPreferences: {
        ...chartPreferences,
        [chartType]: config,
      },
    };

    await updateUserPreferences(userId, updatedPreferences);
  } catch (error) {
    console.error('Error saving chart preferences:', error);
    throw error;
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
