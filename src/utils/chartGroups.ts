/**
 * Chart groups for organizing dashboard visualizations
 */

export type ChartType = 
  | 'shots'
  | 'goals'
  | 'possession'
  | 'xg'
  | 'spi'
  | 'conversionRate'
  | 'attempts'
  | 'positionalAttempts'
  | 'miscStats'
  | 'passes'
  | 'avgPassLength'
  | 'passStrLength'
  | 'passingSPI'
  | 'passByZone'
  | 'ppm'
  | 'passShare'
  | 'tsr'
  | 'auto'
  | 'customCharts';

export interface ChartGroup {
  id: string;
  name: string;
  description: string;
  charts: ChartType[];
}

export const CHART_GROUPS: ChartGroup[] = [
  {
    id: 'all',
    name: 'All Charts',
    description: 'Show all available charts',
    charts: ['shots', 'possession', 'xg', 'spi', 'conversionRate', 'positionalAttempts'],
  },
  {
    id: 'defense',
    name: 'Defense',
    description: 'Defensive metrics and statistics',
    charts: [], // Defense charts will be added when specific defensive metrics are implemented
  },
  {
    id: 'passing',
    name: 'Passing',
    description: 'Pass strings and passing metrics',
    charts: ['passes', 'avgPassLength', 'passStrLength', 'passingSPI', 'passByZone', 'ppm', 'passShare'],
  },
  {
    id: 'performance',
    name: 'JOGA Metrics',
    description: 'SPI and overall team performance indicators',
    charts: ['spi', 'possession'], // SPI and Possession metrics
  },
  {
    id: 'possession',
    name: 'Possession',
    description: 'Possession and ball control metrics',
    charts: ['possession'],
  },
  {
    id: 'shooting',
    name: 'Shooting',
    description: 'Shots, goals, xG, and conversion rates',
    charts: ['shots', 'xg', 'tsr', 'conversionRate', 'positionalAttempts'],
  },
];

export const CHART_LABELS: Record<ChartType, string> = {
  shots: 'Shots',
  goals: 'Goals',
  possession: 'Possession',
  xg: 'Expected Goals (xG)',
  spi: 'Sustained Passing Index',
  conversionRate: 'Conversion Rates',
  attempts: 'Attempts',
  positionalAttempts: 'Conversion Rates & Attempts by Field Position',
  miscStats: 'Corners & Free Kicks',
  passes: 'Passes per Game',
  avgPassLength: 'Average Pass Length',
  passStrLength: 'Pass Strings Overview',
  passingSPI: 'Passing SPI',
  passByZone: 'Pass % by Zone',
  ppm: 'Passes Per Minute',
  tsr: 'Total Shots Ratio',
  passShare: 'Pass Share',
  auto: 'Auto Charts', // Not shown in dropdown currently
  customCharts: 'Custom Charts',
};

