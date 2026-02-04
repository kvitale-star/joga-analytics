/**
 * Backend AI Service
 * Handles AI API calls using backend credentials
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

// Initialize Gemini with API key from environment
function initializeGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && !genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Chat with AI using Gemini
 * @param message User's question
 * @param context Pre-formatted context string (includes match data and system prompt)
 */
export async function chatWithAI(
  message: string,
  context: string
): Promise<string> {
  const gemini = initializeGemini();

  if (!gemini) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  try {
    // Use Gemini 2.5 Flash (latest stable version as of 2025)
    // If unavailable, API will return an error and can be handled
    const model = gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Use the pre-formatted context from frontend (includes system prompt and match data)
    const prompt = context || `You are a helpful soccer analytics assistant. You help coaches analyze match data.

User's question: ${message}

Please provide a helpful response.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return text;
  } catch (error: any) {
    console.error('AI service error:', error);
    if (error.message?.includes('API_KEY')) {
      throw new Error('Invalid or missing Gemini API key');
    }
    throw new Error(`AI service error: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Format match data into a readable string for the AI
 */
function formatMatchDataForAI(data: any[], columnKeys: string[]): string {
  if (data.length === 0) {
    return 'No match data available.';
  }

  const sample = data[0];
  const availableColumns = columnKeys.filter(key => {
    const value = sample[key];
    return value !== undefined && value !== null && value !== '';
  });

  let formatted = `Total matches: ${data.length}\n`;
  formatted += `Available columns: ${availableColumns.join(', ')}\n\n`;

  // Include all match data
  data.forEach((match, index) => {
    formatted += `Match ${index + 1}:\n`;
    availableColumns.forEach(key => {
      const value = match[key];
      if (value !== undefined && value !== null && value !== '') {
        formatted += `  ${key}: ${value}\n`;
      }
    });
    formatted += '\n';
  });

  return formatted;
}

/**
 * Extract stats from image using Gemini vision
 * @param imageBase64 Base64-encoded image string (without data URL prefix)
 * @param mimeType MIME type of the image (e.g., 'image/png', 'image/jpeg')
 * @param period '1st' or '2nd' half
 */
export async function extractStatsFromImage(
  imageBase64: string,
  mimeType: string,
  period: '1st' | '2nd' = '1st'
): Promise<Record<string, number>> {
  const gemini = initializeGemini();

  if (!gemini) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  try {
    const model = gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Extract soccer match statistics from this image. This is ${period} half data.

The image shows basic stats with Team on the left and Opponent on the right.
Extract the following stats and return them as JSON with exact field names:

Team stats (left side):
- Goals For (${period})
- Shots For (${period})
- Possession (${period}) - percentage value as number (e.g., 70 for 70%)
- Corners For (${period})
- Free Kicks For (${period})
- Passes Comp (${period})
- Penalty For (${period})
- Possession Mins (${period})
- Possessions Won (${period})
- Throw-in (${period})

Opponent stats (right side):
- Goals Against (${period})
- Shots Against (${period})
- Opp Possession (${period}) - percentage value as number (e.g., 30 for 30%)
- Corners Against (${period})
- Free Kicks Against (${period})
- Opp Passes Comp (${period})
- Penalty Against (${period})
- Opp Possession Mins (${period})
- Opp Possessions Won (${period})
- Opp Throw-in (${period})

DO NOT extract:
- Attempts (these are computed fields, not in the form)
- Total Attempts (computed)
- Any computed/derived statistics

IMPORTANT:
- Return ONLY a valid JSON object, no other text
- Field names must match exactly: use "(1st)" or "(2nd)" format, NOT "(1st Half)"
- All values must be numbers (integers)
- If a stat is not visible or unclear, omit it from the JSON
- For percentages, extract the number only (e.g., 70 for "70%")
- Only extract the stats listed above - do not extract computed fields

Example format:
{
  "Goals For (1st)": 3,
  "Goals Against (1st)": 0,
  "Shots For (1st)": 2,
  "Shots Against (1st)": 3,
  "Possession (1st)": 70,
  "Opp Possession (1st)": 30,
  ...
}`;

    // Create image part for Gemini API
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    };

    const textPart = { text: prompt };

    const result = await model.generateContent([imagePart, textPart]);
    const response = result.response;
    const text = response.text();

    // Extract JSON from response (may have markdown code blocks)
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
    }
    
    // Try to find JSON object in the response
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate that we got an object with numbers
      const stats: Record<string, number> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'number') {
          stats[key] = value;
        } else if (typeof value === 'string') {
          // Try to parse string numbers
          const num = parseFloat(value);
          if (!isNaN(num)) {
            stats[key] = num;
          }
        }
      }
      
      return stats;
    }

    throw new Error('Could not parse JSON from Gemini response');
  } catch (error: any) {
    console.error('📸 Gemini vision error:', error);
    if (error.message?.includes('API_KEY')) {
      throw new Error('Invalid or missing Gemini API key');
    }
    throw new Error(`Failed to extract stats from image: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Check if AI service is configured
 */
export function isAIConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
