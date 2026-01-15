import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS, OPPONENT_COLORS } from '../utils/colors';
import { DEFAULT_TSR_CONFIG, getChartTitle } from '../types/chartConfig';
import { ChartConfigPanel } from './ChartConfigPanel';
import { ChartExpandButton } from './ChartExpandButton';
import { useChartConfig } from '../hooks/useChartConfig';

interface TSRChartProps {
  data: MatchData[];
  tsrKey?: string;
  oppTSRKey?: string;
  opponentKey: string;
  showLabels?: boolean;
  // Optional metrics (if available in data)
  shotsForKey?: string;
  shotsAgainstKey?: string;
  globalIncludeOpponents?: boolean; // Global override for includeOpponent
  onExpansionChange?: (isExpanded: boolean) => void; // Callback when expansion state changes
}

export const TSRChart: React.FC<TSRChartProps> = ({
  data,
  tsrKey,
  oppTSRKey,
  opponentKey,
  showLabels = false,
  shotsForKey,
  shotsAgainstKey,
  globalIncludeOpponents,
  onExpansionChange,
}) => {
  const { config, isLoading, handleConfigChange, handleSave, handleReset, handleExpandToggle, isExpanded } = useChartConfig({
    chartType: 'tsr',
    defaultConfig: DEFAULT_TSR_CONFIG,
    globalIncludeOpponents,
    onExpansionChange: onExpansionChange,
  });

  // Build chart data based on configuration
  const chartData = data.map((match) => {
    const base: any = {
      name: match[opponentKey] || 'Opponent',
    };

    // Add JOGA team metrics
    if (config.visibleMetrics.includes('tsr') && tsrKey) {
      const val = match[tsrKey];
      base['TSR'] = typeof val === 'number' ? val : null;
    }
    if (config.visibleMetrics.includes('shotsFor') && shotsForKey) {
      base['Shots For'] = typeof match[shotsForKey] === 'number' ? match[shotsForKey] : 0;
    }
    if (config.visibleMetrics.includes('shotsAgainst') && shotsAgainstKey) {
      base['Shots Against'] = typeof match[shotsAgainstKey] === 'number' ? match[shotsAgainstKey] : 0;
    }

    // Add opponent metrics when includeOpponent is true
    if (config.includeOpponent) {
      if (config.visibleMetrics.includes('tsr') && oppTSRKey) {
        const valOpp = match[oppTSRKey];
        base['Opp TSR'] = typeof valOpp === 'number' ? valOpp : null;
      }
      if (config.visibleMetrics.includes('shotsFor') && shotsAgainstKey) {
        base['Opp Shots'] = typeof match[shotsAgainstKey] === 'number' ? match[shotsAgainstKey] : 0;
      }
    }

    return base;
  });

  // Determine which bars to render based on config
  const renderBars = () => {
    const bars: JSX.Element[] = [];

    if (config.visibleMetrics.includes('tsr') && tsrKey) {
      bars.push(
        <Bar key="TSR" dataKey="TSR" name="Total Shots Ratio" fill={JOGA_COLORS.voltYellow} animationDuration={500}>
          {showLabels && <LabelList dataKey="TSR" position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
        </Bar>
      );
    }
    if (config.includeOpponent && config.visibleMetrics.includes('tsr') && oppTSRKey) {
      bars.push(
        <Bar key="Opp TSR" dataKey="Opp TSR" name="Opp Total Shots Ratio" fill={OPPONENT_COLORS.primary} animationDuration={500}>
          {showLabels && <LabelList dataKey="Opp TSR" position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
        </Bar>
      );
    }
    if (config.visibleMetrics.includes('shotsFor') && shotsForKey) {
      bars.push(
        <Bar key="Shots For" dataKey="Shots For" fill={JOGA_COLORS.valorBlue} animationDuration={500}>
          {showLabels && <LabelList dataKey="Shots For" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }
    if (config.includeOpponent && config.visibleMetrics.includes('shotsFor') && shotsAgainstKey) {
      bars.push(
        <Bar key="Opp Shots" dataKey="Opp Shots" fill={OPPONENT_COLORS.secondary} animationDuration={500}>
          {showLabels && <LabelList dataKey="Opp Shots" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }
    if (config.visibleMetrics.includes('shotsAgainst') && shotsAgainstKey) {
      bars.push(
        <Bar key="Shots Against" dataKey="Shots Against" fill={JOGA_COLORS.pinkFoam} animationDuration={500}>
          {showLabels && <LabelList dataKey="Shots Against" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }

    return bars;
  };

  // Available metrics
  const availableMetrics = [
    ...(tsrKey ? [{ id: 'tsr', label: 'Total Shots Ratio %', required: false }] : []),
    ...(shotsForKey ? [{ id: 'shotsFor', label: 'Shots For', required: false }] : []),
    ...(shotsAgainstKey ? [{ id: 'shotsAgainst', label: 'Shots Against', required: false }] : []),
  ];

  // Generate dynamic title
  const chartTitle = getChartTitle('tsr', config.visibleMetrics);

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
            chartType="tsr"
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

