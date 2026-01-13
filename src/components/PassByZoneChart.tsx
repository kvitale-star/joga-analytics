import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS, OPPONENT_COLORS } from '../utils/colors';

interface PassByZoneChartProps {
  data: MatchData[];
  passByZoneKeys: string[];
  oppPassByZoneKeys: string[];
  opponentKey: string;
  showLabels?: boolean;
}

export const PassByZoneChart: React.FC<PassByZoneChartProps> = ({
  data,
  passByZoneKeys,
  oppPassByZoneKeys,
  opponentKey,
  showLabels = false,
}) => {
  const chartData = data.map((match) => {
    const base: any = {
      name: match[opponentKey] || 'Opponent',
    };
    
    // Add team pass % by zone data
    passByZoneKeys.forEach((key) => {
      // Extract zone label from column name (e.g., "Pass % by Zone (Def)" -> "Def")
      let zoneLabel = key.match(/zone\s*\(([^)]+)\)/i)?.[1] || key.match(/zone\s*(\d+)/i)?.[1];
      if (!zoneLabel) {
        zoneLabel = key.replace(/[^A-Za-z]/g, '').replace(/PassbyZone/i, '') || key.replace(/[^0-9A-Za-z]/g, '');
      }
      base[`Zone ${zoneLabel}`] = typeof match[key] === 'number' ? match[key] : null;
    });
    
    // Add opponent pass % by zone data
    oppPassByZoneKeys.forEach((key) => {
      // Extract zone label from column name
      let zoneLabel = key.match(/zone\s*\(([^)]+)\)/i)?.[1] || key.match(/zone\s*(\d+)/i)?.[1];
      if (!zoneLabel) {
        zoneLabel = key.replace(/[^A-Za-z]/g, '').replace(/OppPassbyZone/i, '').replace(/Opponent/i, '') || key.replace(/[^0-9A-Za-z]/g, '');
      }
      base[`Opp Zone ${zoneLabel}`] = typeof match[key] === 'number' ? match[key] : null;
    });
    
    return base;
  });

  const colors = [JOGA_COLORS.voltYellow, JOGA_COLORS.valorBlue, '#8b9dc3', '#a8c4e0', '#c4d4e8', '#e0e4f0'];
  const oppColors = [OPPONENT_COLORS.primary, OPPONENT_COLORS.secondary, '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6'];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-2 text-gray-800">Pass % by Zone</h3>
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
          {passByZoneKeys.map((key, index) => {
            // Extract zone label from column name
            let zoneLabel = key.match(/zone\s*\(([^)]+)\)/i)?.[1] || key.match(/zone\s*(\d+)/i)?.[1];
            if (!zoneLabel) {
              zoneLabel = key.replace(/[^A-Za-z]/g, '').replace(/PassbyZone/i, '') || key.replace(/[^0-9A-Za-z]/g, '');
            }
            return (
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
          })}
          {oppPassByZoneKeys.map((key, index) => {
            // Extract zone label from column name
            let zoneLabel = key.match(/zone\s*\(([^)]+)\)/i)?.[1] || key.match(/zone\s*(\d+)/i)?.[1];
            if (!zoneLabel) {
              zoneLabel = key.replace(/[^A-Za-z]/g, '').replace(/OppPassbyZone/i, '').replace(/Opponent/i, '') || key.replace(/[^0-9A-Za-z]/g, '');
            }
            return (
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
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

