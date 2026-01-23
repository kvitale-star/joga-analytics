import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS, OPPONENT_COLORS } from '../utils/colors';
import { DEFAULT_SPI_CONFIG, getChartTitle } from '../types/chartConfig';
import { ChartConfigPanel } from './ChartConfigPanel';
import { ChartExpandButton } from './ChartExpandButton';
import { useChartConfig } from '../hooks/useChartConfig';

interface SPIChartProps {
  data: MatchData[];
  spiKey: string;
  spiWKey: string;
  oppSpiKey: string;
  oppSpiWKey: string;
  opponentKey: string;
  showLabels?: boolean;
  globalIncludeOpponents?: boolean; // Global override for includeOpponent
  onExpansionChange?: (isExpanded: boolean) => void; // Callback when expansion state changes
}

export const SPIChart: React.FC<SPIChartProps> = ({
  data,
  spiKey,
  spiWKey,
  oppSpiKey,
  oppSpiWKey,
  opponentKey,
  showLabels = false,
  globalIncludeOpponents,
  onExpansionChange,
}) => {
  const { config, isLoading, handleConfigChange, handleSave, handleReset, handleExpandToggle, isExpanded } = useChartConfig({
    chartType: 'spi',
    defaultConfig: DEFAULT_SPI_CONFIG,
    globalIncludeOpponents,
    onExpansionChange,
  });

  // Build chart data based on configuration
  const chartData = data.map((match) => {
    const base: any = {
      name: match[opponentKey] || 'Opponent',
    };

    // Add JOGA team metrics
    if (config.visibleMetrics.includes('spi')) {
      base['SPI'] = typeof match[spiKey] === 'number' ? match[spiKey] : null;
    }
    if (config.visibleMetrics.includes('spiW')) {
      base['SPI (w)'] = typeof match[spiWKey] === 'number' ? match[spiWKey] : null;
    }

    // Add opponent metrics when includeOpponent is true
    if (config.includeOpponent) {
      if (config.visibleMetrics.includes('spi')) {
        base['Opp SPI'] = typeof match[oppSpiKey] === 'number' ? match[oppSpiKey] : null;
      }
      if (config.visibleMetrics.includes('spiW')) {
        base['Opp SPI (w)'] = typeof match[oppSpiWKey] === 'number' ? match[oppSpiWKey] : null;
      }
    }

    return base;
  });

  // Determine which bars to render based on config
  const renderBars = () => {
    const bars: JSX.Element[] = [];

    if (config.visibleMetrics.includes('spi')) {
      bars.push(
        <Bar key="SPI" dataKey="SPI" fill={JOGA_COLORS.voltYellow} animationDuration={500}>
          {showLabels && <LabelList dataKey="SPI" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }
    if (config.visibleMetrics.includes('spiW')) {
      bars.push(
        <Bar key="SPI (w)" dataKey="SPI (w)" fill={JOGA_COLORS.valorBlue} animationDuration={500}>
          {showLabels && <LabelList dataKey="SPI (w)" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }

    // Opponent bars (only when includeOpponent is true)
    if (config.includeOpponent) {
      if (config.visibleMetrics.includes('spi')) {
        bars.push(
          <Bar key="Opp SPI" dataKey="Opp SPI" fill={OPPONENT_COLORS.primary} animationDuration={500}>
            {showLabels && <LabelList dataKey="Opp SPI" position="top" fill="#666" fontSize={12} />}
          </Bar>
        );
      }
      if (config.visibleMetrics.includes('spiW')) {
        bars.push(
          <Bar key="Opp SPI (w)" dataKey="Opp SPI (w)" fill={OPPONENT_COLORS.secondary} animationDuration={500}>
            {showLabels && <LabelList dataKey="Opp SPI (w)" position="top" fill="#666" fontSize={12} />}
          </Bar>
        );
      }
    }

    return bars;
  };

  // Available metrics
  const availableMetrics = [
    { id: 'spi', label: 'SPI', required: false },
    { id: 'spiW', label: 'SPI (w)', required: false },
  ];

  // Generate dynamic title
  const chartTitle = getChartTitle('spi', config.visibleMetrics);

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
            chartType="spi"
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


