import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS, OPPONENT_COLORS } from '../utils/colors';

interface MiscStatsChartProps {
  data: MatchData[];
  cornersForKey: string;
  cornersAgainstKey: string;
  freeKickForKey: string;
  freeKickAgainstKey: string;
  opponentKey: string;
  showLabels?: boolean;
}

export const MiscStatsChart: React.FC<MiscStatsChartProps> = ({
  data,
  cornersForKey,
  cornersAgainstKey,
  freeKickForKey,
  freeKickAgainstKey,
  opponentKey,
  showLabels = false,
}) => {
  const chartData = data.map((match) => ({
    name: match[opponentKey] || 'Opponent',
    'Corners For': typeof match[cornersForKey] === 'number' ? match[cornersForKey] : 0,
    'Corners Against': typeof match[cornersAgainstKey] === 'number' ? match[cornersAgainstKey] : 0,
    'Free Kick For': typeof match[freeKickForKey] === 'number' ? match[freeKickForKey] : 0,
    'Free Kick Against': typeof match[freeKickAgainstKey] === 'number' ? match[freeKickAgainstKey] : 0,
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-2 text-gray-800">Corners & Free Kicks</h3>
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
          <Bar dataKey="Corners For" fill={JOGA_COLORS.voltYellow} animationDuration={500}>
            {showLabels && <LabelList dataKey="Corners For" position="top" fill="#666" fontSize={12} />}
          </Bar>
          <Bar dataKey="Corners Against" fill={OPPONENT_COLORS.primary} animationDuration={500}>
            {showLabels && <LabelList dataKey="Corners Against" position="top" fill="#666" fontSize={12} />}
          </Bar>
          <Bar dataKey="Free Kick For" fill={JOGA_COLORS.valorBlue} animationDuration={500}>
            {showLabels && <LabelList dataKey="Free Kick For" position="top" fill="#666" fontSize={12} />}
          </Bar>
          <Bar dataKey="Free Kick Against" fill={OPPONENT_COLORS.secondary} animationDuration={500}>
            {showLabels && <LabelList dataKey="Free Kick Against" position="top" fill="#666" fontSize={12} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

