/**
 * Recommendation Service
 * Generates AI-powered tactical suggestions and training plans
 */

import { db } from '../db/database.js';
import { RecommendationRow, NewRecommendation } from '../db/schema.js';
import { buildTeamContext } from './teamContextBuilder.js';
import { chatWithCachedContext } from './aiService.js';

export interface RecommendationRequest {
  teamId: number;
  insightId?: number | null;
  category?: 'shooting' | 'possession' | 'passing' | 'defending' | 'general';
  recommendationType?: 'tactical' | 'training' | 'general';
}

/**
 * Generate AI-powered recommendations for a team
 */
export async function generateRecommendations(
  request: RecommendationRequest
): Promise<RecommendationRow[]> {
  const { teamId, insightId, category, recommendationType } = request;

  // Build team context
  const contextData = await buildTeamContext(teamId);

  // Build prompt for AI
  let prompt = `Based on the team's match data, insights, and training history, generate specific, actionable recommendations.

REQUIREMENTS:
1. All recommendations must align with US Soccer coaching standards for ${contextData.developmentStage.ageRange}
2. All recommendations must align with JOGA club philosophy
3. Provide specific, actionable items that coaches can implement
4. Include both tactical suggestions and training plan recommendations

`;

  if (insightId) {
    const insight = contextData.insights.find(i => i.id === insightId);
    if (insight) {
      prompt += `FOCUS ON THIS INSIGHT:\n${insight.title}\n${insight.narrative || insight.detail_json}\n\n`;
    }
  }

  if (category) {
    prompt += `FOCUS ON CATEGORY: ${category}\n\n`;
  }

  if (recommendationType) {
    prompt += `RECOMMENDATION TYPE: ${recommendationType}\n\n`;
  }

  prompt += `Generate 3-5 recommendations. For each recommendation, provide:
- Title (short, actionable)
- Description (detailed explanation)
- Action items (specific steps to implement)
- Training plan (if applicable - structured plan with drills/exercises)
- Framework alignment (which US Soccer framework/license level this aligns with)
- Club philosophy alignment (how this aligns with JOGA philosophy)

Return the recommendations as a JSON array with this structure:
[
  {
    "title": "Recommendation title",
    "description": "Detailed description",
    "actionItems": ["Action 1", "Action 2", "Action 3"],
    "trainingPlan": {
      "sessionType": "training",
      "duration": 90,
      "focus": "Main focus area",
      "drills": ["Drill 1", "Drill 2"]
    },
    "frameworkAlignment": "US Soccer D License - Grassroots",
    "clubPhilosophyAlignment": "Aligns with possession-based play"
  }
]`;

  try {
    // Use cached context for AI call
    const aiResponse = await chatWithCachedContext(teamId, prompt);

    // Parse JSON from AI response - handle various formats (markdown, plain text, etc.)
    let jsonText = aiResponse.trim();

    // Extract from ```json ... ``` or ``` ... ``` blocks first (even mid-response)
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
    }

    // Find JSON array in response (AI may add explanatory text before/after)
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('❌ AI response (first 500 chars):', jsonText.substring(0, 500));
      throw new Error(
        'Could not parse recommendations from AI response. The AI may have returned explanatory text instead of JSON. Please try again.'
      );
    }

    const recommendations = JSON.parse(jsonMatch[0]);

    // Save recommendations to database
    const savedRecommendations: RecommendationRow[] = [];
    for (const rec of recommendations) {
      const newRec: NewRecommendation = {
        team_id: teamId,
        insight_id: insightId || null,
        recommendation_type: recommendationType || 'general',
        category: category || 'general',
        priority: determinePriority(rec),
        title: rec.title,
        description: rec.description,
        action_items: JSON.stringify(rec.actionItems || []),
        training_plan_json: rec.trainingPlan ? JSON.stringify(rec.trainingPlan) : null,
        framework_alignment: rec.frameworkAlignment || null,
        club_philosophy_alignment: rec.clubPhilosophyAlignment || null,
        is_applied: false,
        applied_at: null,
      };

      const saved = await db
        .insertInto('recommendations')
        .values(newRec)
        .returningAll()
        .executeTakeFirstOrThrow();

      savedRecommendations.push(saved);
    }

    return savedRecommendations;
  } catch (error: any) {
    console.error('❌ Error generating recommendations:', error);
    throw new Error(`Failed to generate recommendations: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Determine priority from recommendation content
 */
function determinePriority(rec: any): 'low' | 'medium' | 'high' | 'urgent' {
  const title = (rec.title || '').toLowerCase();
  const description = (rec.description || '').toLowerCase();

  if (title.includes('urgent') || description.includes('urgent') || description.includes('critical')) {
    return 'urgent';
  }
  if (title.includes('important') || description.includes('important') || description.includes('significant')) {
    return 'high';
  }
  if (title.includes('consider') || description.includes('consider')) {
    return 'low';
  }
  return 'medium';
}

/**
 * Get recommendations for a team
 */
export async function getRecommendationsForTeam(
  teamId: number,
  options?: {
    isApplied?: boolean;
    category?: string;
    recommendationType?: string;
    limit?: number;
  }
): Promise<RecommendationRow[]> {
  let query = db
    .selectFrom('recommendations')
    .selectAll()
    .where('team_id', '=', teamId);

  if (options?.isApplied !== undefined) {
    query = query.where('is_applied', '=', options.isApplied);
  }

  if (options?.category) {
    query = query.where('category', '=', options.category as 'shooting' | 'possession' | 'passing' | 'defending' | 'general');
  }

  if (options?.recommendationType) {
    query = query.where('recommendation_type', '=', options.recommendationType as 'tactical' | 'training' | 'general');
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  // Order by priority: urgent > high > medium > low
  // Use CASE to map priority to numeric value for proper ordering
  return query
    .orderBy((eb) => 
      eb.case()
        .when('priority', '=', 'urgent').then(4)
        .when('priority', '=', 'high').then(3)
        .when('priority', '=', 'medium').then(2)
        .when('priority', '=', 'low').then(1)
        .else(0)
        .end()
      , 'desc')
    .orderBy('created_at', 'desc')
    .execute();
}

/**
 * Mark a recommendation as applied
 */
export async function markRecommendationAsApplied(recommendationId: number): Promise<RecommendationRow> {
  return await db
    .updateTable('recommendations')
    .set({
      is_applied: true,
      applied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .where('id', '=', recommendationId)
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * Get a single recommendation by ID
 */
export async function getRecommendationById(recommendationId: number): Promise<RecommendationRow | null> {
  return await db
    .selectFrom('recommendations')
    .selectAll()
    .where('id', '=', recommendationId)
    .executeTakeFirst() || null;
}
