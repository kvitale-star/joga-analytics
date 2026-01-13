import React from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getDefaultChartColors } from '../utils/colors';

export interface ChartData {
  type?: 'bar' | 'line' | 'area' | 'combo';
  chartType?: 'bar' | 'line' | 'area' | 'combo'; // Alternative name from Gemini
  title: string;
  data: Array<Record<string, any>>;
  xKey: string;
  yKeys: string[];
  colors?: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
}

interface ChartRendererProps {
  chartData: ChartData;
}

export const ChartRenderer: React.FC<ChartRendererProps> = ({ chartData }) => {
  // Support both 'type' and 'chartType' for compatibility
  const chartType = chartData.type || chartData.chartType || 'bar';
  const { title, data, xKey, yKeys, colors = getDefaultChartColors(), xAxisLabel, yAxisLabel } = chartData;

  // Calculate Y-axis domain with padding to ensure bars are tall enough
  const calculateYAxisDomain = () => {
    if (!data || data.length === 0) return [0, 'auto'];
    
    const allValues: number[] = [];
    yKeys.forEach(key => {
      data.forEach(item => {
        const value = item[key];
        if (typeof value === 'number' && !isNaN(value)) {
          allValues.push(value);
        }
      });
    });
    
    if (allValues.length === 0) return [0, 'auto'];
    
    const maxValue = Math.max(...allValues);
    const minValue = Math.min(...allValues);
    
    // Add 20% padding to the top, ensure minimum range
    const range = maxValue - minValue;
    const padding = Math.max(range * 0.2, maxValue * 0.1, 1);
    const domainMax = maxValue + padding;
    const domainMin = Math.max(0, minValue - (minValue > 0 ? padding : 0));
    
    return [domainMin, domainMax];
  };

  const yAxisDomain = calculateYAxisDomain();

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 60, right: 30, left: 20, bottom: 80 }, // Increased bottom margin, removed left margin for Y-axis label
    };

    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <Legend 
              verticalAlign="top" 
              align="center" 
              wrapperStyle={{ paddingBottom: '5px', color: '#1f2937' }}
              formatter={(value: string) => value.trim()}
            />
            <XAxis dataKey={xKey} angle={-45} textAnchor="end" height={100} label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10 } : undefined} />
            <YAxis width={80} domain={yAxisDomain} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#111827',
                color: '#ffffff',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '12px'
              }}
            />
            {yKeys.map((key, idx) => (
              <Bar key={key} dataKey={key} fill={colors[idx % colors.length]} name={key} />
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <Legend 
              verticalAlign="top" 
              align="center" 
              wrapperStyle={{ paddingBottom: '5px', color: '#1f2937' }}
              formatter={(value: string) => value.trim()}
            />
            <XAxis dataKey={xKey} angle={-45} textAnchor="end" height={100} label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10 } : undefined} />
            <YAxis width={80} domain={yAxisDomain} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#111827',
                color: '#ffffff',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '12px'
              }}
            />
            {yKeys.map((key, idx) => (
              <Line key={key} type="monotone" dataKey={key} stroke={colors[idx % colors.length]} strokeWidth={2} name={key} />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <Legend 
              verticalAlign="top" 
              align="center" 
              wrapperStyle={{ paddingBottom: '5px', color: '#1f2937' }}
              formatter={(value: string) => value.trim()}
            />
            <XAxis dataKey={xKey} angle={-45} textAnchor="end" height={100} label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10 } : undefined} />
            <YAxis width={80} domain={yAxisDomain} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#111827',
                color: '#ffffff',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '12px'
              }}
            />
            {yKeys.map((key, idx) => (
              <Area key={key} type="monotone" dataKey={key} stroke={colors[idx % colors.length]} fill={colors[idx % colors.length]} fillOpacity={0.6} name={key} />
            ))}
          </AreaChart>
        );

      case 'combo':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <Legend 
              verticalAlign="top" 
              align="center" 
              wrapperStyle={{ paddingBottom: '5px', color: '#1f2937' }}
              formatter={(value: string) => value.trim()}
            />
            <XAxis dataKey={xKey} angle={-45} textAnchor="end" height={100} label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10 } : undefined} />
            <YAxis width={80} domain={yAxisDomain} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#111827',
                color: '#ffffff',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '12px'
              }}
            />
            {yKeys.map((key, idx) => (
              <Bar key={key} dataKey={key} fill={colors[idx % colors.length]} name={key} />
            ))}
          </BarChart>
        );

      default:
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <Legend 
              verticalAlign="top" 
              align="center" 
              wrapperStyle={{ paddingBottom: '5px', color: '#1f2937' }}
              formatter={(value: string) => value.trim()}
            />
            <XAxis dataKey={xKey} angle={-45} textAnchor="end" height={100} label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10 } : undefined} />
            <YAxis width={80} domain={yAxisDomain} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#111827',
                color: '#ffffff',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '12px'
              }}
            />
            {yKeys.map((key, idx) => (
              <Bar key={key} dataKey={key} fill={colors[idx % colors.length]} name={key} />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 my-4 border border-gray-200">
      <h4 className="text-lg font-semibold mb-3 text-gray-800">{title}</h4>
      <ResponsiveContainer width="100%" height={500}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

