import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS, OPPONENT_COLORS } from '../utils/colors';
import { DEFAULT_PPM_CONFIG, getChartTitle } from '../types/chartConfig';
import { ChartConfigPanel } from './ChartConfigPanel';
import { ChartExpandButton } from './ChartExpandButton';
import { useChartConfig } from '../hooks/useChartConfig';

interface PPMChartProps {
  data: MatchData[];
  ppmKey: string;
  oppPPMKey: string;
  opponentKey: string;
  showLabels?: boolean;
  globalIncludeOpponents?: boolean; // Global override for includeOpponent
  onExpansionChange?: (isExpanded: boolean) => void; // Callback when expansion state changes
}

export const PPMChart: React.FC<PPMChartProps> = ({
  data,
  ppmKey,
  oppPPMKey,
  opponentKey,
  showLabels = false,
  globalIncludeOpponents,
  onExpansionChange,
}) => {
  const { config, isLoading, handleConfigChange, handleSave, handleReset, handleExpandToggle, isExpanded } = useChartConfig({
    chartType: 'ppm',
    defaultConfig: DEFAULT_PPM_CONFIG,
    globalIncludeOpponents,
    onExpansionChange,
  });

  // Build chart data based on configuration
  const chartData = data.map((match) => {
    const base: any = {
      name: match[opponentKey] || 'Opponent',
    };

    // Add JOGA team metrics
    if (config.visibleMetrics.includes('ppm')) {
      base['PPM'] = typeof match[ppmKey] === 'number' ? match[ppmKey] : 0;
    }

    // Add opponent metrics when includeOpponent is true
    if (config.includeOpponent && config.visibleMetrics.includes('ppm')) {
      base['Opp PPM'] = typeof match[oppPPMKey] === 'number' ? match[oppPPMKey] : 0;
    }

    return base;
  });

  // Determine which bars to render based on config
  const renderBars = () => {
    const bars: JSX.Element[] = [];

    if (config.visibleMetrics.includes('ppm')) {
      bars.push(
        <Bar key="PPM" dataKey="PPM" fill={JOGA_COLORS.voltYellow} animationDuration={500}>
          {showLabels && <LabelList dataKey="PPM" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }

    // Opponent bars (only when includeOpponent is true)
    if (config.includeOpponent && config.visibleMetrics.includes('ppm')) {
      bars.push(
        <Bar key="Opp PPM" dataKey="Opp PPM" fill={OPPONENT_COLORS.primary} animationDuration={500}>
          {showLabels && <LabelList dataKey="Opp PPM" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }

    return bars;
  };

  // Available metrics
  const availableMetrics = [
    { id: 'ppm', label: 'Passes Per Minute', required: false },
  ];

  // Generate dynamic title
  const chartTitle = getChartTitle('ppm', config.visibleMetrics);

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
            chartType="ppm"
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

