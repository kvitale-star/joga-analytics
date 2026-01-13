import React from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { MatchData } from '../types';
import { ChartConfig, getPairTitle } from '../utils/chartUtils';
import { JOGA_COLORS, OPPONENT_COLORS, isJogaTeamData } from '../utils/colors';

interface AutoChartProps {
  data: MatchData[];
  columnKey: string;
  opponentKey: string;
  config: ChartConfig;
  pairColumnKey?: string; // For combo charts (e.g., "Shots For" and "Shots Against")
  showLabels?: boolean;
}

export const AutoChart: React.FC<AutoChartProps> = ({
  data,
  columnKey,
  opponentKey,
  config,
  pairColumnKey,
  showLabels = false,
}) => {
  const chartData = data.map((match) => {
    const base: any = {
      name: match[opponentKey] || 'Opponent',
    };
    
    base[columnKey] = typeof match[columnKey] === 'number' ? match[columnKey] : 0;
    
    if (pairColumnKey) {
      base[pairColumnKey] = typeof match[pairColumnKey] === 'number' ? match[pairColumnKey] : 0;
    }
    
    return base;
  });

  // Debug logging for combo charts (removed for production)

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 30, bottom: 10 },
    };

    switch (config.type) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <Legend 
              verticalAlign="top" 
              align="center" 
              wrapperStyle={{ paddingBottom: '15px', color: '#1f2937' }}
              formatter={(value: string) => value.trim()}
            />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
            <YAxis domain={config.domain} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#111827',
                color: '#ffffff',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '12px'
              }}
            />
            <Bar dataKey={columnKey} fill={config.color} name={config.title} animationDuration={500}>
              {showLabels && <LabelList dataKey={columnKey} position="top" fill="#666" fontSize={12} />}
            </Bar>
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <Legend 
              verticalAlign="top" 
              align="center" 
              wrapperStyle={{ paddingBottom: '15px', color: '#1f2937' }}
              formatter={(value: string) => value.trim()}
            />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
            <YAxis domain={config.domain || ['auto', 'auto']} label={{ value: config.yAxisLabel, angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#111827',
                color: '#ffffff',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '12px'
              }}
            />
            <Line type="monotone" dataKey={columnKey} stroke={config.color} strokeWidth={2} name={config.title} />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <Legend 
              verticalAlign="top" 
              align="center" 
              wrapperStyle={{ paddingBottom: '15px', color: '#1f2937' }}
              formatter={(value: string) => value.trim()}
            />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
            <YAxis domain={config.domain || ['auto', 'auto']} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#111827',
                color: '#ffffff',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '12px'
              }}
            />
            <Area type="monotone" dataKey={columnKey} stroke={config.color} fill={config.color} fillOpacity={0.6} name={config.title} />
          </AreaChart>
        );

      case 'combo':
        if (!pairColumnKey) {
          // Fallback to bar if no pair
          return (
            <BarChart {...commonProps}>
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
              <Bar dataKey={columnKey} fill={config.color} name={config.title} animationDuration={500}>
                {showLabels && <LabelList dataKey={columnKey} position="top" fill="#666" fontSize={12} />}
              </Bar>
            </BarChart>
          );
        }
        
        // Combo chart with both columns - use BarChart for grouped bars
        // Use full column names for legend labels
        const forLabel = columnKey;
        const againstLabel = pairColumnKey;
        
        // Determine colors: JOGA team gets brand colors (voltYellow first), opponent gets gray
        const forColor = isJogaTeamData(columnKey, columnKey) ? JOGA_COLORS.voltYellow : config.color;
        const againstColor = isJogaTeamData(pairColumnKey, pairColumnKey) ? JOGA_COLORS.voltYellow : OPPONENT_COLORS.primary;
        
        return (
          <BarChart {...commonProps}>
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
            <Bar dataKey={columnKey} fill={forColor} name={forLabel} animationDuration={500}>
              {showLabels && <LabelList dataKey={columnKey} position="top" fill="#666" fontSize={12} />}
            </Bar>
            <Bar dataKey={pairColumnKey} fill={againstColor} name={againstLabel} animationDuration={500}>
              {showLabels && <LabelList dataKey={pairColumnKey} position="top" fill="#666" fontSize={12} />}
            </Bar>
          </BarChart>
        );

      default:
        return (
          <BarChart {...commonProps}>
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
            <Bar dataKey={columnKey} fill={config.color} name={config.title} animationDuration={500}>
              {showLabels && <LabelList dataKey={columnKey} position="top" fill="#666" fontSize={12} />}
            </Bar>
          </BarChart>
        );
    }
  };

  // Use combined title for paired columns
  const displayTitle = pairColumnKey ? getPairTitle(columnKey, pairColumnKey) : config.title;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-800">{displayTitle}</h3>
      <ResponsiveContainer width="100%" height={400}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

