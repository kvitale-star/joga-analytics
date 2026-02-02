import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS, OPPONENT_COLORS } from '../utils/colors';
import { DEFAULT_POSSESSION_CONFIG } from '../types/chartConfig';
import { ChartConfigPanel } from './ChartConfigPanel';
import { ChartExpandButton } from './ChartExpandButton';
import { useChartConfig } from '../hooks/useChartConfig';

interface PossessionChartProps {
  data: MatchData[];
  possessionKey: string;
  passShareKey: string;
  opponentKey: string;
  // Optional metrics (if available in data)
  timeInPossessionKey?: string;
  oppPossessionKey?: string;
  oppPassShareKey?: string;
  globalIncludeOpponents?: boolean; // Global override for includeOpponent
  onExpansionChange?: (isExpanded: boolean) => void; // Callback when expansion state changes
}

export const PossessionChart: React.FC<PossessionChartProps> = ({
  data,
  possessionKey,
  passShareKey,
  opponentKey,
  timeInPossessionKey,
  oppPossessionKey,
  oppPassShareKey,
  showLabels = false,
  globalIncludeOpponents,
  onExpansionChange,
}) => {
  const { config, isLoading, handleConfigChange, handleSave, handleReset, handleExpandToggle, isExpanded } = useChartConfig({
    chartType: 'possession',
    defaultConfig: DEFAULT_POSSESSION_CONFIG,
    globalIncludeOpponents,
    onExpansionChange,
  });

  // Build chart data based on configuration
  const chartData = data.map((match) => {
    const base: any = {
      name: match[opponentKey] || 'Opponent',
    };

    if (config.visibleMetrics.includes('possession')) {
      base['Possession'] = typeof match[possessionKey] === 'number' ? match[possessionKey] : 0;
    }
    if (config.visibleMetrics.includes('passShare')) {
      base['Pass Share'] = typeof match[passShareKey] === 'number' ? match[passShareKey] : 0;
    }
    if (config.visibleMetrics.includes('timeInPossession') && timeInPossessionKey) {
      base['Time in Possession'] = typeof match[timeInPossessionKey] === 'number' ? match[timeInPossessionKey] : 0;
    }
    if (config.includeOpponent) {
      if (oppPossessionKey && config.visibleMetrics.includes('possession')) {
        base['Opponent Possession'] = typeof match[oppPossessionKey] === 'number' ? match[oppPossessionKey] : 0;
      }
      if (oppPassShareKey && config.visibleMetrics.includes('passShare')) {
        base['Opponent Pass Share'] = typeof match[oppPassShareKey] === 'number' ? match[oppPassShareKey] : 0;
      }
    }

    return base;
  });

  // Determine which bars to render based on config
  const renderBars = () => {
    const bars: JSX.Element[] = [];

    if (config.visibleMetrics.includes('possession')) {
      bars.push(
        <Bar key="Possession" dataKey="Possession" fill={JOGA_COLORS.voltYellow} animationDuration={500}>
          {showLabels && <LabelList dataKey="Possession" position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
        </Bar>
      );
      if (config.includeOpponent && oppPossessionKey) {
        bars.push(
          <Bar key="Opponent Possession" dataKey="Opponent Possession" fill={OPPONENT_COLORS.primary} animationDuration={500}>
            {showLabels && <LabelList dataKey="Opponent Possession" position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
          </Bar>
        );
      }
    }
    if (config.visibleMetrics.includes('passShare')) {
      bars.push(
        <Bar key="Pass Share" dataKey="Pass Share" fill={JOGA_COLORS.valorBlue} animationDuration={500}>
          {showLabels && <LabelList dataKey="Pass Share" position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
        </Bar>
      );
      if (config.includeOpponent && oppPassShareKey) {
        bars.push(
          <Bar key="Opponent Pass Share" dataKey="Opponent Pass Share" fill={OPPONENT_COLORS.secondary} animationDuration={500}>
            {showLabels && <LabelList dataKey="Opponent Pass Share" position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
          </Bar>
        );
      }
    }
    if (config.visibleMetrics.includes('timeInPossession') && timeInPossessionKey) {
      bars.push(
        <Bar key="Time in Possession" dataKey="Time in Possession" fill={JOGA_COLORS.pinkFoam} animationDuration={500}>
          {showLabels && <LabelList dataKey="Time in Possession" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }

    return bars;
  };

  const availableMetrics = [
    { id: 'possession', label: 'Possession %', required: false },
    { id: 'passShare', label: 'Pass Share %', required: false },
    ...(timeInPossessionKey ? [{ id: 'timeInPossession', label: 'Time in Possession', required: false }] : []),
  ];

  // Fixed title - don't rename based on metrics
  const chartTitle = 'Possession & Pass Share';

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
            chartType="possession"
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
          <YAxis domain={[0, 100]} />
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

