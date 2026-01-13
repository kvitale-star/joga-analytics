import React from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS } from '../utils/colors';

interface PossessionChartProps {
  data: MatchData[];
  possessionKey: string;
  passShareKey: string;
  opponentKey: string;
}

export const PossessionChart: React.FC<PossessionChartProps> = ({
  data,
  possessionKey,
  passShareKey,
  opponentKey,
}) => {
  const chartData = data.map((match) => ({
    name: match[opponentKey] || 'Opponent',
    Possession: typeof match[possessionKey] === 'number' ? match[possessionKey] : 0,
    'Pass Share': typeof match[passShareKey] === 'number' ? match[passShareKey] : 0,
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-2 text-gray-800">Possession Over Time</h3>
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
          <Line yAxisId="left" type="monotone" dataKey="Possession" stroke={JOGA_COLORS.voltYellow} strokeWidth={2} />
          <Bar yAxisId="right" dataKey="Pass Share" fill={JOGA_COLORS.valorBlue} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

