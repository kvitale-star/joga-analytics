import { MatchData } from '../types';

/**
 * Analyzes which matches/opponents are missing data for specific columns
 */
export interface MissingDataInfo {
  missingColumns: string[];
  affectedMatches: number;
  affectedOpponents: string[];
  completenessPercentage: number;
}

/**
 * Gets missing data information for a set of required columns
 */
export function getMissingDataInfo(
  data: MatchData[],
  requiredColumns: string[],
  opponentKey: string
): MissingDataInfo {
  if (data.length === 0 || requiredColumns.length === 0) {
    return {
      missingColumns: [],
      affectedMatches: 0,
      affectedOpponents: [],
      completenessPercentage: 100,
    };
  }

  const matchesWithMissingData = new Set<number>();
  const opponentsWithMissingData = new Set<string>();
  const columnsWithSomeData = new Set<string>();

  // First pass: identify which columns have any data at all
  requiredColumns.forEach(col => {
    const hasAnyData = data.some(match => {
      const value = match[col];
      return value !== undefined && value !== null && value !== '' && !isNaN(Number(value));
    });
    if (hasAnyData) {
      columnsWithSomeData.add(col);
    }
  });

  // Second pass: find matches and opponents with missing data for columns that exist
  data.forEach((match, index) => {
    let hasMissingData = false;
    
    requiredColumns.forEach(col => {
      // Only check columns that have some data (exist in the dataset)
      if (columnsWithSomeData.has(col)) {
        const value = match[col];
        const isMissing = value === undefined || value === null || value === '' || isNaN(Number(value));
        if (isMissing) {
          hasMissingData = true;
        }
      }
    });

    if (hasMissingData) {
      matchesWithMissingData.add(index);
      const opponent = match[opponentKey];
      if (opponent && typeof opponent === 'string') {
        opponentsWithMissingData.add(opponent);
      }
    }
  });

  // Calculate completeness
  const totalPossible = columnsWithSomeData.size * data.length;
  let totalMissing = 0;

  data.forEach(match => {
    requiredColumns.forEach(col => {
      if (columnsWithSomeData.has(col)) {
        const value = match[col];
        const isMissing = value === undefined || value === null || value === '' || isNaN(Number(value));
        if (isMissing) {
          totalMissing++;
        }
      }
    });
  });

  const completenessPercentage = totalPossible > 0 
    ? Math.round(((totalPossible - totalMissing) / totalPossible) * 100)
    : 100;

  // Missing columns are those that don't exist at all in the dataset
  const missingColumns = requiredColumns.filter(col => !columnsWithSomeData.has(col));

  return {
    missingColumns,
    affectedMatches: matchesWithMissingData.size,
    affectedOpponents: Array.from(opponentsWithMissingData).sort(),
    completenessPercentage,
  };
}

