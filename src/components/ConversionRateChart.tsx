import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS, OPPONENT_COLORS } from '../utils/colors';
import { DEFAULT_CONVERSION_RATE_CONFIG } from '../types/chartConfig';
import { ChartConfigPanel } from './ChartConfigPanel';
import { ChartExpandButton } from './ChartExpandButton';
import { useChartConfig } from '../hooks/useChartConfig';

interface ConversionRateChartProps {
  data: MatchData[];
  conversionRateKey: string;
  oppConversionRateKey: string;
  opponentKey: string;
  showLabels?: boolean;
  // Optional metrics (if available in data)
  insideBoxConvRateKey?: string;
  outsideBoxConvRateKey?: string;
  attemptsForKey?: string;
  attemptsAgainstKey?: string;
  globalIncludeOpponents?: boolean; // Global override for includeOpponent
  onExpansionChange?: (isExpanded: boolean) => void; // Callback when expansion state changes
}

export const ConversionRateChart: React.FC<ConversionRateChartProps> = ({
  data,
  conversionRateKey,
  oppConversionRateKey,
  opponentKey,
  showLabels = false,
  insideBoxConvRateKey,
  outsideBoxConvRateKey,
  attemptsForKey,
  attemptsAgainstKey,
  globalIncludeOpponents,
  onExpansionChange,
}) => {
  const { config, isLoading, handleConfigChange, handleSave, handleReset, handleExpandToggle, isExpanded } = useChartConfig({
    chartType: 'conversionRate',
    defaultConfig: DEFAULT_CONVERSION_RATE_CONFIG,
    globalIncludeOpponents,
    onExpansionChange: onExpansionChange,
  });

  // Build chart data based on configuration
  const chartData = data.map((match) => {
    const base: any = {
      name: match[opponentKey] || 'Opponent',
    };

    // Add JOGA team metrics
    if (config.visibleMetrics.includes('conversionRate')) {
      base['Conversion Rate'] = typeof match[conversionRateKey] === 'number' ? match[conversionRateKey] : 0;
    }
    if (config.visibleMetrics.includes('insideBoxConvRate') && insideBoxConvRateKey) {
      base['Inside Box Conv Rate'] = typeof match[insideBoxConvRateKey] === 'number' ? match[insideBoxConvRateKey] : 0;
    }
    if (config.visibleMetrics.includes('outsideBoxConvRate') && outsideBoxConvRateKey) {
      base['Outside Box Conv Rate'] = typeof match[outsideBoxConvRateKey] === 'number' ? match[outsideBoxConvRateKey] : 0;
    }
    if (config.visibleMetrics.includes('attemptsFor') && attemptsForKey) {
      base['Attempts For'] = typeof match[attemptsForKey] === 'number' ? match[attemptsForKey] : 0;
    }

    // Add opponent metrics when includeOpponent is true
    if (config.includeOpponent) {
      if (config.visibleMetrics.includes('conversionRate')) {
        base['Opp Conversion Rate'] = typeof match[oppConversionRateKey] === 'number' ? match[oppConversionRateKey] : 0;
      }
      if (config.visibleMetrics.includes('attemptsFor') && attemptsAgainstKey) {
        base['Opp Attempts'] = typeof match[attemptsAgainstKey] === 'number' ? match[attemptsAgainstKey] : 0;
      }
    }

    return base;
  });

  // Determine which bars to render based on config
  const renderBars = () => {
    const bars: JSX.Element[] = [];

    if (config.visibleMetrics.includes('conversionRate')) {
      bars.push(
        <Bar key="Conversion Rate" dataKey="Conversion Rate" fill={JOGA_COLORS.voltYellow} animationDuration={500}>
          {showLabels && <LabelList dataKey="Conversion Rate" position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
        </Bar>
      );
    }
    if (config.includeOpponent && config.visibleMetrics.includes('conversionRate')) {
      bars.push(
        <Bar key="Opp Conversion Rate" dataKey="Opp Conversion Rate" fill={OPPONENT_COLORS.primary} animationDuration={500}>
          {showLabels && <LabelList dataKey="Opp Conversion Rate" position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
        </Bar>
      );
    }
    if (config.visibleMetrics.includes('insideBoxConvRate') && insideBoxConvRateKey) {
      bars.push(
        <Bar key="Inside Box Conv Rate" dataKey="Inside Box Conv Rate" fill={JOGA_COLORS.valorBlue} animationDuration={500}>
          {showLabels && <LabelList dataKey="Inside Box Conv Rate" position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
        </Bar>
      );
    }
    if (config.visibleMetrics.includes('outsideBoxConvRate') && outsideBoxConvRateKey) {
      bars.push(
        <Bar key="Outside Box Conv Rate" dataKey="Outside Box Conv Rate" fill={JOGA_COLORS.pinkFoam} animationDuration={500}>
          {showLabels && <LabelList dataKey="Outside Box Conv Rate" position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
        </Bar>
      );
    }
    if (config.visibleMetrics.includes('attemptsFor') && attemptsForKey) {
      bars.push(
        <Bar key="Attempts For" dataKey="Attempts For" fill={JOGA_COLORS.valorBlue} animationDuration={500}>
          {showLabels && <LabelList dataKey="Attempts For" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }
    if (config.includeOpponent && config.visibleMetrics.includes('attemptsFor') && attemptsAgainstKey) {
      bars.push(
        <Bar key="Opp Attempts" dataKey="Opp Attempts" fill={OPPONENT_COLORS.secondary} animationDuration={500}>
          {showLabels && <LabelList dataKey="Opp Attempts" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }

    return bars;
  };

  // Available metrics
  // Removed 'Shots For' and 'Goals For' as requested
  // Added 'Inside Box Conv Rate', 'Outside Box Conv Rate', and 'Attempts For'
  const availableMetrics = [
    { id: 'conversionRate', label: 'Conversion Rate %', required: false },
    ...(insideBoxConvRateKey ? [{ id: 'insideBoxConvRate', label: 'Inside Box Conv Rate %', required: false }] : []),
    ...(outsideBoxConvRateKey ? [{ id: 'outsideBoxConvRate', label: 'Outside Box Conv Rate %', required: false }] : []),
    ...(attemptsForKey ? [{ id: 'attemptsFor', label: 'Attempts For', required: false }] : []),
  ];

  // Fixed title - don't rename based on metrics
  const chartTitle = 'Conversion Rates';

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-2 text-gray-800">{chartTitle}</h3>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500">Loading chart configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 relative group">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-gray-800">{chartTitle}</h3>
        <div className="flex items-center gap-2">
          <ChartExpandButton isExpanded={isExpanded} onToggle={handleExpandToggle} />
          <ChartConfigPanel
            chartType="conversionRate"
            config={config}
            availableMetrics={availableMetrics}
            onConfigChange={handleConfigChange}
            onSave={handleSave}
            onReset={handleReset}
          />
        </div>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 30, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <Legend 
            verticalAlign="top" 
            align="center" 
            wrapperStyle={{ paddingBottom: '15px', color: '#1f2937' }}
            formatter={(value: string) => value.trim()}
          />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
          <YAxis />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#111827',
              color: '#ffffff',
              border: '1px solid #374151',
              borderRadius: '8px',
              padding: '12px'
            }}
          />
          {renderBars()}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

