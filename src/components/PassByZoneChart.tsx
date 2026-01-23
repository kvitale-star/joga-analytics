import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS, OPPONENT_COLORS } from '../utils/colors';
import { DEFAULT_PASS_BY_ZONE_CONFIG, getChartTitle } from '../types/chartConfig';
import { ChartConfigPanel } from './ChartConfigPanel';
import { ChartExpandButton } from './ChartExpandButton';
import { useChartConfig } from '../hooks/useChartConfig';

interface PassByZoneChartProps {
  data: MatchData[];
  passByZoneKeys: string[];
  oppPassByZoneKeys: string[];
  opponentKey: string;
  showLabels?: boolean;
  globalIncludeOpponents?: boolean; // Global override for includeOpponent
  onExpansionChange?: (isExpanded: boolean) => void; // Callback when expansion state changes
}

// Helper function to extract zone label from column name
function extractZoneLabel(key: string): string {
  let zoneLabel = key.match(/zone\s*\(([^)]+)\)/i)?.[1] || key.match(/zone\s*(\d+)/i)?.[1];
  if (!zoneLabel) {
    zoneLabel = key.replace(/[^A-Za-z]/g, '').replace(/PassbyZone/i, '').replace(/OppPassbyZone/i, '').replace(/Opponent/i, '') || key.replace(/[^0-9A-Za-z]/g, '');
  }
  return zoneLabel;
}

export const PassByZoneChart: React.FC<PassByZoneChartProps> = ({
  data,
  passByZoneKeys,
  oppPassByZoneKeys,
  opponentKey,
  showLabels = false,
  globalIncludeOpponents,
  onExpansionChange,
}) => {
  // Generate available metrics from zone keys
  const availableMetrics = useMemo(() => {
    return passByZoneKeys.map(key => {
      const zoneLabel = extractZoneLabel(key);
      return { id: `zone_${zoneLabel}`, label: `Zone ${zoneLabel}`, required: false };
    });
  }, [passByZoneKeys]);

  // Initialize config with all zones visible by default
  const defaultConfigWithZones = useMemo(() => ({
    ...DEFAULT_PASS_BY_ZONE_CONFIG,
    visibleMetrics: availableMetrics.map(m => m.id),
  }), [availableMetrics]);

  const { config, isLoading, handleConfigChange, handleSave, handleReset, handleExpandToggle, isExpanded } = useChartConfig({
    chartType: 'passByZone',
    defaultConfig: defaultConfigWithZones,
    globalIncludeOpponents,
    onExpansionChange,
  });

  // Build chart data based on configuration
  const chartData = useMemo(() => {
    return data.map((match) => {
      const base: any = {
        name: match[opponentKey] || 'Opponent',
      };
      
      // Add team pass % by zone data (only for visible zones)
      passByZoneKeys.forEach((key) => {
        const zoneLabel = extractZoneLabel(key);
        const metricId = `zone_${zoneLabel}`;
        if (config.visibleMetrics.includes(metricId)) {
          base[`Zone ${zoneLabel}`] = typeof match[key] === 'number' ? match[key] : null;
        }
      });
      
      // Add opponent pass % by zone data (only when includeOpponent is true and zone is visible)
      if (config.includeOpponent) {
        oppPassByZoneKeys.forEach((key) => {
          const zoneLabel = extractZoneLabel(key);
          const metricId = `zone_${zoneLabel}`;
          if (config.visibleMetrics.includes(metricId)) {
            base[`Opp Zone ${zoneLabel}`] = typeof match[key] === 'number' ? match[key] : null;
          }
        });
      }
      
      return base;
    });
  }, [data, passByZoneKeys, oppPassByZoneKeys, opponentKey, config.visibleMetrics, config.includeOpponent]);

  const colors = [JOGA_COLORS.voltYellow, JOGA_COLORS.valorBlue, '#8b9dc3', '#a8c4e0', '#c4d4e8', '#e0e4f0'];
  const oppColors = [OPPONENT_COLORS.primary, OPPONENT_COLORS.secondary, '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6'];

  // Determine which bars to render based on config
  const renderBars = () => {
    const bars: JSX.Element[] = [];

    // Team zone bars
    passByZoneKeys.forEach((key, index) => {
      const zoneLabel = extractZoneLabel(key);
      const metricId = `zone_${zoneLabel}`;
      if (config.visibleMetrics.includes(metricId)) {
        bars.push(
          <Bar 
            key={`team-zone-${zoneLabel}`}
            dataKey={`Zone ${zoneLabel}`} 
            fill={colors[index % colors.length]}
            name={`Zone ${zoneLabel}`}
            animationDuration={500}
          >
            {showLabels && <LabelList dataKey={`Zone ${zoneLabel}`} position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
          </Bar>
        );
      }
    });

    // Opponent zone bars (only when includeOpponent is true)
    if (config.includeOpponent) {
      oppPassByZoneKeys.forEach((key, index) => {
        const zoneLabel = extractZoneLabel(key);
        const metricId = `zone_${zoneLabel}`;
        if (config.visibleMetrics.includes(metricId)) {
          bars.push(
            <Bar 
              key={`opp-zone-${zoneLabel}`}
              dataKey={`Opp Zone ${zoneLabel}`} 
              fill={oppColors[index % oppColors.length]}
              name={`Opp Zone ${zoneLabel}`}
              animationDuration={500}
            >
              {showLabels && <LabelList dataKey={`Opp Zone ${zoneLabel}`} position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
            </Bar>
          );
        }
      });
    }

    return bars;
  };

  // Generate dynamic title
  const chartTitle = getChartTitle('passByZone', config.visibleMetrics);

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
            chartType="passByZone"
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
          <YAxis domain={[0, 100]} label={{ value: '%', angle: -90, position: 'insideLeft' }} />
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

