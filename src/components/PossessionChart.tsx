import React, { useState, useEffect } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS, OPPONENT_COLORS } from '../utils/colors';
import { ChartConfig, DEFAULT_POSSESSION_CONFIG, getChartTitle } from '../types/chartConfig';
import { ChartConfigPanel } from './ChartConfigPanel';
import { useAuth } from '../contexts/AuthContext';
import { getChartConfig, saveChartConfig, resetChartConfig } from '../services/chartPreferencesService';

interface PossessionChartProps {
  data: MatchData[];
  possessionKey: string;
  passShareKey: string;
  opponentKey: string;
  // Optional metrics (if available in data)
  timeInPossessionKey?: string;
  oppPossessionKey?: string;
  oppPassShareKey?: string;
}

export const PossessionChart: React.FC<PossessionChartProps> = ({
  data,
  possessionKey,
  passShareKey,
  opponentKey,
  timeInPossessionKey,
  oppPossessionKey,
  oppPassShareKey,
}) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<ChartConfig>(DEFAULT_POSSESSION_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  // Load user preferences on mount
  useEffect(() => {
    const loadConfig = async () => {
      if (user) {
        try {
          const savedConfig = await getChartConfig(user.id, 'possession');
          setConfig(savedConfig);
        } catch (error) {
          console.error('Error loading chart config:', error);
        }
      }
      setIsLoading(false);
    };
    loadConfig();
  }, [user]);

  const handleConfigChange = (newConfig: ChartConfig) => {
    setConfig(newConfig);
  };

  const handleSave = async () => {
    if (user) {
      try {
        await saveChartConfig(user.id, 'possession', config);
      } catch (error) {
        console.error('Error saving chart config:', error);
        alert('Failed to save chart preferences');
      }
    }
  };

  const handleReset = async () => {
    if (user) {
      try {
        await resetChartConfig(user.id, 'possession');
        setConfig(DEFAULT_POSSESSION_CONFIG);
      } catch (error) {
        console.error('Error resetting chart config:', error);
      }
    }
  };

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

  // Determine which elements to render based on config
  const renderChartElements = () => {
    const elements: JSX.Element[] = [];

    if (config.visibleMetrics.includes('possession')) {
      elements.push(
        <Line
          key="Possession"
          yAxisId="left"
          type="monotone"
          dataKey="Possession"
          stroke={JOGA_COLORS.voltYellow}
          strokeWidth={2}
        />
      );
      if (config.includeOpponent && oppPossessionKey) {
        elements.push(
          <Line
            key="Opponent Possession"
            yAxisId="left"
            type="monotone"
            dataKey="Opponent Possession"
            stroke={OPPONENT_COLORS.primary}
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        );
      }
    }
    if (config.visibleMetrics.includes('passShare')) {
      elements.push(
        <Bar
          key="Pass Share"
          yAxisId="right"
          dataKey="Pass Share"
          fill={JOGA_COLORS.valorBlue}
        />
      );
      if (config.includeOpponent && oppPassShareKey) {
        elements.push(
          <Bar
            key="Opponent Pass Share"
            yAxisId="right"
            dataKey="Opponent Pass Share"
            fill={OPPONENT_COLORS.secondary}
          />
        );
      }
    }
    if (config.visibleMetrics.includes('timeInPossession') && timeInPossessionKey) {
      elements.push(
        <Bar
          key="Time in Possession"
          yAxisId="right"
          dataKey="Time in Possession"
          fill={JOGA_COLORS.pinkFoam}
        />
      );
    }

    return elements;
  };

  const availableMetrics = [
    { id: 'possession', label: 'Possession %', required: false },
    { id: 'passShare', label: 'Pass Share %', required: false },
    ...(timeInPossessionKey ? [{ id: 'timeInPossession', label: 'Time in Possession', required: false }] : []),
  ];

  // Generate dynamic title
  const chartTitle = getChartTitle('possession', config.visibleMetrics);

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
        <ChartConfigPanel
          chartType="possession"
          config={config}
          availableMetrics={availableMetrics}
          onConfigChange={handleConfigChange}
          onSave={handleSave}
          onReset={handleReset}
        />
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
          <YAxis yAxisId="left" domain={[0, 100]} />
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

