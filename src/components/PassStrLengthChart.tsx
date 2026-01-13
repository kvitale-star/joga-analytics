import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS } from '../utils/colors';

interface PassStrLengthChartProps {
  data: MatchData[];
  passStrings35Key: string;
  passStrings6PlusKey: string;
  lpcKey: string;
  opponentKey: string;
  showLabels?: boolean;
}

export const PassStrLengthChart: React.FC<PassStrLengthChartProps> = ({
  data,
  passStrings35Key,
  passStrings6PlusKey,
  lpcKey,
  opponentKey,
  showLabels = false,
}) => {
  const chartData = data.map((match) => ({
    name: match[opponentKey] || 'Opponent',
    '3-5 Pass Strings': typeof match[passStrings35Key] === 'number' ? match[passStrings35Key] : null,
    '6+ Pass Strings': typeof match[passStrings6PlusKey] === 'number' ? match[passStrings6PlusKey] : null,
    'LPC': typeof match[lpcKey] === 'number' ? match[lpcKey] : null,
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-2 text-gray-800">Pass Strings Overview</h3>
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
          <Bar dataKey="3-5 Pass Strings" fill={JOGA_COLORS.voltYellow} animationDuration={500}>
            {showLabels && <LabelList dataKey="3-5 Pass Strings" position="top" fill="#666" fontSize={12} />}
          </Bar>
          <Bar dataKey="6+ Pass Strings" fill={JOGA_COLORS.valorBlue} animationDuration={500}>
            {showLabels && <LabelList dataKey="6+ Pass Strings" position="top" fill="#666" fontSize={12} />}
          </Bar>
          <Bar dataKey="LPC" fill={JOGA_COLORS.voltYellow} animationDuration={500}>
            {showLabels && <LabelList dataKey="LPC" position="top" fill="#666" fontSize={12} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

