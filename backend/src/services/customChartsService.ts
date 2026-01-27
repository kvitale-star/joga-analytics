import { db } from '../db/database.js';
import type { CustomChartRow, NewCustomChart, CustomChartUpdate } from '../db/schema.js';

export type ChartType = 'line' | 'bar' | 'area' | 'scatter';

export interface CustomChartConfig {
  xAxis: {
    key: string; // Column key for x-axis (e.g., 'Date', 'Match')
    label?: string;
  };
  series: Array<{
    key: string; // Column key for y-axis
    label: string;
    aggregation?: 'none' | 'avg' | 'sum'; // How to aggregate if grouping
  }>;
  filters?: {
    teams?: string[]; // Team slugs or names
    opponents?: string[];
    seasons?: number[];
    dateRange?: {
      start?: string; // ISO date string
      end?: string;
    };
  };
  groupBy?: 'match' | 'date' | 'team'; // How to group data
}

export interface CustomChart {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  chartType: ChartType;
  config: CustomChartConfig;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all custom charts for a user
 */
export async function getUserCustomCharts(userId: number): Promise<CustomChart[]> {
  const charts = await db
    .selectFrom('custom_charts')
    .selectAll()
    .where('user_id', '=', userId)
    .orderBy('updated_at', 'desc')
    .execute();

  return charts.map(parseChartRow);
}

/**
 * Get all custom charts in the system (admin only)
 */
export async function getAllCustomCharts(): Promise<CustomChart[]> {
  const charts = await db
    .selectFrom('custom_charts')
    .selectAll()
    .orderBy('updated_at', 'desc')
    .execute();

  return charts.map(parseChartRow);
}

/**
 * Get a specific custom chart by ID (with ownership check)
 */
export async function getCustomChartById(
  chartId: number,
  userId: number
): Promise<CustomChart | null> {
  const chart = await db
    .selectFrom('custom_charts')
    .selectAll()
    .where('id', '=', chartId)
    .where('user_id', '=', userId)
    .executeTakeFirst();

  return chart ? parseChartRow(chart) : null;
}

/**
 * Create a new custom chart
 */
export async function createCustomChart(
  userId: number,
  data: {
    name: string;
    description?: string;
    chartType: ChartType;
    config: CustomChartConfig;
  }
): Promise<CustomChart> {
  // Validate config
  validateChartConfig(data.config);

  const now = new Date().toISOString();
  const newChart: NewCustomChart = {
    user_id: userId,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    chart_type: data.chartType,
    config_json: JSON.stringify(data.config),
    is_public: 0,
    created_at: now,
    updated_at: now,
  };

  const chart = await db
    .insertInto('custom_charts')
    .values(newChart)
    .returningAll()
    .executeTakeFirstOrThrow();

  return parseChartRow(chart);
}

/**
 * Update an existing custom chart
 */
export async function updateCustomChart(
  chartId: number,
  userId: number,
  data: Partial<{
    name: string;
    description: string;
    chartType: ChartType;
    config: CustomChartConfig;
  }>
): Promise<CustomChart> {
  // Check ownership
  const existing = await getCustomChartById(chartId, userId);
  if (!existing) {
    throw new Error('Chart not found or access denied');
  }

  // Validate config if provided
  if (data.config) {
    validateChartConfig(data.config);
  }

  const update: CustomChartUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (data.name !== undefined) {
    update.name = data.name.trim();
  }
  if (data.description !== undefined) {
    update.description = data.description?.trim() || null;
  }
  if (data.chartType !== undefined) {
    update.chart_type = data.chartType;
  }
  if (data.config !== undefined) {
    update.config_json = JSON.stringify(data.config);
  }

  const chart = await db
    .updateTable('custom_charts')
    .set(update)
    .where('id', '=', chartId)
    .where('user_id', '=', userId)
    .returningAll()
    .executeTakeFirstOrThrow();

  return parseChartRow(chart);
}

/**
 * Delete a custom chart
 */
export async function deleteCustomChart(chartId: number, userId: number): Promise<void> {
  const result = await db
    .deleteFrom('custom_charts')
    .where('id', '=', chartId)
    .where('user_id', '=', userId)
    .execute();

  if (result.length === 0) {
    throw new Error('Chart not found or access denied');
  }
}

/**
 * Render chart data based on config and filters
 * This will be called by the render endpoint with match data
 */
export function prepareChartData(
  matchData: Array<Record<string, any>>,
  config: CustomChartConfig
): {
  xKey: string;
  xLabel: string;
  series: Array<{
    key: string;
    label: string;
    data: Array<{ x: any; y: number | null }>;
  }>;
} {
  // Apply filters
  let filtered = [...matchData];

  if (config.filters) {
    if (config.filters.teams && config.filters.teams.length > 0) {
      filtered = filtered.filter((row) => {
        const teamValue = row.team || row.Team || row.teamName || '';
        return config.filters!.teams!.some((filterTeam) =>
          teamValue.toString().toLowerCase().includes(filterTeam.toLowerCase())
        );
      });
    }

    if (config.filters.opponents && config.filters.opponents.length > 0) {
      filtered = filtered.filter((row) => {
        const oppValue = row.opponent || row.Opponent || row.opponentName || '';
        return config.filters!.opponents!.some((filterOpp) =>
          oppValue.toString().toLowerCase().includes(filterOpp.toLowerCase())
        );
      });
    }

    if (config.filters.seasons && config.filters.seasons.length > 0) {
      const seasonKey = Object.keys(filtered[0] || {}).find(
        (k) => k.toLowerCase() === 'season'
      );
      if (seasonKey) {
        filtered = filtered.filter((row) => {
          const season = typeof row[seasonKey] === 'number'
            ? row[seasonKey]
            : parseInt(row[seasonKey] || '0', 10);
          return config.filters!.seasons!.includes(season);
        });
      }
    }

    if (config.filters.dateRange) {
      const dateKey = config.xAxis.key || 'Date' || 'date' || 'Match';
      filtered = filtered.filter((row) => {
        const dateStr = row[dateKey];
        if (!dateStr) return false;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return false;

        if (config.filters!.dateRange!.start) {
          const start = new Date(config.filters!.dateRange!.start);
          if (date < start) return false;
        }
        if (config.filters!.dateRange!.end) {
          const end = new Date(config.filters!.dateRange!.end);
          if (date > end) return false;
        }
        return true;
      });
    }
  }

  // Group data if needed
  let grouped: Map<string, Array<Record<string, any>>>;
  if (config.groupBy === 'date') {
    grouped = new Map();
    filtered.forEach((row) => {
      const dateKey = config.xAxis.key || 'Date';
      const date = row[dateKey];
      const key = date ? new Date(date).toISOString().split('T')[0] : 'unknown';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(row);
    });
  } else {
    // No grouping - each row is a data point
    grouped = new Map();
    filtered.forEach((row, index) => {
      grouped.set(`point_${index}`, [row]);
    });
  }

  // Build series data
  const xKey = config.xAxis.key;
  const xLabel = config.xAxis.label || xKey;

  const series = config.series.map((seriesConfig) => {
    const data: Array<{ x: any; y: number | null }> = [];

    grouped.forEach((rows, groupKey) => {
      let xValue: any;
      if (config.groupBy === 'date') {
        xValue = groupKey; // Use the date string
      } else {
        xValue = rows[0]?.[xKey] || groupKey;
      }

      let yValue: number | null = null;

      if (rows.length === 1) {
        // Single row - no aggregation needed
        const rawValue = rows[0]?.[seriesConfig.key];
        yValue = typeof rawValue === 'number' ? rawValue : parseFloat(rawValue) || null;
      } else {
        // Multiple rows - apply aggregation
        const values = rows
          .map((row) => {
            const raw = row[seriesConfig.key];
            return typeof raw === 'number' ? raw : parseFloat(raw) || null;
          })
          .filter((v): v is number => v !== null);

        if (values.length > 0) {
          const agg = seriesConfig.aggregation || 'avg';
          if (agg === 'avg') {
            yValue = values.reduce((a, b) => a + b, 0) / values.length;
          } else if (agg === 'sum') {
            yValue = values.reduce((a, b) => a + b, 0);
          } else {
            yValue = values[0]; // 'none' - just take first
          }
        }
      }

      data.push({ x: xValue, y: yValue });
    });

    return {
      key: seriesConfig.key,
      label: seriesConfig.label,
      data: data.sort((a, b) => {
        // Sort by x value (date or number)
        if (typeof a.x === 'string' && typeof b.x === 'string') {
          return a.x.localeCompare(b.x);
        }
        if (typeof a.x === 'number' && typeof b.x === 'number') {
          return a.x - b.x;
        }
        return 0;
      }),
    };
  });

  return { xKey, xLabel, series };
}

/**
 * Parse database row to CustomChart
 */
function parseChartRow(row: CustomChartRow): CustomChart {
  let config: CustomChartConfig;
  try {
    config = JSON.parse(row.config_json);
  } catch {
    throw new Error('Invalid chart config JSON');
  }

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    chartType: row.chart_type,
    config,
    isPublic: row.is_public === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Validate chart config structure
 */
function validateChartConfig(config: CustomChartConfig): void {
  if (!config.xAxis || !config.xAxis.key) {
    throw new Error('xAxis.key is required');
  }
  if (!config.series || config.series.length === 0) {
    throw new Error('At least one series is required');
  }
  if (config.series.length > 10) {
    throw new Error('Maximum 10 series allowed');
  }
  for (const series of config.series) {
    if (!series.key || !series.label) {
      throw new Error('Each series must have key and label');
    }
    if (series.aggregation && !['none', 'avg', 'sum'].includes(series.aggregation)) {
      throw new Error('Invalid aggregation type');
    }
  }
  if (config.groupBy && !['match', 'date', 'team'].includes(config.groupBy)) {
    throw new Error('Invalid groupBy value');
  }
}
