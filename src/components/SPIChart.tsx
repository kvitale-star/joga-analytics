import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { MatchData } from '../types';
import { JOGA_COLORS, OPPONENT_COLORS } from '../utils/colors';

interface SPIChartProps {
  data: MatchData[];
  spiKey: string;
  spiWKey: string;
  oppSpiKey: string;
  oppSpiWKey: string;
  opponentKey: string;
  showLabels?: boolean;
}

export const SPIChart: React.FC<SPIChartProps> = ({
  data,
  spiKey,
  spiWKey,
  oppSpiKey,
  oppSpiWKey,
  opponentKey,
  showLabels = false,
}) => {
  const chartData = data.map((match) => ({
    name: match[opponentKey] || 'Opponent',
    'SPI': typeof match[spiKey] === 'number' ? match[spiKey] : null,
    'SPI (w)': typeof match[spiWKey] === 'number' ? match[spiWKey] : null,
    'Opp SPI': typeof match[oppSpiKey] === 'number' ? match[oppSpiKey] : null,
    'Opp SPI (w)': typeof match[oppSpiWKey] === 'number' ? match[oppSpiWKey] : null,
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-2 text-gray-800">Sustained Passing Index</h3>
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
          <Bar dataKey="SPI" fill={JOGA_COLORS.voltYellow} animationDuration={500}>
            {showLabels && <LabelList dataKey="SPI" position="top" fill="#666" fontSize={12} />}
          </Bar>
          <Bar dataKey="SPI (w)" fill={JOGA_COLORS.valorBlue} animationDuration={500}>
            {showLabels && <LabelList dataKey="SPI (w)" position="top" fill="#666" fontSize={12} />}
          </Bar>
          <Bar dataKey="Opp SPI" fill={OPPONENT_COLORS.primary} animationDuration={500}>
            {showLabels && <LabelList dataKey="Opp SPI" position="top" fill="#666" fontSize={12} />}
          </Bar>
          <Bar dataKey="Opp SPI (w)" fill={OPPONENT_COLORS.secondary} animationDuration={500}>
            {showLabels && <LabelList dataKey="Opp SPI (w)" position="top" fill="#666" fontSize={12} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};


