/**
 * OCR Service (using Gemini Vision API)
 * 
 * Handles image upload and stat extraction from screenshots using Gemini vision
 */

import { apiPost } from './apiClient.js';

/**
 * Convert File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.replace(/^data:image\/[a-z]+;base64,/, '');
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Extract stats from image using Gemini vision API
 * @param imageFile Image file to process
 * @param period '1st' or '2nd' half
 * @returns Object with teamStats and opponentStats
 */
export async function extractStatsFromImage(
  imageFile: File,
  period: '1st' | '2nd' = '1st'
): Promise<{
  teamStats: Record<string, number>;
  opponentStats: Record<string, number>;
}> {
  try {
    // Convert image to base64
    const imageBase64 = await fileToBase64(imageFile);
    
    // Get MIME type from file
    const mimeType = imageFile.type || 'image/png';
    
    // Call backend API to extract stats using Gemini
    const result = await apiPost<{ stats: Record<string, number> }>('/ai/extract-stats', {
      imageBase64,
      mimeType,
      period,
    });
    
    // Separate team and opponent stats
    const teamStats: Record<string, number> = {};
    const opponentStats: Record<string, number> = {};
    
    for (const [fieldName, value] of Object.entries(result.stats)) {
      const lowerName = fieldName.toLowerCase();
      
      // Check if it's an opponent stat
      if (lowerName.includes('opp ') || lowerName.includes('opponent') || lowerName.includes('against')) {
        opponentStats[fieldName] = value;
      } else {
        teamStats[fieldName] = value;
      }
    }
    
    return { teamStats, opponentStats };
  } catch (error) {
    console.error('📸 Error extracting stats from image:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to extract statistics from image. Please ensure the image is clear and contains readable text.');
  }
}

/**
 * Legacy function for compatibility - now returns empty string since we don't extract raw text
 * @deprecated Use extractStatsFromImage instead
 */
export async function extractTextFromImage(imageFile: File): Promise<string> {
  console.warn('extractTextFromImage is deprecated. Use extractStatsFromImage instead.');
  const { teamStats, opponentStats } = await extractStatsFromImage(imageFile);
  // Return a simple representation for debugging
  return JSON.stringify({ teamStats, opponentStats }, null, 2);
}

/**
 * Legacy function for compatibility - now just returns the stats directly
 * @deprecated Use extractStatsFromImage instead
 */
export function parseStatsWithTeamSeparation(
  stats: Record<string, number>,
  _period: '1st' | '2nd' = '1st'
): {
  teamStats: Record<string, number>;
  opponentStats: Record<string, number>;
} {
  console.warn('parseStatsWithTeamSeparation is deprecated. extractStatsFromImage now returns separated stats directly.');
  
  const teamStats: Record<string, number> = {};
  const opponentStats: Record<string, number> = {};
  
  for (const [fieldName, value] of Object.entries(stats)) {
    const lowerName = fieldName.toLowerCase();
    
    if (lowerName.includes('opp ') || lowerName.includes('opponent') || lowerName.includes('against')) {
      opponentStats[fieldName] = value;
    } else {
      teamStats[fieldName] = value;
    }
  }
  
  return { teamStats, opponentStats };
}
