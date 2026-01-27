import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import type { ChartType, ChartRenderData } from '../types/customCharts';
import { JOGA_COLORS } from '../utils/colors';

interface DynamicChartRendererProps {
  chartType: ChartType;
  data: ChartRenderData;
  height?: number;
  showLabels?: boolean;
}

const CHART_COLORS = [
  JOGA_COLORS.voltYellow,
  JOGA_COLORS.pinkFoam,
  JOGA_COLORS.valorBlue,
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#14B8A6', // teal
];

export const DynamicChartRenderer: React.FC<DynamicChartRendererProps> = ({
  chartType,
  data,
  height = 400,
  showLabels = false,
}) => {
  // Transform series data into Recharts format
  const chartData = React.useMemo(() => {
    if (data.series.length === 0) return [];

    // Get all unique x values from all series
    const xValues = new Set<string | number>();
    data.series.forEach((series) => {
      series.data.forEach((point) => {
        xValues.add(point.x);
      });
    });

    // Build data points for each x value
    const result: Array<Record<string, any>> = [];
    xValues.forEach((x) => {
      const point: Record<string, any> = {
        [data.xKey]: x,
      };
      data.series.forEach((series) => {
        const seriesPoint = series.data.find((p) => p.x === x);
        point[series.label] = seriesPoint?.y ?? null;
      });
      result.push(point);
    });

    // Sort by x value
    return result.sort((a, b) => {
      const aVal = a[data.xKey];
      const bVal = b[data.xKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return aVal - bVal;
      }
      return 0;
    });
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No data available for this chart</p>
      </div>
    );
  }

  const commonProps = {
    data: chartData,
    margin: { top: 5, right: 30, left: 20, bottom: 5 },
  };

  switch (chartType) {
    case 'line':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={data.xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {data.series.map((series, index) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.label}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls
              >
                {showLabels && (
                  <LabelList
                    dataKey={series.label}
                    position="top"
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                    fontSize={12}
                    formatter={(value: number) => (value !== null && value !== undefined ? value.toFixed(1) : '')}
                  />
                )}
              </Line>
            ))}
          </LineChart>
        </ResponsiveContainer>
      );

    case 'bar':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={data.xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {data.series.map((series, index) => (
              <Bar
                key={series.key}
                dataKey={series.label}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              >
                {showLabels && (
                  <LabelList
                    dataKey={series.label}
                    position="top"
                    fill="#666"
                    fontSize={12}
                    formatter={(value: number) => (value !== null && value !== undefined ? value.toFixed(1) : '')}
                  />
                )}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      );

    case 'area':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={data.xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {data.series.map((series, index) => (
              <Area
                key={series.key}
                type="monotone"
                dataKey={series.label}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                fillOpacity={0.6}
                connectNulls
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );

    case 'scatter':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={data.xKey} name={data.xLabel} />
            <YAxis />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            {data.series.map((series, index) => (
              <Scatter
                key={series.key}
                name={series.label}
                data={series.data.map((p) => ({ [data.xKey]: p.x, [series.label]: p.y }))}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      );

    default:
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Unknown chart type: {chartType}</p>
        </div>
      );
  }
};
