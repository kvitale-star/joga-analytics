import express from 'express';
import { authenticateSession } from '../middleware/auth.js';
import { chatWithCachedContext, chatWithAI, isAIConfigured, extractStatsFromImage } from '../services/aiService.js';
import { getUserTeamAssignments } from '../services/teamService.js';

const router = express.Router();

// All AI routes require authentication
router.use(authenticateSession);

/**
 * POST /api/ai/chat
 * Chat with AI using Gemini Context Cache (lazy creation)
 * Body: { message: string, teamId: number }
 * 
 * BREAKING CHANGE: Previously accepted { message: string, context: string }
 * Context building now happens on backend using teamId
 * 
 * Backward compatibility: If context is provided, use non-cached mode
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, teamId, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!isAIConfigured()) {
      return res.status(503).json({ 
        error: 'AI service is not configured. Please set GEMINI_API_KEY environment variable.' 
      });
    }

    // Backward compatibility: If context is provided, use non-cached mode
    if (context) {
      const response = await chatWithAI(message, context);
      return res.json({ response });
    }

    // New mode: Use teamId for cached context
    if (!teamId) {
      return res.status(400).json({ error: 'teamId is required (or provide context for backward compatibility)' });
    }

    // Verify user has access to this team
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userTeamIds = await getUserTeamAssignments(req.userId);
    if (!userTeamIds.includes(teamId)) {
      return res.status(403).json({ error: 'Access denied to this team' });
    }

    // LAZY CACHE CREATION - Only here, when AI is actually used
    const response = await chatWithCachedContext(teamId, message);
    
    res.json({ response });
  } catch (error: any) {
    console.error('AI chat error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get AI response' 
    });
  }
});

/**
 * POST /api/ai/extract-stats
 * Extract statistics from an image using Gemini vision
 * Body: { imageBase64: string, mimeType: string, period: '1st' | '2nd' }
 */
router.post('/extract-stats', async (req, res) => {
  try {
    const { imageBase64, mimeType, period } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    if (!mimeType) {
      return res.status(400).json({ error: 'mimeType is required' });
    }

    if (!isAIConfigured()) {
      return res.status(503).json({ error: 'AI service is not configured. Please set GEMINI_API_KEY environment variable.' });
    }

    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const stats = await extractStatsFromImage(base64Data, mimeType, period || '1st');
    res.json({ stats });
  } catch (error: any) {
    console.error('📸 Error extracting stats from image:', error);
    res.status(500).json({ error: error.message || 'Failed to extract stats from image' });
  }
});

/**
 * GET /api/ai/status
 * Check if AI service is configured
 */
router.get('/status', async (req, res) => {
  res.json({ configured: isAIConfigured() });
});

export default router;
