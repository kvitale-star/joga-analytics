import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS, OPPONENT_COLORS } from '../utils/colors';
import { DEFAULT_XG_CONFIG, getChartTitle } from '../types/chartConfig';
import { ChartConfigPanel } from './ChartConfigPanel';
import { ChartExpandButton } from './ChartExpandButton';
import { useChartConfig } from '../hooks/useChartConfig';

interface xGChartProps {
  data: MatchData[];
  xGKey: string;
  xGAKey: string;
  opponentKey: string;
  showLabels?: boolean;
  // Optional metrics (if available in data)
  goalsForKey?: string;
  goalsAgainstKey?: string;
  shotsForKey?: string;
  shotsAgainstKey?: string;
  globalIncludeOpponents?: boolean; // Global override for includeOpponent
  onExpansionChange?: (isExpanded: boolean) => void; // Callback when expansion state changes
}

export const XGChart: React.FC<xGChartProps> = ({
  data,
  xGKey,
  xGAKey,
  opponentKey,
  showLabels = false,
  goalsForKey,
  goalsAgainstKey,
  shotsForKey,
  shotsAgainstKey,
  globalIncludeOpponents,
  onExpansionChange,
}) => {
  const { config, isLoading, handleConfigChange, handleSave, handleReset, handleExpandToggle, isExpanded } = useChartConfig({
    chartType: 'xg',
    defaultConfig: DEFAULT_XG_CONFIG,
    globalIncludeOpponents,
    onExpansionChange: onExpansionChange,
  });

  // Build chart data based on configuration
  const chartData = data.map((match) => {
    const base: any = {
      name: match[opponentKey] || 'Opponent',
    };

    // Add JOGA team metrics
    if (config.visibleMetrics.includes('xG')) {
      base['xG'] = typeof match[xGKey] === 'number' ? match[xGKey] : 0;
      // Add opponent metric if includeOpponent is true
      if (config.includeOpponent && xGAKey) {
        base['xG (Opp)'] = typeof match[xGAKey] === 'number' ? match[xGAKey] : 0;
      }
    }
    if (config.visibleMetrics.includes('goalsFor') && goalsForKey) {
      base['Goals For'] = typeof match[goalsForKey] === 'number' ? match[goalsForKey] : 0;
      // Add opponent metric if includeOpponent is true
      if (config.includeOpponent && goalsAgainstKey) {
        base['Goals Against'] = typeof match[goalsAgainstKey] === 'number' ? match[goalsAgainstKey] : 0;
      }
    }
    if (config.visibleMetrics.includes('shotsFor') && shotsForKey) {
      base['Shots For'] = typeof match[shotsForKey] === 'number' ? match[shotsForKey] : 0;
      // Add opponent metric if includeOpponent is true
      if (config.includeOpponent && shotsAgainstKey) {
        base['Shots Against'] = typeof match[shotsAgainstKey] === 'number' ? match[shotsAgainstKey] : 0;
      }
    }

    return base;
  });

  // Determine which bars to render based on config
  const renderBars = () => {
    const bars: JSX.Element[] = [];

    if (config.visibleMetrics.includes('xG')) {
      bars.push(
        <Bar key="xG" dataKey="xG" fill={JOGA_COLORS.voltYellow} animationDuration={500}>
          {showLabels && <LabelList dataKey="xG" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }
    if (config.includeOpponent && config.visibleMetrics.includes('xG')) {
      bars.push(
        <Bar key="xG (Opp)" dataKey="xG (Opp)" fill={OPPONENT_COLORS.primary} animationDuration={500}>
          {showLabels && <LabelList dataKey="xG (Opp)" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }
    if (config.visibleMetrics.includes('goalsFor') && goalsForKey) {
      bars.push(
        <Bar key="Goals For" dataKey="Goals For" fill={JOGA_COLORS.valorBlue} animationDuration={500}>
          {showLabels && <LabelList dataKey="Goals For" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
      // Add opponent bar if includeOpponent is true
      if (config.includeOpponent && goalsAgainstKey) {
        bars.push(
          <Bar key="Goals Against" dataKey="Goals Against" fill={OPPONENT_COLORS.secondary} animationDuration={500}>
            {showLabels && <LabelList dataKey="Goals Against" position="top" fill="#666" fontSize={12} />}
          </Bar>
        );
      }
    }
    if (config.visibleMetrics.includes('shotsFor') && shotsForKey) {
      bars.push(
        <Bar key="Shots For" dataKey="Shots For" fill={JOGA_COLORS.pinkFoam} animationDuration={500}>
          {showLabels && <LabelList dataKey="Shots For" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
      // Add opponent bar if includeOpponent is true
      if (config.includeOpponent && shotsAgainstKey) {
        bars.push(
          <Bar key="Shots Against" dataKey="Shots Against" fill={OPPONENT_COLORS.dark} animationDuration={500}>
            {showLabels && <LabelList dataKey="Shots Against" position="top" fill="#666" fontSize={12} />}
          </Bar>
        );
      }
    }

    return bars;
  };

  // Available metrics - only "For" metrics, no "Against" or "Opp"
  const availableMetrics = [
    { id: 'xG', label: 'Expected Goals (xG)', required: false },
    ...(goalsForKey ? [{ id: 'goalsFor', label: 'Goals For', required: false }] : []),
    ...(shotsForKey ? [{ id: 'shotsFor', label: 'Shots For', required: false }] : []),
  ];

  // Generate dynamic title
  const chartTitle = getChartTitle('xg', config.visibleMetrics);

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
            chartType="xg"
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

