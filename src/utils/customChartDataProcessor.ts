import type { CustomChartConfig, ChartRenderData } from '../types/customCharts';

/**
 * Process match data for custom charts (frontend version)
 * This processes already-filtered data (respects Last N Games, team, opponent, etc.)
 */
export function prepareChartData(
  matchData: Array<Record<string, any>>,
  config: CustomChartConfig
): ChartRenderData {
  // Apply filters (these are chart-specific filters, not dashboard filters)
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
            : parseInt(String(row[seasonKey] || '0'), 10);
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
        xValue = groupKey;
      } else {
        xValue = rows[0]?.[xKey] || groupKey;
      }

      let yValue: number | null = null;

      if (rows.length === 1) {
        const rawValue = rows[0]?.[seriesConfig.key];
        yValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue)) || null;
      } else {
        const values = rows
          .map((row) => {
            const raw = row[seriesConfig.key];
            return typeof raw === 'number' ? raw : parseFloat(String(raw)) || null;
          })
          .filter((v): v is number => v !== null);

        if (values.length > 0) {
          const agg = seriesConfig.aggregation || 'avg';
          if (agg === 'avg') {
            yValue = values.reduce((a, b) => a + b, 0) / values.length;
          } else if (agg === 'sum') {
            yValue = values.reduce((a, b) => a + b, 0);
          } else {
            yValue = values[0];
          }
        }
      }

      data.push({ x: xValue, y: yValue });
    });

    return {
      key: seriesConfig.key,
      label: seriesConfig.label,
      data: data.sort((a, b) => {
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

  return {
    xKey,
    xLabel,
    series,
  };
}
