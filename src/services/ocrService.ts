/**
 * OCR Service
 * 
 * Handles image upload and OCR processing to extract statistics from screenshots
 */

import { createWorker, Worker } from 'tesseract.js';

export interface ExtractedStat {
  fieldName: string;
  value: number;
  confidence: number;
}

/**
 * Extract text from image using Tesseract.js OCR
 */
async function extractTextFromImage(imageFile: File): Promise<string> {
  const worker = await createWorker('eng');
  
  try {
    const { data: { text } } = await worker.recognize(imageFile);
    return text;
  } finally {
    await worker.terminate();
  }
}

/**
 * Parse OCR text to extract statistics
 * Looks for patterns like "Goal: 3" or "Possession %: 70%"
 */
function parseStatsFromOCR(ocrText: string, period: '1st' | '2nd' = '1st'): Record<string, number> {
  const stats: Record<string, number> = {};
  const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Common stat name mappings
  const statMappings: Record<string, string[]> = {
    'Goal': ['goal', 'goals', 'g'],
    'Shot': ['shot', 'shots', 's'],
    'Possession %': ['possession %', 'possession', 'poss %', 'poss'],
    'Total attempts': ['total attempts', 'attempts', 'total'],
    'Corner': ['corner', 'corners', 'c'],
    'Free kick': ['free kick', 'freekick', 'fk', 'free kicks'],
    'Passes completed': ['passes completed', 'passes', 'pass'],
    'Penalty': ['penalty', 'penalties', 'pen'],
    'Possession minutes': ['possession minutes', 'poss minutes', 'poss mins', 'possession mins'],
    'Possession won': ['possession won', 'poss won', 'possessions won'],
    'Throw-in': ['throw-in', 'throw in', 'throwin', 'ti'],
  };
  
  // Process each line
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Try to match each stat type
    for (const [statName, patterns] of Object.entries(statMappings)) {
      for (const pattern of patterns) {
        // Look for pattern followed by colon and number, or just number after stat name
        const regex1 = new RegExp(`${pattern}\\s*[:]?\\s*(\\d+)`, 'i');
        const regex2 = new RegExp(`${pattern}\\s+(\\d+)`, 'i');
        const regex3 = new RegExp(`(\\d+)\\s*${pattern}`, 'i');
        
        let match = line.match(regex1) || line.match(regex2) || line.match(regex3);
        
        if (match) {
          const value = parseInt(match[1], 10);
          if (!isNaN(value)) {
            // Determine if it's team or opponent stat based on position
            // In the image, team is on left, opponent on right
            // We'll need to detect which value belongs to which team
            
            // For now, assume first number is team, second is opponent
            // This will need refinement based on actual OCR output format
            
            // Map to form field names
            const fieldName = mapStatToFieldName(statName, period);
            if (fieldName && !stats[fieldName]) {
              stats[fieldName] = value;
            }
          }
        }
      }
    }
  }
  
  return stats;
}

/**
 * Map stat name to form field name
 */
function mapStatToFieldName(statName: string, period: '1st' | '2nd'): string | null {
  const periodSuffix = period === '1st' ? ' (1st Half)' : ' (2nd Half)';
  
  const mappings: Record<string, string> = {
    'Goal': `Goals For${periodSuffix}`,
    'Shot': `Shots For${periodSuffix}`,
    'Possession %': `Possession${periodSuffix}`,
    'Total attempts': `Attempts For${periodSuffix}`,
    'Corner': `Corners For${periodSuffix}`,
    'Free kick': `Free Kicks For${periodSuffix}`,
    'Passes completed': `Passes For${periodSuffix}`,
    'Penalty': `Penalty For${periodSuffix}`,
    'Possession minutes': `Possession Mins${periodSuffix}`,
    'Possession won': `Possessions Won${periodSuffix}`,
    'Throw-in': `Throw-in${periodSuffix}`,
  };
  
  return mappings[statName] || null;
}

/**
 * Extract statistics from uploaded image
 */
export async function extractStatsFromImage(
  imageFile: File,
  period: '1st' | '2nd' = '1st'
): Promise<Record<string, number>> {
  try {
    // Extract text from image
    const ocrText = await extractTextFromImage(imageFile);
    
    // Parse text to extract stats
    const stats = parseStatsFromOCR(ocrText, period);
    
    return stats;
  } catch (error) {
    console.error('Error extracting stats from image:', error);
    throw new Error('Failed to extract statistics from image. Please ensure the image is clear and contains readable text.');
  }
}

/**
 * Enhanced parsing that handles team/opponent separation
 * Based on the image format: Team on left, Opponent on right
 */
export function parseStatsWithTeamSeparation(ocrText: string, period: '1st' | '2nd' = '1st'): {
  teamStats: Record<string, number>;
  opponentStats: Record<string, number>;
} {
  const teamStats: Record<string, number> = {};
  const opponentStats: Record<string, number> = {};
  
  const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Pattern: Stat name, then team value, then opponent value
  // Example: "Goal: 3, 0" or "Goal 3 0" or "Goal: B14: 3, TITANS: 0"
  
  for (const line of lines) {
    // Try to extract stat name and both values
    // Look for patterns like:
    // - "Goal: 3, 0"
    // - "Goal 3 0"
    // - "Goal B14: 3 TITANS: 0"
    
    const statPatterns = [
      /(goal|shot|possession|attempt|corner|free\s*kick|pass|penalty|throw|won|minutes?)/i,
    ];
    
    // Extract numbers from line
    const numbers = line.match(/\d+/g);
    
    if (numbers && numbers.length >= 2) {
      // Assume first number is team, second is opponent
      const teamValue = parseInt(numbers[0], 10);
      const opponentValue = parseInt(numbers[1], 10);
      
      // Try to identify which stat this is
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('goal')) {
        const fieldName = mapStatToFieldName('Goal', period);
        if (fieldName) {
          teamStats[fieldName] = teamValue;
          opponentStats[fieldName.replace('For', 'Against')] = opponentValue;
        }
      } else if (lowerLine.includes('shot')) {
        const fieldName = mapStatToFieldName('Shot', period);
        if (fieldName) {
          teamStats[fieldName] = teamValue;
          opponentStats[fieldName.replace('For', 'Against')] = opponentValue;
        }
      } else if (lowerLine.includes('possession') && lowerLine.includes('%')) {
        const fieldName = mapStatToFieldName('Possession %', period);
        if (fieldName) {
          teamStats[fieldName] = teamValue;
          opponentStats[fieldName.replace('Possession', 'Opp Possession')] = opponentValue;
        }
      } else if (lowerLine.includes('attempt')) {
        const fieldName = mapStatToFieldName('Total attempts', period);
        if (fieldName) {
          teamStats[fieldName] = teamValue;
          opponentStats[fieldName.replace('For', 'Against')] = opponentValue;
        }
      } else if (lowerLine.includes('corner')) {
        const fieldName = mapStatToFieldName('Corner', period);
        if (fieldName) {
          teamStats[fieldName] = teamValue;
          opponentStats[fieldName.replace('For', 'Against')] = opponentValue;
        }
      } else if (lowerLine.includes('free') && lowerLine.includes('kick')) {
        const fieldName = mapStatToFieldName('Free kick', period);
        if (fieldName) {
          teamStats[fieldName] = teamValue;
          opponentStats[fieldName.replace('For', 'Against')] = opponentValue;
        }
      } else if (lowerLine.includes('pass')) {
        const fieldName = mapStatToFieldName('Passes completed', period);
        if (fieldName) {
          teamStats[fieldName] = teamValue;
          opponentStats[fieldName.replace('For', 'Against')] = opponentValue;
        }
      } else if (lowerLine.includes('penalty')) {
        const fieldName = mapStatToFieldName('Penalty', period);
        if (fieldName) {
          teamStats[fieldName] = teamValue;
          opponentStats[fieldName.replace('For', 'Against')] = opponentValue;
        }
      } else if (lowerLine.includes('possession') && lowerLine.includes('minute')) {
        const fieldName = mapStatToFieldName('Possession minutes', period);
        if (fieldName) {
          teamStats[fieldName] = teamValue;
          opponentStats[fieldName.replace('Possession', 'Opp Possession')] = opponentValue;
        }
      } else if (lowerLine.includes('possession') && lowerLine.includes('won')) {
        const fieldName = mapStatToFieldName('Possession won', period);
        if (fieldName) {
          teamStats[fieldName] = teamValue;
          opponentStats[fieldName.replace('Possessions Won', 'Opp Possessions Won')] = opponentValue;
        }
      } else if (lowerLine.includes('throw')) {
        const fieldName = mapStatToFieldName('Throw-in', period);
        if (fieldName) {
          teamStats[fieldName] = teamValue;
          opponentStats[fieldName.replace('Throw-in', 'Opp Throw-in')] = opponentValue;
        }
      }
    }
  }
  
  return { teamStats, opponentStats };
}
