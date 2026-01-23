import React from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS, OPPONENT_COLORS } from '../utils/colors';
import { DEFAULT_PASS_SHARE_CONFIG, getChartTitle } from '../types/chartConfig';
import { ChartConfigPanel } from './ChartConfigPanel';
import { ChartExpandButton } from './ChartExpandButton';
import { useChartConfig } from '../hooks/useChartConfig';

interface PassShareChartProps {
  data: MatchData[];
  passShareKey: string;
  oppPassShareKey: string;
  opponentKey: string;
  // Optional metrics
  possessionKey?: string;
  oppPossessionKey?: string;
  showLabels?: boolean;
  globalIncludeOpponents?: boolean; // Global override for includeOpponent
  onExpansionChange?: (isExpanded: boolean) => void; // Callback when expansion state changes
}

export const PassShareChart: React.FC<PassShareChartProps> = ({
  data,
  passShareKey,
  oppPassShareKey,
  opponentKey,
  possessionKey,
  oppPossessionKey,
  showLabels: _showLabels = false,
  globalIncludeOpponents,
  onExpansionChange,
}) => {
  const { config, isLoading, handleConfigChange, handleSave, handleReset, handleExpandToggle, isExpanded } = useChartConfig({
    chartType: 'passShare',
    defaultConfig: DEFAULT_PASS_SHARE_CONFIG,
    globalIncludeOpponents,
    onExpansionChange,
  });

  // Build chart data based on configuration
  const chartData = data.map((match) => {
    const base: any = {
      name: match[opponentKey] || 'Opponent',
    };

    // Add JOGA team metrics
    if (config.visibleMetrics.includes('passShare')) {
      base['Pass Share'] = typeof match[passShareKey] === 'number' ? match[passShareKey] : 0;
    }
    if (config.visibleMetrics.includes('possession') && possessionKey) {
      base['Possession'] = typeof match[possessionKey] === 'number' ? match[possessionKey] : 0;
    }

    // Add opponent metrics when includeOpponent is true
    if (config.includeOpponent) {
      if (config.visibleMetrics.includes('passShare')) {
        base['Opp Pass Share'] = typeof match[oppPassShareKey] === 'number' ? match[oppPassShareKey] : 0;
      }
      if (config.visibleMetrics.includes('possession') && oppPossessionKey) {
        base['Opp Possession'] = typeof match[oppPossessionKey] === 'number' ? match[oppPossessionKey] : 0;
      }
    }

    return base;
  });

  // Determine which elements to render based on config
  const renderChartElements = () => {
    const elements: JSX.Element[] = [];

    if (config.visibleMetrics.includes('passShare')) {
      elements.push(
        <Line
          key="Pass Share"
          yAxisId="left"
          type="monotone"
          dataKey="Pass Share"
          stroke={JOGA_COLORS.voltYellow}
          strokeWidth={2}
        />
      );
    }
    if (config.visibleMetrics.includes('possession') && possessionKey) {
      elements.push(
        <Line
          key="Possession"
          yAxisId="left"
          type="monotone"
          dataKey="Possession"
          stroke={JOGA_COLORS.valorBlue}
          strokeWidth={2}
          strokeDasharray="5 5"
        />
      );
    }

    // Opponent elements (only when includeOpponent is true)
    if (config.includeOpponent) {
      if (config.visibleMetrics.includes('passShare')) {
        elements.push(
          <Bar key="Opp Pass Share" yAxisId="right" dataKey="Opp Pass Share" fill={OPPONENT_COLORS.primary} />
        );
      }
      if (config.visibleMetrics.includes('possession') && oppPossessionKey) {
        elements.push(
          <Bar key="Opp Possession" yAxisId="right" dataKey="Opp Possession" fill={OPPONENT_COLORS.secondary} />
        );
      }
    }

    return elements;
  };

  // Available metrics
  const availableMetrics = [
    { id: 'passShare', label: 'Pass Share %', required: false },
    ...(possessionKey ? [{ id: 'possession', label: 'Possession %', required: false }] : []),
  ];

  // Generate dynamic title
  const chartTitle = getChartTitle('passShare', config.visibleMetrics);

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
            chartType="passShare"
            config={config}
            availableMetrics={availableMetrics}
            onConfigChange={handleConfigChange}
            onSave={handleSave}
            onReset={handleReset}
          />
        </div>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 30, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <Legend 
            verticalAlign="top" 
            align="center" 
            wrapperStyle={{ paddingBottom: '5px', color: '#1f2937' }}
            formatter={(value: string) => value.trim()}
          />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
          <YAxis yAxisId="left" domain={[0, 100]} label={{ value: 'Percent', angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#111827',
              color: '#ffffff',
              border: '1px solid #374151',
              borderRadius: '8px',
              padding: '12px'
            }}
          />
          {renderChartElements()}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

