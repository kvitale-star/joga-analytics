import { GoogleGenerativeAI } from '@google/generative-ai';
import { MatchData, SheetConfig } from '../types';
import { getCoachingSystemInstructions, coachingRules } from '../config/coachingRules';
import { fetchColumnMetadata, mergeColumnMetadata, formatMetadataForAI } from './metadataService';
import { findImageColumns } from '../utils/imageUtils';

// Initialize Gemini with API key
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const HUGGINGFACE_API_KEY = import.meta.env.VITE_HUGGINGFACE_API_KEY || '';

let genAI: GoogleGenerativeAI | null = null;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// Request queue to manage rate limiting (Gemini free tier: 15 RPM max for flash-lite)
class RequestQueue {
  private queue: Array<{ fn: () => Promise<any>, resolve: (value: any) => void, reject: (error: any) => void }> = [];
  private processing = false;
  private lastRequestTime = 0;
  private readonly minInterval = 4000; // 4 seconds between requests (15 per minute = 1 per 4 seconds)

  async enqueue<T>(fn: () => Promise<T>, onStatusUpdate?: (status: string) => void): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue(onStatusUpdate);
    });
  }

  private async processQueue(onStatusUpdate?: (status: string) => void) {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minInterval) {
        const waitTime = this.minInterval - timeSinceLastRequest;
        if (onStatusUpdate) {
          onStatusUpdate(`Waiting ${Math.ceil(waitTime / 1000)}s before next request...`);
        }
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const task = this.queue.shift();
      if (task) {
        this.lastRequestTime = Date.now();
        try {
          const result = await task.fn();
          task.resolve(result);
        } catch (error) {
          task.reject(error);
        }
      }
    }

    this.processing = false;
  }
}

const requestQueue = new RequestQueue();

/**
 * Formats match data into a readable string for the AI
 */
function formatMatchDataForAI(data: MatchData[], columnKeys: string[]): string {
  if (data.length === 0) {
    return 'No match data available.';
  }

  const sample = data[0];
  const availableColumns = columnKeys.filter(key => {
    const value = sample[key];
    return value !== undefined && value !== null && value !== '';
  });

  const opponentKey = availableColumns.find(col => 
    col.toLowerCase().includes('opponent')
  ) || availableColumns.find(col => col.toLowerCase() === 'opponent');
  
  const dateKey = availableColumns.find(col => 
    col.toLowerCase().includes('date')
  ) || availableColumns.find(col => col.toLowerCase() === 'date');
  
  const teamKey = availableColumns.find(col => 
    col.toLowerCase().includes('team') && !col.toLowerCase().includes('opponent')
  ) || availableColumns.find(col => col.toLowerCase() === 'team');

  let formatted = `MATCH DATA SUMMARY\n`;
  formatted += `Total matches: ${data.length}\n`;
  formatted += `Available statistics: ${availableColumns.join(', ')}\n\n`;

  formatted += `ALL MATCHES (ordered from oldest to newest):\n`;
  data.forEach((match, idx) => {
    formatted += `\nMatch ${idx + 1}:\n`;
    if (dateKey && match[dateKey]) formatted += `  Date: ${match[dateKey]}\n`;
    if (teamKey && match[teamKey]) formatted += `  Team: ${match[teamKey]}\n`;
    if (opponentKey && match[opponentKey]) formatted += `  Opponent: ${match[opponentKey]}\n`;
    
    availableColumns.forEach(col => {
      if (col === dateKey || col === teamKey || col === opponentKey) return;
      const value = match[col];
      if (value !== undefined && value !== null && value !== '') {
        formatted += `  ${col}: ${value}\n`;
      }
    });
  });

  formatted += `\nAGGREGATE STATISTICS:\n`;
  availableColumns.forEach(col => {
    if (col === dateKey || col === teamKey || col === opponentKey) return;
    const values = data
      .map(m => m[col])
      .filter(v => typeof v === 'number' && !isNaN(v)) as number[];
    
    if (values.length > 0) {
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      formatted += `  ${col}: avg=${avg.toFixed(2)}, min=${min}, max=${max}, total=${sum.toFixed(2)}\n`;
    }
  });

  const imageColumns = findImageColumns(data);
  if (imageColumns.length > 0) {
    formatted += `\nIMAGE COLUMNS (contain image URLs):\n`;
    imageColumns.forEach(col => {
      const imageCount = data.filter(m => {
        const value = m[col];
        return typeof value === 'string' && value.trim().length > 0;
      }).length;
      formatted += `  ${col}: ${imageCount} matches have images\n`;
    });
    formatted += `Note: Images can be displayed when referencing these columns in responses.\n`;
  }

  return formatted;
}

/**
 * Builds the system prompt for AI
 */
function buildSystemPrompt(dataContext: string, metadataContext: string): string {
  const coachingInstructions = getCoachingSystemInstructions();
  
  return `${coachingInstructions} 
You have access to match statistics including:
- **Attempts** (for and against) - ALL shots including goals (this is what most people mean by "shots")
- **Shots** (for and against) - ONLY shots that DON'T result in goals (missed shots only - different from standard terminology)
- Possession percentages
- Expected Goals (xG)
- Conversion rates
- SPI (Soccer Power Index)
- Goals
- And other match statistics

**IMPORTANT - SHOTS vs ATTEMPTS TERMINOLOGY:**
In this dataset, the terminology is different from standard soccer:
- "Shots" = ONLY shots that don't result in goals (missed shots)
- "Attempts" = ALL shots including goals (what standard soccer calls "shots")
When users ask for "shots" data, use "Attempts" columns unless they specifically ask for shots that don't result in goals.

The coach can ask questions like:
${coachingRules.examplePrompts.map(p => `- "${p.question}"`).join('\n')}

When answering:
1. Follow the formatting rules defined above
2. Prioritize the statistics listed in PRIORITY STATISTICS
3. Reference specific numbers from the data
4. If asked about "last N games", use the most recent N matches
5. If comparing across teams, group by team/opponent
6. Format numbers appropriately (percentages, decimals, etc.)
7. **USE MARKDOWN FORMATTING ONLY**: Use markdown syntax for headings (# Heading 1, ## Heading 2, etc.), NOT HTML tags like <br> or <h1>. Use blank lines between sections for spacing.
8. For longer analyses, structure content with markdown headings: # for main sections, ## for subsections, ### for sub-subsections
9. Use markdown formatting for better readability (tables, lists, bold text, headings)
10. When the question asks for visualizations or comparisons, include a JSON chart specification
11. **IMPORTANT**: Place charts immediately after the text that references them. Do not put all charts at the end - embed them inline where they are mentioned.

For charts, include a JSON code block with this EXACT structure:
\`\`\`json
{
  "type": "chart",
  "chartType": "bar",
  "title": "Chart Title",
  "data": [
    { "xLabel": "value1", "series1": 10, "series2": 20 },
    { "xLabel": "value2", "series1": 15, "series2": 25 }
  ],
  "xKey": "xLabel",
  "yKeys": ["series1", "series2"],
  "colors": ["#6787aa", "#6b7280"],
  "xAxisLabel": "X Axis Label",
  "yAxisLabel": "Y Axis Label"
}
\`\`\`

IMPORTANT - CHART COLORS:
- For JOGA team data: Use "#6787aa" (Nike Valor Blue) or "#ceff00" (Nike Volt Yellow)
- For opponent data: Use "#6b7280" (gray-500) or "#9ca3af" (gray-400)
- First series should typically be JOGA team data (Valor Blue or Volt Yellow)
- Second series should typically be opponent data (gray shades)
- Default: ["#6787aa", "#6b7280"] for team vs opponent comparisons

Important: The "type" field must be "chart", and "chartType" must be one of: "bar", "line", "area", or "combo". The data array should contain objects where the xKey property is the x-axis label and yKeys are the series names.

The chart data should be derived from the match data provided. Use appropriate chart types:
- "bar" for comparisons
- "line" for trends over time
- "area" for cumulative data
- "combo" for multiple series comparisons

Current match data:
${dataContext}${metadataContext}

Answer the coach's question based on this data. Include charts when visualization would be helpful:`;
}

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  onStatusUpdate?: (status: string) => void
): Promise<T> {
  let lastError: any = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable
      const isRetryable = error?.message?.includes('503') || 
                         error?.message?.includes('429') ||
                         error?.message?.includes('quota') ||
                         error?.message?.includes('rate limit') ||
                         error?.message?.includes('busy') ||
                         error?.message?.includes('resource exhausted');
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = initialDelay * Math.pow(2, attempt);
      if (onStatusUpdate) {
        onStatusUpdate(`Service busy. Retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Try Gemini API with optimized model selection
 */
async function tryGemini(
  prompt: string,
  onStatusUpdate?: (status: string) => void
): Promise<string | null> {
  if (!genAI) {
    return null;
  }

  // Optimized model order - prioritize higher limit models first
  // Flash-Lite has 15 RPM (highest free tier limit)
  const modelNames = [
    'gemini-2.5-flash-lite',  // 15 RPM, 250K TPM, 1000 RPD (BEST for free tier)
    'gemini-2.0-flash',       // 15 RPM, 1M TPM, 200 RPD
    'gemini-2.5-flash',       // 10 RPM, 250K TPM, 250 RPD
    'gemini-1.5-flash',       // Fallback to older models
    'gemini-2.5-pro',         // 5 RPM, 125K TPM, 100 RPD (lowest priority)
    'gemini-1.5-pro',
    'gemini-pro',
  ];

  for (const modelName of modelNames) {
    try {
      if (onStatusUpdate) {
        onStatusUpdate(`Trying Gemini ${modelName}...`);
      }
      
      const result = await retryWithBackoff(
        async () => {
          const model = genAI!.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          return result.response.text();
        },
        3,
        1000,
        onStatusUpdate
      );
      
      if (onStatusUpdate) {
        onStatusUpdate(`Success with Gemini ${modelName}`);
      }
      return result;
    } catch (err: any) {
      // If it's a 404/model not found, try next model
      if (err?.message?.includes('404') || err?.message?.includes('not found')) {
        continue;
      }
      // If it's a quota/rate limit error, try next model
      if (err?.message?.includes('quota') || err?.message?.includes('rate limit') || 
          err?.message?.includes('busy') || err?.message?.includes('429') || 
          err?.message?.includes('503')) {
        if (onStatusUpdate) {
          onStatusUpdate(`${modelName} is busy, trying next model...`);
        }
        continue;
      }
      // For other errors, log and continue to next model
      console.warn(`Gemini ${modelName} error:`, err);
      continue;
    }
  }
  
  return null;
}

/**
 * Try Hugging Face Inference API as fallback
 */
async function tryHuggingFace(
  prompt: string,
  onStatusUpdate?: (status: string) => void
): Promise<string | null> {
  if (!HUGGINGFACE_API_KEY) {
    return null;
  }

  // Use a free, capable model for chat
  // meta-llama/Llama-3.1-8B-Instruct is free and good quality
  const model = 'meta-llama/Llama-3.1-8B-Instruct';
  
  try {
    if (onStatusUpdate) {
      onStatusUpdate(`Trying Hugging Face ${model}...`);
    }

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 2048,
            temperature: 0.7,
            return_full_text: false,
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 503) {
        // Model is loading, wait and retry once
        if (onStatusUpdate) {
          onStatusUpdate('Hugging Face model is loading, waiting 10s...');
        }
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        const retryResponse = await fetch(
          `https://api-inference.huggingface.co/models/${model}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputs: prompt,
              parameters: {
                max_new_tokens: 2048,
                temperature: 0.7,
                return_full_text: false,
              },
            }),
          }
        );
        
        if (!retryResponse.ok) {
          return null;
        }
        
        const retryData = await retryResponse.json();
        // Handle different response formats
        let generatedText: string | null = null;
        if (Array.isArray(retryData) && retryData[0]) {
          generatedText = retryData[0].generated_text || retryData[0].text || null;
        } else if (retryData.generated_text) {
          generatedText = retryData.generated_text;
        } else if (retryData.text) {
          generatedText = retryData.text;
        }
        
        if (generatedText) {
          if (onStatusUpdate) {
            onStatusUpdate('Success with Hugging Face');
          }
          return generatedText;
        }
      }
      return null;
    }

    const data = await response.json();
    // Handle different response formats
    let generatedText: string | null = null;
    if (Array.isArray(data) && data[0]) {
      generatedText = data[0].generated_text || data[0].text || null;
    } else if (data.generated_text) {
      generatedText = data.generated_text;
    } else if (data.text) {
      generatedText = data.text;
    }
    
    if (generatedText) {
      if (onStatusUpdate) {
        onStatusUpdate('Success with Hugging Face');
      }
      return generatedText;
    }

    return null;
  } catch (error) {
    console.error('Hugging Face API error:', error);
    return null;
  }
}

/**
 * Main chat function with hybrid fallback system
 */
export async function chatWithAI(
  message: string,
  matchData: MatchData[],
  columnKeys: string[],
  sheetConfig?: SheetConfig,
  onStatusUpdate?: (status: string) => void
): Promise<string> {
  // Format the match data for context
  const dataContext = formatMatchDataForAI(matchData, columnKeys);
  
  // Fetch and merge column metadata
  let metadataContext = '';
  if (sheetConfig) {
    try {
      const sheetMetadata = await fetchColumnMetadata(sheetConfig);
      const configMetadata = coachingRules.columnMetadata || {};
      const mergedMetadata = mergeColumnMetadata(configMetadata, sheetMetadata);
      metadataContext = formatMetadataForAI(mergedMetadata);
    } catch (err) {
      console.warn('Could not load column metadata:', err);
      if (coachingRules.columnMetadata && Object.keys(coachingRules.columnMetadata).length > 0) {
        metadataContext = formatMetadataForAI(coachingRules.columnMetadata);
      }
    }
  } else if (coachingRules.columnMetadata && Object.keys(coachingRules.columnMetadata).length > 0) {
    metadataContext = formatMetadataForAI(coachingRules.columnMetadata);
  }
  
  const systemPrompt = buildSystemPrompt(dataContext, metadataContext);
  const prompt = `${systemPrompt}\n\nCoach's question: ${message}`;

  // Try Gemini first (queue the request to respect rate limits)
  if (genAI) {
    try {
      if (onStatusUpdate) {
        onStatusUpdate('Requesting from Gemini API...');
      }
      
      const result = await requestQueue.enqueue(
        async () => {
          return await tryGemini(prompt, onStatusUpdate);
        },
        onStatusUpdate
      );
      
      if (result) {
        return result;
      }
    } catch (error) {
      console.warn('Gemini failed, trying fallback:', error);
      if (onStatusUpdate) {
        onStatusUpdate('Gemini unavailable, trying alternative...');
      }
    }
  }

  // Fallback to Hugging Face
  if (HUGGINGFACE_API_KEY) {
    try {
      const result = await tryHuggingFace(prompt, onStatusUpdate);
      if (result) {
        return result;
      }
    } catch (error) {
      console.error('Hugging Face fallback failed:', error);
    }
  }

  // If both fail
  if (!genAI && !HUGGINGFACE_API_KEY) {
    return 'Error: No AI service configured. Please add VITE_GEMINI_API_KEY or VITE_HUGGINGFACE_API_KEY to your .env file.';
  }

  return 'Error: All AI services are currently unavailable. Please try again in a moment.';
}

/**
 * Check if any AI service is configured
 */
export function isAIConfigured(): boolean {
  return !!(GEMINI_API_KEY || HUGGINGFACE_API_KEY);
}

/**
 * Legacy export for backward compatibility
 */
export async function chatWithGemini(
  message: string,
  matchData: MatchData[],
  columnKeys: string[],
  sheetConfig?: SheetConfig
): Promise<string> {
  return chatWithAI(message, matchData, columnKeys, sheetConfig);
}

export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY && !!genAI;
}

