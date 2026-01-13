/**
 * Report configuration for pre-defined filter sets
 * This structure allows for future expansion with custom report types
 */

export interface ReportFilter {
  id: string;
  name: string;
  description: string;
  columnGroups: string[][]; // Groups of related columns to show together
  category: 'shooting' | 'passing' | 'defensive' | 'possession' | 'setPieces' | 'general';
}

export const PREDEFINED_REPORTS: ReportFilter[] = [
  {
    id: 'shooting',
    name: 'Shooting Report',
    description: 'Focus on shooting statistics including shots, goals, xG, and conversion rates',
    columnGroups: [
      ['shot', 'shots', 'shooting'],
      ['goal', 'goals'],
      ['xg', 'expected goals'],
      ['conversion', 'conversion rate'],
      ['shot on target', 'sot'],
    ],
    category: 'shooting',
  },
  {
    id: 'passing',
    name: 'Passing Report',
    description: 'Analyze passing statistics including pass accuracy, completions, and assists',
    columnGroups: [
      ['pass', 'passes', 'passing'],
      ['pass accuracy', 'pass%', 'completion%'],
      ['assist', 'assists'],
      ['pass completed', 'passes completed'],
    ],
    category: 'passing',
  },
  {
    id: 'defensive',
    name: 'Defensive Report',
    description: 'Review defensive metrics including tackles, interceptions, and clearances',
    columnGroups: [
      ['tackle', 'tackles'],
      ['intercept', 'interceptions'],
      ['clearance', 'clearances'],
      ['block', 'blocks'],
      ['defensive'],
    ],
    category: 'defensive',
  },
  {
    id: 'possession',
    name: 'Possession Report',
    description: 'Examine possession and ball control statistics',
    columnGroups: [
      ['possession', 'poss'],
      ['touch', 'touches'],
      ['pass', 'passes'],
    ],
    category: 'possession',
  },
  {
    id: 'setPieces',
    name: 'Set Pieces Report',
    description: 'Analyze set piece statistics including corners, free kicks, and penalties',
    columnGroups: [
      ['corner', 'corners'],
      ['free kick', 'freekick'],
      ['penalty', 'penalties'],
    ],
    category: 'setPieces',
  },
];

/**
 * Matches columns to a report filter
 */
export function getColumnsForReport(report: ReportFilter, availableColumns: string[]): string[] {
  const matchedColumns: string[] = [];
  
  report.columnGroups.forEach(group => {
    group.forEach(pattern => {
      availableColumns.forEach(col => {
        const colLower = col.toLowerCase();
        if (colLower.includes(pattern.toLowerCase()) && !matchedColumns.includes(col)) {
          matchedColumns.push(col);
        }
      });
    });
  });
  
  return matchedColumns;
}








