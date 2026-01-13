import React, { useMemo } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS } from '../utils/colors';

interface TeamComparisonRadialChartProps {
  data: MatchData[];
  teamKey: string;
  availableTeams: string[];
  getTSRKey: () => string;
  getPossessionKey: () => string;
  getSPIKey: () => string;
  getPassesKey: () => string;
  getLPCAvgKey: () => string;
  getConversionRateKey: () => string;
  columnKeys: string[];
}

export const TeamComparisonRadialChart: React.FC<TeamComparisonRadialChartProps> = ({
  data,
  teamKey,
  availableTeams,
  getTSRKey,
  getPossessionKey,
  getSPIKey,
  getPassesKey,
  getLPCAvgKey,
  getConversionRateKey,
  columnKeys,
}) => {
  // Select 2 random teams - use a stable selection based on availableTeams
  const selectedTeams = useMemo(() => {
    if (!availableTeams || availableTeams.length < 2) return [];
    // Use a deterministic shuffle based on array length to avoid re-rendering on every render
    const sorted = [...availableTeams].sort();
    // Pick first two teams for consistency (or could use a hash of availableTeams)
    return sorted.slice(0, 2);
  }, [availableTeams]);

  // Calculate averages for each team
  const chartData = useMemo(() => {
    if (selectedTeams.length < 2 || !data || data.length === 0) return [];

    const tsrKey = getTSRKey();
    const possessionKey = getPossessionKey();
    const spiKey = getSPIKey();
    const passesKey = getPassesKey();
    const lpcKey = getLPCAvgKey();
    const conversionKey = getConversionRateKey();

    if (!columnKeys || columnKeys.length === 0) return [];

    const metrics = [
      { key: tsrKey, label: 'Total Shots Ratio', max: 100 },
      { key: possessionKey, label: 'Possession %', max: 100 },
      { key: spiKey, label: 'SPI', max: 100 },
      { key: passesKey, label: 'Passes Completed', max: 500 },
      { key: lpcKey, label: 'LPC', max: 20 },
      { key: conversionKey, label: 'Conversion Rate', max: 100 },
    ].filter(m => columnKeys && columnKeys.includes(m.key)); // Only include metrics that exist in columnKeys

    if (metrics.length === 0) return [];

    const result = metrics.map(metric => {
      const dataPoint: any = {
        metric: metric.label,
      };

      selectedTeams.forEach(team => {
        const teamMatches = data.filter(match => {
          const matchTeam = match[teamKey];
          return matchTeam && String(matchTeam).trim() === team;
        });
        
        if (teamMatches.length === 0) {
          dataPoint[team] = 0;
          return;
        }

        const values = teamMatches
          .map(m => m[metric.key])
          .filter(val => typeof val === 'number' && !isNaN(val) && val !== null && val !== undefined) as number[];

        if (values.length === 0) {
          dataPoint[team] = 0;
          return;
        }

        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        
        // Normalize to 0-100 scale for radar chart
        // For metrics that are already percentages (0-100), use as-is
        // For other metrics, normalize based on max value
        if (metric.max === 100 && avg >= 0 && avg <= 100) {
          dataPoint[team] = Math.round(avg * 10) / 10; // Round to 1 decimal
        } else {
          // Normalize: (value / max) * 100, capped at 100
          dataPoint[team] = Math.min(Math.round((avg / metric.max) * 100 * 10) / 10, 100);
        }
      });

      return dataPoint;
    });

    return result;
  }, [data, teamKey, selectedTeams, getTSRKey, getPossessionKey, getSPIKey, getPassesKey, getLPCAvgKey, getConversionRateKey, columnKeys]);

  if (selectedTeams.length < 2) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-600">At least 2 teams are required for comparison.</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-600">No data available for the selected metrics.</p>
      </div>
    );
  }

  const colors = [JOGA_COLORS.voltYellow, JOGA_COLORS.valorBlue];

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Team Comparison
      </h2>
      <p className="text-center text-gray-600 mb-6">
        Comparing {selectedTeams[0]} vs {selectedTeams[1]}
      </p>
      <ResponsiveContainer width="100%" height={600}>
        <RadarChart data={chartData}>
          <PolarGrid />
          <PolarAngleAxis 
            dataKey="metric" 
            tick={{ fill: '#374151', fontSize: 12 }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]}
            tick={{ fill: '#6b7280', fontSize: 10 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string) => {
              return [`${value.toFixed(1)}`, name];
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => {
              const index = selectedTeams.indexOf(value);
              return index >= 0 ? selectedTeams[index] : value;
            }}
          />
          {selectedTeams.map((team, index) => (
            <Radar
              key={team}
              name={team}
              dataKey={team}
              stroke={colors[index % colors.length]}
              fill={colors[index % colors.length]}
              fillOpacity={0.3}
              strokeWidth={2}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
      <div className="mt-4 text-center text-sm text-gray-500">
        <p>Metrics normalized to 0-100 scale for comparison</p>
      </div>
    </div>
  );
};
