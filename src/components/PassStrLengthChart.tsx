import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS } from '../utils/colors';
import { DEFAULT_PASS_STR_LENGTH_CONFIG } from '../types/chartConfig';
import { ChartConfigPanel } from './ChartConfigPanel';
import { ChartExpandButton } from './ChartExpandButton';
import { useChartConfig } from '../hooks/useChartConfig';

interface PassStrLengthChartProps {
  data: MatchData[];
  passStrings35Key: string;
  passStrings6PlusKey: string;
  lpcKey: string;
  opponentKey: string;
  showLabels?: boolean;
  // Optional metrics for <4 and 4+ pass strings
  passStringsLessThan4Key?: string;
  passStrings4PlusKey?: string;
  globalIncludeOpponents?: boolean; // Global override for includeOpponent (not used for this chart)
  onExpansionChange?: (isExpanded: boolean) => void; // Callback when expansion state changes
}

export const PassStrLengthChart: React.FC<PassStrLengthChartProps> = ({
  data,
  passStrings35Key,
  passStrings6PlusKey,
  lpcKey,
  opponentKey,
  showLabels = false,
  passStringsLessThan4Key,
  passStrings4PlusKey,
  globalIncludeOpponents: _globalIncludeOpponents,
  onExpansionChange,
}) => {
  const { config, isLoading, handleConfigChange, handleSave, handleReset, handleExpandToggle, isExpanded } = useChartConfig({
    chartType: 'passStrLength',
    defaultConfig: DEFAULT_PASS_STR_LENGTH_CONFIG,
    globalIncludeOpponents: false, // This chart doesn't support opponent data
    onExpansionChange,
  });

  // Build chart data based on configuration
  const chartData = data.map((match) => {
    const base: any = {
      name: match[opponentKey] || 'Opponent',
    };

    // Add JOGA team metrics
    if (config.visibleMetrics.includes('passStringsLessThan4') && passStringsLessThan4Key) {
      base['<4 Pass Strings'] = typeof match[passStringsLessThan4Key] === 'number' ? match[passStringsLessThan4Key] : null;
    }
    if (config.visibleMetrics.includes('passStrings4Plus') && passStrings4PlusKey) {
      base['4+ Pass Strings'] = typeof match[passStrings4PlusKey] === 'number' ? match[passStrings4PlusKey] : null;
    }
    if (config.visibleMetrics.includes('passStrings35')) {
      base['3-5 Pass Strings'] = typeof match[passStrings35Key] === 'number' ? match[passStrings35Key] : null;
    }
    if (config.visibleMetrics.includes('passStrings6Plus')) {
      base['6+ Pass Strings'] = typeof match[passStrings6PlusKey] === 'number' ? match[passStrings6PlusKey] : null;
    }
    if (config.visibleMetrics.includes('lpc')) {
      base['LPC'] = typeof match[lpcKey] === 'number' ? match[lpcKey] : null;
    }

    return base;
  });

  // Determine which bars to render based on config
  const renderBars = () => {
    const bars: JSX.Element[] = [];

    if (config.visibleMetrics.includes('passStringsLessThan4') && passStringsLessThan4Key) {
      bars.push(
        <Bar key="<4 Pass Strings" dataKey="<4 Pass Strings" fill={JOGA_COLORS.voltYellow} animationDuration={500}>
          {showLabels && <LabelList dataKey="<4 Pass Strings" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }
    if (config.visibleMetrics.includes('passStrings4Plus') && passStrings4PlusKey) {
      bars.push(
        <Bar key="4+ Pass Strings" dataKey="4+ Pass Strings" fill={JOGA_COLORS.valorBlue} animationDuration={500}>
          {showLabels && <LabelList dataKey="4+ Pass Strings" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }
    if (config.visibleMetrics.includes('passStrings35')) {
      bars.push(
        <Bar key="3-5 Pass Strings" dataKey="3-5 Pass Strings" fill={JOGA_COLORS.voltYellow} animationDuration={500}>
          {showLabels && <LabelList dataKey="3-5 Pass Strings" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }
    if (config.visibleMetrics.includes('passStrings6Plus')) {
      bars.push(
        <Bar key="6+ Pass Strings" dataKey="6+ Pass Strings" fill={JOGA_COLORS.valorBlue} animationDuration={500}>
          {showLabels && <LabelList dataKey="6+ Pass Strings" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }
    if (config.visibleMetrics.includes('lpc')) {
      bars.push(
        <Bar key="LPC" dataKey="LPC" fill={JOGA_COLORS.pinkFoam} animationDuration={500}>
          {showLabels && <LabelList dataKey="LPC" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }

    return bars;
  };

  // Available metrics
  const availableMetrics = [
    { id: 'passStrings35', label: '3-5 Pass Strings', required: false },
    { id: 'passStrings6Plus', label: '6+ Pass Strings', required: false },
    { id: 'lpc', label: 'LPC (Longest Pass Chain)', required: false },
    ...(passStringsLessThan4Key ? [{ id: 'passStringsLessThan4', label: '<4 Pass Strings', required: false }] : []),
    ...(passStrings4PlusKey ? [{ id: 'passStrings4Plus', label: '4+ Pass Strings', required: false }] : []),
  ];

  // Fixed title - don't rename based on metrics
  const chartTitle = 'Pass Strings';

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
            chartType="passStrLength"
            config={config}
            availableMetrics={availableMetrics}
            onConfigChange={handleConfigChange}
            onSave={handleSave}
            onReset={handleReset}
            hideOpponentToggle={true}
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

