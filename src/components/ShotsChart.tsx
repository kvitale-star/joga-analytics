import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS, OPPONENT_COLORS } from '../utils/colors';
import { ChartConfig, DEFAULT_SHOTS_CONFIG, getChartTitle } from '../types/chartConfig';
import { ChartConfigPanel } from './ChartConfigPanel';
import { useAuth } from '../contexts/AuthContext';
import { getChartConfig, saveChartConfig, resetChartConfig } from '../services/chartPreferencesService';

interface ShotsChartProps {
  data: MatchData[];
  shotsForKey: string;
  shotsAgainstKey: string; // Opponent shots (will be used when includeOpponent is true)
  opponentKey: string;
  showLabels?: boolean;
  // Optional metrics (if available in data)
  attemptsForKey?: string;
  attemptsAgainstKey?: string; // Opponent attempts (will be used when includeOpponent is true)
  goalsForKey?: string;
  goalsAgainstKey?: string; // Opponent goals (will be used when includeOpponent is true)
}

export const ShotsChart: React.FC<ShotsChartProps> = ({
  data,
  shotsForKey,
  shotsAgainstKey,
  opponentKey,
  showLabels = false,
  attemptsForKey,
  attemptsAgainstKey,
  goalsForKey,
  goalsAgainstKey,
}) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<ChartConfig>(DEFAULT_SHOTS_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  // Load user preferences on mount
  useEffect(() => {
    const loadConfig = async () => {
      if (user) {
        try {
          const savedConfig = await getChartConfig(user.id, 'shots');
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
        await saveChartConfig(user.id, 'shots', config);
      } catch (error) {
        console.error('Error saving chart config:', error);
        alert('Failed to save chart preferences');
      }
    }
  };

  const handleReset = async () => {
    if (user) {
      try {
        await resetChartConfig(user.id, 'shots');
        setConfig(DEFAULT_SHOTS_CONFIG);
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

    // Add JOGA team metrics
    if (config.visibleMetrics.includes('shotsFor')) {
      base['Shots For'] = typeof match[shotsForKey] === 'number' ? match[shotsForKey] : 0;
    }
    if (config.visibleMetrics.includes('attemptsFor') && attemptsForKey) {
      base['Attempts For'] = typeof match[attemptsForKey] === 'number' ? match[attemptsForKey] : 0;
    }
    if (config.visibleMetrics.includes('goalsFor') && goalsForKey) {
      base['Goals For'] = typeof match[goalsForKey] === 'number' ? match[goalsForKey] : 0;
    }

    // Add opponent metrics when includeOpponent is true
    if (config.includeOpponent) {
      if (config.visibleMetrics.includes('shotsFor') && shotsAgainstKey) {
        base['Opponent Shots'] = typeof match[shotsAgainstKey] === 'number' ? match[shotsAgainstKey] : 0;
      }
      if (config.visibleMetrics.includes('attemptsFor') && attemptsAgainstKey) {
        base['Opponent Attempts'] = typeof match[attemptsAgainstKey] === 'number' ? match[attemptsAgainstKey] : 0;
      }
      if (config.visibleMetrics.includes('goalsFor') && goalsAgainstKey) {
        base['Opponent Goals'] = typeof match[goalsAgainstKey] === 'number' ? match[goalsAgainstKey] : 0;
      }
    }

    return base;
  });

  // Determine which bars to render based on config
  const renderBars = () => {
    const bars: JSX.Element[] = [];

    // JOGA team bars
    if (config.visibleMetrics.includes('shotsFor')) {
      bars.push(
        <Bar key="Shots For" dataKey="Shots For" fill={JOGA_COLORS.voltYellow} animationDuration={500}>
          {showLabels && <LabelList dataKey="Shots For" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }
    if (config.visibleMetrics.includes('attemptsFor') && attemptsForKey) {
      bars.push(
        <Bar key="Attempts For" dataKey="Attempts For" fill={JOGA_COLORS.pinkFoam} animationDuration={500}>
          {showLabels && <LabelList dataKey="Attempts For" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }
    if (config.visibleMetrics.includes('goalsFor') && goalsForKey) {
      bars.push(
        <Bar key="Goals For" dataKey="Goals For" fill={JOGA_COLORS.valorBlue} animationDuration={500}>
          {showLabels && <LabelList dataKey="Goals For" position="top" fill="#666" fontSize={12} />}
        </Bar>
      );
    }

    // Opponent bars (only when includeOpponent is true)
    if (config.includeOpponent) {
      if (config.visibleMetrics.includes('shotsFor') && shotsAgainstKey) {
        bars.push(
          <Bar key="Opponent Shots" dataKey="Opponent Shots" fill={OPPONENT_COLORS.primary} animationDuration={500}>
            {showLabels && <LabelList dataKey="Opponent Shots" position="top" fill="#666" fontSize={12} />}
          </Bar>
        );
      }
      if (config.visibleMetrics.includes('attemptsFor') && attemptsAgainstKey) {
        bars.push(
          <Bar key="Opponent Attempts" dataKey="Opponent Attempts" fill={OPPONENT_COLORS.secondary} animationDuration={500}>
            {showLabels && <LabelList dataKey="Opponent Attempts" position="top" fill="#666" fontSize={12} />}
          </Bar>
        );
      }
      if (config.visibleMetrics.includes('goalsFor') && goalsAgainstKey) {
        bars.push(
          <Bar key="Opponent Goals" dataKey="Opponent Goals" fill={OPPONENT_COLORS.dark} animationDuration={500}>
            {showLabels && <LabelList dataKey="Opponent Goals" position="top" fill="#666" fontSize={12} />}
          </Bar>
        );
      }
    }

    return bars;
  };

  // Available metrics - only "For" metrics, no "Against"
  const availableMetrics = [
    { id: 'shotsFor', label: 'Shots For', required: false },
    ...(attemptsForKey ? [{ id: 'attemptsFor', label: 'Attempts For', required: false }] : []),
    ...(goalsForKey ? [{ id: 'goalsFor', label: 'Goals For', required: false }] : []),
  ];

  // Generate dynamic title
  const chartTitle = getChartTitle('shots', config.visibleMetrics);

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
          chartType="shots"
          config={config}
          availableMetrics={availableMetrics}
          onConfigChange={handleConfigChange}
          onSave={handleSave}
          onReset={handleReset}
        />
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
