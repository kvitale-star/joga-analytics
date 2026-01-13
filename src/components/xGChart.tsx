import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS, OPPONENT_COLORS } from '../utils/colors';

interface xGChartProps {
  data: MatchData[];
  xGKey: string;
  xGAKey: string;
  opponentKey: string;
  showLabels?: boolean;
}

export const XGChart: React.FC<xGChartProps> = ({
  data,
  xGKey,
  xGAKey,
  opponentKey,
  showLabels = false,
}) => {
  const chartData = data.map((match) => ({
    name: match[opponentKey] || 'Opponent',
    'xG': typeof match[xGKey] === 'number' ? match[xGKey] : 0,
    'xG (Opp)': typeof match[xGAKey] === 'number' ? match[xGAKey] : 0,
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-2 text-gray-800">Expected Goals (xG)</h3>
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
          <Bar dataKey="xG" fill={JOGA_COLORS.voltYellow} animationDuration={500}>
            {showLabels && <LabelList dataKey="xG" position="top" fill="#666" fontSize={12} />}
          </Bar>
          <Bar dataKey="xG (Opp)" fill={OPPONENT_COLORS.primary} animationDuration={500}>
            {showLabels && <LabelList dataKey="xG (Opp)" position="top" fill="#666" fontSize={12} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

