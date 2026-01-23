import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS, OPPONENT_COLORS } from '../utils/colors';
import { DEFAULT_POSITIONAL_ATTEMPTS_CONFIG, getChartTitle } from '../types/chartConfig';
import { ChartConfigPanel } from './ChartConfigPanel';
import { ChartExpandButton } from './ChartExpandButton';
import { useChartConfig } from '../hooks/useChartConfig';

interface PositionalAttemptsChartProps {
  data: MatchData[];
  insideBoxAttemptsPctKey: string;
  outsideBoxAttemptsPctKey: string;
  oppInsideBoxAttemptsPctKey: string;
  oppOutsideBoxAttemptsPctKey: string;
  opponentKey: string;
  showLabels?: boolean;
  globalIncludeOpponents?: boolean; // Global override for includeOpponent
  onExpansionChange?: (isExpanded: boolean) => void; // Callback when expansion state changes
}

export const PositionalAttemptsChart: React.FC<PositionalAttemptsChartProps> = ({
  data,
  insideBoxAttemptsPctKey,
  outsideBoxAttemptsPctKey,
  oppInsideBoxAttemptsPctKey,
  oppOutsideBoxAttemptsPctKey,
  opponentKey,
  showLabels = false,
  globalIncludeOpponents,
  onExpansionChange,
}) => {
  const { config, isLoading, handleConfigChange, handleSave, handleReset, handleExpandToggle, isExpanded } = useChartConfig({
    chartType: 'positionalAttempts',
    defaultConfig: DEFAULT_POSITIONAL_ATTEMPTS_CONFIG,
    globalIncludeOpponents,
    onExpansionChange,
  });

  // Build chart data based on configuration
  const chartData = data.map((match) => {
    const base: any = {
      name: match[opponentKey] || 'Opponent',
    };

    // Add JOGA team metrics
    if (config.visibleMetrics.includes('insideBoxAttempts')) {
      base['Team Inside Box'] = typeof match[insideBoxAttemptsPctKey] === 'number' ? match[insideBoxAttemptsPctKey] : null;
    }
    if (config.visibleMetrics.includes('outsideBoxAttempts')) {
      base['Team Outside Box'] = typeof match[outsideBoxAttemptsPctKey] === 'number' ? match[outsideBoxAttemptsPctKey] : null;
    }

    // Add opponent metrics when includeOpponent is true
    if (config.includeOpponent) {
      if (config.visibleMetrics.includes('insideBoxAttempts')) {
        base['Opp Inside Box'] = typeof match[oppInsideBoxAttemptsPctKey] === 'number' ? match[oppInsideBoxAttemptsPctKey] : null;
      }
      if (config.visibleMetrics.includes('outsideBoxAttempts')) {
        base['Opp Outside Box'] = typeof match[oppOutsideBoxAttemptsPctKey] === 'number' ? match[oppOutsideBoxAttemptsPctKey] : null;
      }
    }

    return base;
  });

  // Determine which bars to render based on config
  const renderBars = () => {
    const bars: JSX.Element[] = [];

    if (config.visibleMetrics.includes('insideBoxAttempts')) {
      bars.push(
        <Bar key="Team Inside Box" dataKey="Team Inside Box" fill={JOGA_COLORS.voltYellow} animationDuration={500}>
          {showLabels && <LabelList dataKey="Team Inside Box" position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
        </Bar>
      );
    }
    if (config.visibleMetrics.includes('outsideBoxAttempts')) {
      bars.push(
        <Bar key="Team Outside Box" dataKey="Team Outside Box" fill={JOGA_COLORS.valorBlue} animationDuration={500}>
          {showLabels && <LabelList dataKey="Team Outside Box" position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
        </Bar>
      );
    }

    // Opponent bars (only when includeOpponent is true)
    if (config.includeOpponent) {
      if (config.visibleMetrics.includes('insideBoxAttempts')) {
        bars.push(
          <Bar key="Opp Inside Box" dataKey="Opp Inside Box" fill={OPPONENT_COLORS.primary} animationDuration={500}>
            {showLabels && <LabelList dataKey="Opp Inside Box" position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
          </Bar>
        );
      }
      if (config.visibleMetrics.includes('outsideBoxAttempts')) {
        bars.push(
          <Bar key="Opp Outside Box" dataKey="Opp Outside Box" fill={OPPONENT_COLORS.secondary} animationDuration={500}>
            {showLabels && <LabelList dataKey="Opp Outside Box" position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
          </Bar>
        );
      }
    }

    return bars;
  };

  // Available metrics
  const availableMetrics = [
    { id: 'insideBoxAttempts', label: 'Inside Box %', required: false },
    { id: 'outsideBoxAttempts', label: 'Outside Box %', required: false },
  ];

  // Generate dynamic title
  const chartTitle = getChartTitle('positionalAttempts', config.visibleMetrics);

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
            chartType="positionalAttempts"
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
          <YAxis domain={[0, 100]} label={{ value: 'Percent', angle: -90, position: 'insideLeft' }} />
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

