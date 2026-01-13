import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS, OPPONENT_COLORS } from '../utils/colors';

interface TSRChartProps {
  data: MatchData[];
  tsrKey?: string;
  oppTSRKey?: string;
  opponentKey: string;
  showLabels?: boolean;
}

export const TSRChart: React.FC<TSRChartProps> = ({
  data,
  tsrKey,
  oppTSRKey,
  opponentKey,
  showLabels = false,
}) => {
  const chartData = data.map((match) => {
    const base: any = {
      name: match[opponentKey] || 'Opponent',
    };
    if (tsrKey) {
      const val = match[tsrKey];
      base['TSR'] = typeof val === 'number' ? val : null;
    }
    if (oppTSRKey) {
      const valOpp = match[oppTSRKey];
      base['Opp TSR'] = typeof valOpp === 'number' ? valOpp : null;
    }
    return base;
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-2 text-gray-800">Total Shots Ratio</h3>
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
          <YAxis domain={[0, 100]} label={{ value: 'Percent', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#111827',
              color: '#ffffff',
              border: '1px solid #374151',
              borderRadius: '8px',
              padding: '12px'
            }}
          />
          {tsrKey && (
            <Bar dataKey="TSR" name="Total Shots Ratio" fill={JOGA_COLORS.voltYellow} animationDuration={500}>
              {showLabels && <LabelList dataKey="TSR" position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
            </Bar>
          )}
          {oppTSRKey && (
            <Bar dataKey="Opp TSR" name="Opp Total Shots Ratio" fill={OPPONENT_COLORS.primary} animationDuration={500}>
              {showLabels && <LabelList dataKey="Opp TSR" position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

