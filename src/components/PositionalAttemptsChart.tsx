import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS, OPPONENT_COLORS } from '../utils/colors';

interface PositionalAttemptsChartProps {
  data: MatchData[];
  insideBoxAttemptsPctKey: string;
  outsideBoxAttemptsPctKey: string;
  oppInsideBoxAttemptsPctKey: string;
  oppOutsideBoxAttemptsPctKey: string;
  opponentKey: string;
  showLabels?: boolean;
}

export const PositionalAttemptsChart: React.FC<PositionalAttemptsChartProps> = ({
  data,
  insideBoxAttemptsPctKey,
  outsideBoxAttemptsPctKey,
  oppInsideBoxAttemptsPctKey,
  oppOutsideBoxAttemptsPctKey,
  opponentKey,
  showLabels = false,
}) => {
  const chartData = data.map((match) => ({
    name: match[opponentKey] || 'Opponent',
    'Team Inside Box': typeof match[insideBoxAttemptsPctKey] === 'number' ? match[insideBoxAttemptsPctKey] : null,
    'Team Outside Box': typeof match[outsideBoxAttemptsPctKey] === 'number' ? match[outsideBoxAttemptsPctKey] : null,
    'Opp Inside Box': typeof match[oppInsideBoxAttemptsPctKey] === 'number' ? match[oppInsideBoxAttemptsPctKey] : null,
    'Opp Outside Box': typeof match[oppOutsideBoxAttemptsPctKey] === 'number' ? match[oppOutsideBoxAttemptsPctKey] : null,
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-2 text-gray-800">Attempts by Field Position</h3>
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
          <Bar dataKey="Team Inside Box" fill={JOGA_COLORS.voltYellow} animationDuration={500}>
            {showLabels && <LabelList dataKey="Team Inside Box" position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
          </Bar>
          <Bar dataKey="Team Outside Box" fill={JOGA_COLORS.valorBlue} animationDuration={500}>
            {showLabels && <LabelList dataKey="Team Outside Box" position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
          </Bar>
          <Bar dataKey="Opp Inside Box" fill={OPPONENT_COLORS.primary} animationDuration={500}>
            {showLabels && <LabelList dataKey="Opp Inside Box" position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
          </Bar>
          <Bar dataKey="Opp Outside Box" fill={OPPONENT_COLORS.secondary} animationDuration={500}>
            {showLabels && <LabelList dataKey="Opp Outside Box" position="top" fill="#666" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

