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
 * Check if AI service is configured
 */
export function isAIConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
