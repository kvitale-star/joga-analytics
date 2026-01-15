import { MatchData, SheetConfig } from '../types';
import { getCoachingSystemInstructions, coachingRules } from '../config/coachingRules';
import { fetchColumnMetadata, mergeColumnMetadata, formatMetadataForAI } from './metadataService';
import { findImageColumns } from '../utils/imageUtils';
import { apiGet, apiPost } from './apiClient';

// Cache for AI configuration status
let aiConfiguredCache: boolean | null = null;
let aiConfiguredCheckPromise: Promise<boolean> | null = null;

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
- For JOGA team data: Use "#ceff00" (Nike Volt Yellow), "#6787aa" (Nike Valor Blue), or "#FFC0CB" (Pink Foam)
- These three colors should ALWAYS be used for JOGA team information, buttons, and visual elements
- For opponent data: Use "#6b7280" (gray-500) or "#9ca3af" (gray-400) - different shades of gray
- First series should typically be JOGA team data (Volt Yellow, Valor Blue, or Pink Foam)
- Second series should typically be opponent data (gray shades)
- Default: ["#ceff00", "#6b7280"] for team vs opponent comparisons

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
 * Main chat function using backend API
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
  const context = `${systemPrompt}\n\nCoach's question: ${message}`;

  try {
    if (onStatusUpdate) {
      onStatusUpdate('Requesting from AI service...');
    }

    // Call backend API which handles AI API calls
    // Send only the formatted context string, not the raw matchData array to avoid payload size issues
    const result = await apiPost<{ response: string }>('/ai/chat', {
      message,
      context, // Send formatted context instead of raw matchData
    });

    return result.response;
  } catch (error: any) {
    console.error('AI service error:', error);
    if (error.message?.includes('not configured')) {
      return 'Error: AI service is not configured. Please contact your administrator.';
    }
    throw error;
  }
}

/**
 * Check if AI service is configured (via backend)
 * Returns cached value synchronously, updates cache in background
 */
export function isAIConfigured(): boolean {
  // Return cached value if available
  if (aiConfiguredCache !== null) {
    return aiConfiguredCache;
  }

  // Start async check if not already in progress
  if (!aiConfiguredCheckPromise) {
    aiConfiguredCheckPromise = (async () => {
      try {
        const status = await apiGet<{ configured: boolean }>('/ai/status');
        aiConfiguredCache = status.configured;
        return status.configured;
      } catch (error) {
        // If backend is unavailable, assume not configured
        aiConfiguredCache = false;
        return false;
      } finally {
        aiConfiguredCheckPromise = null;
      }
    })();
  }

  // Return false while checking (will update cache when done)
  return false;
}

/**
 * Force refresh of AI configuration status
 */
export async function refreshAIConfigured(): Promise<boolean> {
  aiConfiguredCache = null;
  aiConfiguredCheckPromise = null;
  
  try {
    const status = await apiGet<{ configured: boolean }>('/ai/status');
    aiConfiguredCache = status.configured;
    return status.configured;
  } catch (error) {
    aiConfiguredCache = false;
    return false;
  }
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
  return isAIConfigured();
}

