import React from 'react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, PieChart, Pie, Cell
} from 'recharts';

// Multiple gray shades for the fake data
const GRAY_SHADES = [
  '#9ca3af', // gray-400
  '#6b7280', // gray-500
  '#4b5563', // gray-600
  '#374151', // gray-700
  '#9ca3af', // gray-400
  '#6b7280', // gray-500
  '#4b5563', // gray-600
];

// Generate fake data with more points
const generateFakeData = (count: number = 12) => {
  return Array.from({ length: count }, (_, i) => ({
    name: `Item ${i + 1}`,
    value: Math.floor(Math.random() * 50) + 10,
    value2: Math.floor(Math.random() * 50) + 10,
    value3: Math.floor(Math.random() * 50) + 10,
  }));
};

interface EmptyChartOptionProps {
  height?: number;
}

export const EmptyChartOption1: React.FC<EmptyChartOptionProps> = ({ height = 400 }) => {
  const data = generateFakeData(8);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 30, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip />
        <Bar dataKey="value" fill={GRAY_SHADES[0]}  />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const EmptyChartOption2: React.FC<EmptyChartOptionProps> = ({ height = 400 }) => {
  const data = generateFakeData(12);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 30, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke={GRAY_SHADES[1]} strokeWidth={2}  />
        <Line type="monotone" dataKey="value2" stroke={GRAY_SHADES[2]} strokeWidth={2}  />
      </LineChart>
    </ResponsiveContainer>
  );
};

export const EmptyChartOption3: React.FC<EmptyChartOptionProps> = ({ height = 400 }) => {
  const data = generateFakeData(10);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 30, left: 30, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip />
        <Area type="monotone" dataKey="value" stroke={GRAY_SHADES[0]} fill={GRAY_SHADES[0]} fillOpacity={0.3}  />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export const EmptyChartOption4: React.FC<EmptyChartOptionProps> = ({ height = 400 }) => {
  const data = generateFakeData(15);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 5, right: 30, left: 30, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip />
        <Bar dataKey="value" fill={GRAY_SHADES[1]}  />
        <Line type="monotone" dataKey="value2" stroke={GRAY_SHADES[3]} strokeWidth={2}  />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export const EmptyChartOption5: React.FC<EmptyChartOptionProps> = ({ height = 400 }) => {
  const data = generateFakeData(8);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 30, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip />
        <Bar dataKey="value" fill={GRAY_SHADES[2]}  />
        <Bar dataKey="value2" fill={GRAY_SHADES[4]}  />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const EmptyChartOption6: React.FC<EmptyChartOptionProps> = ({ height = 400 }) => {
  const data = generateFakeData(10);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 30, left: 30, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip />
        <Area type="monotone" dataKey="value" stackId="1" stroke={GRAY_SHADES[0]} fill={GRAY_SHADES[0]} fillOpacity={0.4}  />
        <Area type="monotone" dataKey="value2" stackId="1" stroke={GRAY_SHADES[1]} fill={GRAY_SHADES[1]} fillOpacity={0.4}  />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export const EmptyChartOption7: React.FC<EmptyChartOptionProps> = ({ height = 400 }) => {
  const data = generateFakeData(14);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 30, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke={GRAY_SHADES[0]} strokeWidth={1.5}  />
        <Line type="monotone" dataKey="value2" stroke={GRAY_SHADES[2]} strokeWidth={1.5}  />
        <Line type="monotone" dataKey="value3" stroke={GRAY_SHADES[4]} strokeWidth={1.5}  />
      </LineChart>
    </ResponsiveContainer>
  );
};

export const EmptyChartOption8: React.FC<EmptyChartOptionProps> = ({ height = 400 }) => {
  const data = generateFakeData(12);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 5, right: 30, left: 30, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip />
        <Area type="monotone" dataKey="value" stroke={GRAY_SHADES[1]} fill={GRAY_SHADES[1]} fillOpacity={0.2}  />
        <Bar dataKey="value2" fill={GRAY_SHADES[3]}  />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export const EmptyChartOption9: React.FC<EmptyChartOptionProps> = ({ height = 400 }) => {
  const data = generateFakeData(9);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 30, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip />
        <Bar dataKey="value" fill={GRAY_SHADES[0]}  />
        <Bar dataKey="value2" fill={GRAY_SHADES[2]}  />
        <Bar dataKey="value3" fill={GRAY_SHADES[4]}  />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const EmptyChartOption10: React.FC<EmptyChartOptionProps> = ({ height = 400 }) => {
  const data = generateFakeData(11);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 30, left: 30, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip />
        <Area type="monotone" dataKey="value" stroke={GRAY_SHADES[1]} fill={GRAY_SHADES[1]} fillOpacity={0.3}  />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export const EmptyChartOption11: React.FC<EmptyChartOptionProps> = ({ height = 400 }) => {
  const data = generateFakeData(8);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 30, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip />
        <Bar dataKey="value" stackId="1" fill={GRAY_SHADES[0]}  />
        <Bar dataKey="value2" stackId="1" fill={GRAY_SHADES[2]}  />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const EmptyChartOption12: React.FC<EmptyChartOptionProps> = ({ height = 400 }) => {
  const data = generateFakeData(13);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 5, right: 30, left: 30, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip />
        <Bar dataKey="value" fill={GRAY_SHADES[1]}  />
        <Line type="monotone" dataKey="value2" stroke={GRAY_SHADES[3]} strokeWidth={2}  />
        <Area type="monotone" dataKey="value3" stroke={GRAY_SHADES[5]} fill={GRAY_SHADES[5]} fillOpacity={0.15}  />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export const EmptyChartOption13: React.FC<EmptyChartOptionProps> = ({ height = 400 }) => {
  const data = generateFakeData(10);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 30, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke={GRAY_SHADES[0]} strokeWidth={2}  />
      </LineChart>
    </ResponsiveContainer>
  );
};

// Export all options as an array for easy access
export const EMPTY_CHART_OPTIONS = [
  EmptyChartOption1,
  EmptyChartOption2,
  EmptyChartOption3,
  EmptyChartOption4,
  EmptyChartOption5,
  EmptyChartOption6,
  EmptyChartOption7,
  EmptyChartOption8,
  EmptyChartOption9,
  EmptyChartOption10,
  EmptyChartOption11,
  EmptyChartOption12,
  EmptyChartOption13,
];
