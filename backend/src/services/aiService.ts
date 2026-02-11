/**
 * Backend AI Service
 * Handles AI API calls using backend credentials with Gemini Context Cache
 * Uses @google/genai SDK for context caching support
 */

import { GoogleGenAI } from '@google/genai';
import { getStoredCache, isCacheValid, storeCacheMetadata, invalidateTeamCache } from './aiCacheManager.js';
import { buildTeamContext, type TeamContextData } from './teamContextBuilder.js';
import { loadUSSFrameworks, loadClubPhilosophy } from './frameworkLoader.js';

const MODEL = 'gemini-2.5-flash';

let genAI: GoogleGenAI | null = null;

// Initialize Gemini with API key from environment
function initializeGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && !genAI) {
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

/**
 * Build system instruction with frameworks and philosophy
 */
function buildTeamSystemInstruction(
  contextData: TeamContextData,
  usSoccerFrameworks: any,
  clubPhilosophy: any
): string {
  const { developmentStage, clubPhilosophy: club } = contextData;
  
  return `You are an AI assistant helping JOGA coaches analyze their match data and provide training recommendations.

US SOCCER DEVELOPMENT FRAMEWORK:
Development Stage: ${developmentStage.name} (${developmentStage.ageRange})
Format: ${developmentStage.format}

CLUB PHILOSOPHY:
Playing Style: ${clubPhilosophy.playingStyle}
Training Methodology: ${clubPhilosophy.trainingMethodology}
Club Values: ${clubPhilosophy.clubValues}
Non-Negotiables:
${clubPhilosophy.nonNegotiables.map((item: string) => `- ${item}`).join('\n')}

All recommendations must align with BOTH:
1. US Soccer coaching standards (appropriate for ${developmentStage.ageRange})
2. JOGA club philosophy and playing style

When there is a conflict, prioritize club philosophy but explain the US Soccer standard.

Provide specific, actionable recommendations based on the team's match data, insights, and training history.`;
}

/**
 * Get or create cache - ONLY called when AI feature is used (lazy creation)
 * Uses @google/genai ai.caches.create for Gemini Context Cache
 */
async function getOrCreateCache(teamId: number, contextData: TeamContextData): Promise<string | null> {
  const ai = initializeGemini();
  if (!ai) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  // 1. Check database for existing cache
  const existingCache = await getStoredCache(teamId, 'combined');
  
  // 2. Check if cache is still valid
  if (existingCache && isCacheValid(existingCache, contextData.dataHash)) {
    // Cache valid - return it (NO API CALL, NO COST)
    console.log('✅ Using existing cache:', existingCache.cache_id);
    return existingCache.cache_id;
  }
  
  // 3. Cache expired or missing - create new one (ONLY NOW)
  console.log('🔄 Cache expired or missing - creating new cache for team', teamId);
  
  try {
    // Load frameworks (already loaded in contextData, but we need them for system instruction)
    const [usSoccerFrameworks, clubPhilosophy] = await Promise.all([
      loadUSSFrameworks(),
      loadClubPhilosophy(),
    ]);
    
    // Build the system instruction from framework + philosophy
    const systemInstruction = buildTeamSystemInstruction(contextData, usSoccerFrameworks, clubPhilosophy);
    
    // Build the contents array — this is the "heavy" context that gets cached
    // Minimum 1024 tokens required for Gemini 2.5 Flash context caching
    const contents = [
      {
        role: 'user' as const,
        parts: [{ text: contextData.formattedMatchData }],
      },
      {
        role: 'model' as const,
        parts: [{ text: 'I have received and understood the team data, development framework, insights, and training history. I am ready to answer questions about this team.' }],
      },
    ];
    
    const cachedContent = await ai.caches.create({
      model: MODEL,
      config: {
        contents,
        systemInstruction,
        displayName: `joga-team-${teamId}`,
        ttl: '3600s', // 1 hour
      },
    });
    
    const cacheId = cachedContent?.name ?? null;
    
    if (!cacheId) {
      console.log('⚠️  Cache creation returned no cache ID, using non-cached mode');
      return null;
    }
    
    // Store cache metadata in database
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
    await storeCacheMetadata({
      teamId,
      cacheType: 'combined',
      cacheId,
      expiresAt,
      dataHash: contextData.dataHash,
    });
    
    console.log('✅ Cache created and stored:', cacheId);
    return cacheId;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error creating cache:', msg);
    // Fall back to non-cached mode
    return null;
  }
}

/**
 * Chat with AI using Gemini Context Cache (lazy creation)
 * Falls back to non-cached mode if cache is unavailable
 */
export async function chatWithCachedContext(
  teamId: number,
  message: string
): Promise<string> {
  const ai = initializeGemini();
  if (!ai) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  try {
    // Build team context
    const contextData = await buildTeamContext(teamId);
    
    // Get or create cache (lazy creation)
    const cacheId = await getOrCreateCache(teamId, contextData);
    
    if (cacheId) {
      try {
        const response = await ai.models.generateContent({
          model: MODEL,
          contents: message,
          config: {
            cachedContent: cacheId,
          },
        });
        const text = response?.text;
        if (text !== undefined && text !== '') {
          return text;
        }
      } catch (cacheError: unknown) {
        const msg = cacheError instanceof Error ? cacheError.message : 'Unknown error';
        console.error('❌ Error using cache:', msg);
        // Fall back to non-cached mode
      }
    }
    
    // Fallback: Non-cached mode (original behavior)
    return await chatWithAI(message, contextData.formattedMatchData);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI service error:', msg);
    throw new Error(`AI service error: ${msg}`);
  }
}

/**
 * Chat with AI using Gemini (non-cached mode - fallback)
 * @param message User's question
 * @param context Pre-formatted context string (includes match data and system prompt)
 */
export async function chatWithAI(
  message: string,
  context: string
): Promise<string> {
  const ai = initializeGemini();
  if (!ai) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  try {
    const prompt = context
      ? `${context}\n\n---\n\n${message}`
      : `You are a helpful soccer analytics assistant. You help coaches analyze match data.

User's question: ${message}

Please provide a helpful response.`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });
    const text = response?.text;
    if (text !== undefined && text !== '') {
      return text;
    }
    throw new Error('Empty response from AI');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI service error:', msg);
    if (msg.includes('API_KEY')) {
      throw new Error('Invalid or missing Gemini API key');
    }
    throw new Error(`AI service error: ${msg}`);
  }
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
  const ai = initializeGemini();
  if (!ai) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  try {
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

    const contents = [
      { inlineData: { data: imageBase64, mimeType } },
      { text: prompt },
    ];

    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
    });
    const text = response?.text ?? '';

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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('📸 Gemini vision error:', msg);
    if (msg.includes('API_KEY')) {
      throw new Error('Invalid or missing Gemini API key');
    }
    throw new Error(`Failed to extract stats from image: ${msg}`);
  }
}

/**
 * Invalidate a team's cache (call after match upload, training log entry, etc.)
 */
export async function invalidateTeamCacheForDataChange(teamId: number): Promise<void> {
  await invalidateTeamCache(teamId, 'combined');
}

/**
 * Check if AI service is configured
 */
export function isAIConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
