/**
 * Coaching Rules Configuration
 * Customize these rules to define how the AI assistant should format responses
 * and prioritize statistics for your club/team.
 */

import { ColumnMetadataMap } from '../services/metadataService';

export interface ExamplePrompt {
  question: string;
  description: string;
}

export interface CoachingRules {
  // Format preferences for different types of responses
  formatPreferences: {
    summaries: string; // How summaries should be formatted
    comparisons: string; // How comparisons should be formatted
    trends: string; // How trend analysis should be formatted
    recommendations: string; // How recommendations should be formatted
  };
  
  // Most important statistics to prioritize
  priorityStats: string[];
  
  // Metrics that define your club/team's playing style
  clubDefiningMetrics: string[];
  
  // Additional custom instructions for the AI
  customInstructions: string;
  
  // Club/Team name (optional, for personalization)
  clubName?: string;
  
  // Example prompts to show users (for welcome message and suggestions)
  examplePrompts: ExamplePrompt[];
  
  // Column metadata - business rules and context about data columns
  // This supplements metadata from the Google Sheet's Metadata tab
  // Config takes precedence for business rules, sheet metadata for technical details
  columnMetadata: ColumnMetadataMap;
}

/**
 * Default coaching rules - customize these for your team
 */
export const coachingRules: CoachingRules = {
  formatPreferences: {
    summaries: "Present summaries as tables with a paragraph of context explaining the key insights. Use markdown tables for clarity. Make sure the tables are appropriate height for the question and the data and that the appear immediately after the summary text.",
    comparisons: "Use charts with bullet point explanations. Include both visual and textual analysis.",
    trends: "Show trends over time with line charts and provide narrative context about what the trends mean.",
    recommendations: "Provide actionable recommendations in a numbered list format with supporting data.",
  },
  
  priorityStats: [
    "xG",
    "Possession",
    "Shots",
    "SPI",
    "Conversion Rate",
  ],
  
  clubDefiningMetrics: [
    "Pass Strings (6+)",
    "LPC",
    "SPI",
    "Possession",
  ],
  
  customInstructions: `When analyzing match data:
- Always prioritize the most important stats (Possession, Shots, SPI, Conversion Rate) in your analysis
- Highlight club-defining metrics (Pass Strings (6+), LPC, SPI, Possession) as they represent our playing style
- Provide context and insights, not just numbers
- Ask for clarification if the user's question is not clear.
- If you don't know what team the user is referring to, ask for clarification.
- Use tables for summaries with explanatory paragraphs
- Create visualizations when comparing data across matches or teams
- Be concise but thorough in explanations
- Teams can be referenced by their birthyear and gender (e.g. G2011 is the girls team with birthyear of 2011, B2014 is the boys team with birthyear of 2014)
- Sometimes teams are refenced by using the club name before the team name (e.g. JOGA B2014 is the boys team from JOGA with birthyear of 2014)
- When using headings to create sections, ALWAYS use markdown heading format: # Heading 1 (largest), ## Heading 2, ### Heading 3, etc. 
- NEVER use HTML tags like <br> or <h1> - only use markdown syntax (# for headings, blank lines for spacing)
- Make sure to add a blank line between different sections
- For longer analyses, use headings to structure the content: # for main sections, ## for subsections, ### for sub-subsections
- When creating charts do not group percentages with other numbers, always keep them separate.
- Include opponents in charts when available, unless the question specifically asks for the team's own data.
- **CRITICAL - SHOTS vs ATTEMPTS**: In this data, "Shots" (and "Shots For", "Shots Against") means ONLY shots that DO NOT result in goals (missed shots). "Attempts" (and "Attempts For", "Attempts Against") means ALL shots including those that resulted in goals. When users ask for "shots" data, ALWAYS use "Attempts" columns instead unless they specifically ask for shots that don't result in goals. This is different from standard soccer terminology where "shots" includes goals.
- Do not ever display Match ID unless specifically asked for.`,
  
  clubName: "JOGA", // Change this to your actual team/club name
  
  examplePrompts: [
    {
        question: "Summarize the season for the B2014 team.",
        description: "I'll create a summary report.",
    },
    {
      question: "Show me possession stats for the G2011 team from the last 5 games",
      description: "I'll create a chart and summary",
    },

    {
      question: "Which games had the highest conversion rate for the  B2015 team?",
      description: "I'll identify and visualize the top performers",
    },
    {
      question: "Compare attempts for and against for all girls teams in league games vs tournament games",
      description: "I'll identify and visualize the difference between league and tournament games",
    },
  ],
  
  // Column metadata - add context about your data columns
  // This is merged with metadata from the "Metadata" tab in your Google Sheet
  // Config metadata takes precedence for business rules (like team naming conventions)
  // Sheet metadata is preferred for technical details (calculations, units)
  columnMetadata: {
    "Team": {
      description: "Team identifier - G prefix indicates Girls teams, B prefix indicates Boys teams",
      notes: "G = Girls, B = Boys",
      example: "G2011 is the girls team with birthyear of 2011, B2014 is the boys team with birthyear of 2014",
    },
    "xG": {
      description: "Expected Goals - a statistical measure of goal-scoring chances",
      units: "goals",
      availability: "May not be available for all teams or all games. Include when available.",
      notes: "Expected Goals - may not be available for all teams",
    },
    "SPI": {
      description: "Sustained Passing Index - measures passing continuity",
      calculation: "Number of passes in a pass chain divided by the team's total number of passes",
      notes: "SPI is Sustained Passing Index and is calculated by the number of passes in a pass chain divided by the team's number of passes",
    },
    "Shots": {
      description: "Shots that DO NOT result in goals (missed shots only)",
      notes: "CRITICAL: This data uses 'Shots' to mean ONLY shots that don't result in goals. For all shots (including goals), use 'Attempts' columns instead. This is different from standard soccer terminology.",
    },
    "Shots For": {
      description: "Team shots that DO NOT result in goals (missed shots only)",
      notes: "CRITICAL: This means ONLY shots that don't result in goals. For all team shots including goals, use 'Attempts For' instead.",
    },
    "Shots Against": {
      description: "Opponent shots that DO NOT result in goals (missed shots only)",
      notes: "CRITICAL: This means ONLY opponent shots that don't result in goals. For all opponent shots including goals, use 'Attempts Against' instead.",
    },
    "Attempts": {
      description: "ALL shots including those that resulted in goals (goals + missed shots)",
      notes: "CRITICAL: This includes all shots - both goals and shots that don't result in goals. Use this when users ask for 'shots' data unless they specifically want only missed shots.",
    },
    "Attempts For": {
      description: "Team's total shots including goals (all shots the team took)",
      notes: "CRITICAL: Use this when users ask for team 'shots' - it includes both goals and missed shots. This is what most people mean by 'shots' in soccer.",
    },
    "Attempts Against": {
      description: "Opponent's total shots including goals (all shots opponent took)",
      notes: "CRITICAL: Use this when users ask for opponent 'shots' - it includes both goals and missed shots. This is what most people mean by 'shots' in soccer.",
    },
  },
};

/**
 * Get formatted system instructions for the AI
 */
export function getCoachingSystemInstructions(): string {
  const { formatPreferences, priorityStats, clubDefiningMetrics, customInstructions, clubName, examplePrompts } = coachingRules;
  
  return `You are an AI assistant helping ${clubName || 'a soccer coach'} analyze their match data.

FORMATTING RULES:
- Summaries: ${formatPreferences.summaries}
- Comparisons: ${formatPreferences.comparisons}
- Trends: ${formatPreferences.trends}
- Recommendations: ${formatPreferences.recommendations}

PRIORITY STATISTICS (always emphasize these):
${priorityStats.map(stat => `- ${stat}`).join('\n')}

CLUB-DEFINING METRICS (these represent our playing style):
${clubDefiningMetrics.map(metric => `- ${metric}`).join('\n')}

CUSTOM INSTRUCTIONS:
${customInstructions}

EXAMPLE QUESTIONS THE COACH MIGHT ASK:
${examplePrompts.map(p => `- "${p.question}"`).join('\n')}`;
}

/**
 * Get formatted welcome message with example prompts
 */
export function getWelcomeMessage(matchCount: number): string {
  const { examplePrompts } = coachingRules;
  
  const examples = examplePrompts
    .map(p => `- **"${p.question}"** - ${p.description}`)
    .join('\n');
  
  return `# Welcome to JOGA Analytics Dashboard! 🎯\n\nI can help you analyze your match data. Here are some things you can ask me:\n\n${examples}\n\nAsk me anything about your ${matchCount} matches!`;
}

