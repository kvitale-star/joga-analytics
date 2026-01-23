import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS, OPPONENT_COLORS } from '../utils/colors';
import { DEFAULT_MISC_STATS_CONFIG, getChartTitle } from '../types/chartConfig';
import { ChartConfigPanel } from './ChartConfigPanel';
import { ChartExpandButton } from './ChartExpandButton';
import { useChartConfig } from '../hooks/useChartConfig';

interface MiscStatsChartProps {
  data: MatchData[];
  cornersForKey: string;
  cornersAgainstKey: string;
  freeKickForKey: string;
  freeKickAgainstKey: string;
  opponentKey: string;
  showLabels?: boolean;
  globalIncludeOpponents?: boolean; // Global override for includeOpponent
  onExpansionChange?: (isExpanded: boolean) => void; // Callback when expansion state changes
}

export const MiscStatsChart: React.FC<MiscStatsChartProps> = ({
  data,
  cornersForKey,
  cornersAgainstKey,
  freeKickForKey,
  freeKickAgainstKey,
  opponentKey,
  showLabels = false,
  globalIncludeOpponents,
  onExpansionChange,
}) => {
  const { config, isLoading, handleConfigChange, handleSave, handleReset, handleExpandToggle, isExpanded } = useChartConfig({
    chartType: 'miscStats',
    defaultConfig: DEFAULT_MISC_STATS_CONFIG,
    globalIncludeOpponents,
    onExpansionChange,
  });

  // Build chart data based on configuration
  const chartData = data.map((match) => {
    const base: any = {
      name: match[opponentKey] || 'Opponent',
    };

    // Add JOGA team metrics
    if (config.visibleMetrics.includes('cornersFor')) {
      base['Corners For'] = typeof match[cornersForKey] === 'number' ? match[cornersForKey] : 0;
    }
    if (config.visibleMetrics.includes('freeKickFor')) {
      base['Free Kick For'] = typeof match[freeKickForKey] === 'number' ? match[freeKickForKey] : 0;
    }

    // Add opponent metrics when includeOpponent is true
    if (config.includeOpponent) {
      if (config.visibleMetrics.includes('cornersFor')) {
        base['Corners Against'] = typeof match[cornersAgainstKey] === 'number' ? match[cornersAgainstKey] : 0;
      }
      if (config.visibleMetrics.includes('freeKickFor')) {
        base['Free Kick Against'] = typeof match[freeKickAgainstKey] === 'number' ? match[freeKickAgainstKey] : 0;
      }
    }

    return base;
  });

  // Determine which bars to render based on config
  const renderBars = () => {
    const bars: JSX.Element[] = [];

    if (config.visibleMetrics.includes('cornersFor')) {
      bars.push(
        <Bar key="Corners For" dataKey="Corners For" fill={JOGA_COLORS.voltYellow} animationDuration={500}>
          {showLabels && <LabelList dataKey="Corners For" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }
    if (config.visibleMetrics.includes('freeKickFor')) {
      bars.push(
        <Bar key="Free Kick For" dataKey="Free Kick For" fill={JOGA_COLORS.valorBlue} animationDuration={500}>
          {showLabels && <LabelList dataKey="Free Kick For" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }

    // Opponent bars (only when includeOpponent is true)
    if (config.includeOpponent) {
      if (config.visibleMetrics.includes('cornersFor')) {
        bars.push(
          <Bar key="Corners Against" dataKey="Corners Against" fill={OPPONENT_COLORS.primary} animationDuration={500}>
            {showLabels && <LabelList dataKey="Corners Against" position="top" fill="#666" fontSize={12} />}
          </Bar>
        );
      }
      if (config.visibleMetrics.includes('freeKickFor')) {
        bars.push(
          <Bar key="Free Kick Against" dataKey="Free Kick Against" fill={OPPONENT_COLORS.secondary} animationDuration={500}>
            {showLabels && <LabelList dataKey="Free Kick Against" position="top" fill="#666" fontSize={12} />}
          </Bar>
        );
      }
    }

    return bars;
  };

  // Available metrics
  const availableMetrics = [
    { id: 'cornersFor', label: 'Corners', required: false },
    { id: 'freeKickFor', label: 'Free Kicks', required: false },
  ];

  // Generate dynamic title
  const chartTitle = getChartTitle('miscStats', config.visibleMetrics);

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
            chartType="miscStats"
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

