import express from 'express';
import { authenticateSession } from '../middleware/auth.js';
import { chatWithAI, isAIConfigured, extractStatsFromImage } from '../services/aiService.js';

const router = express.Router();

// All AI routes require authentication
router.use(authenticateSession);

/**
 * POST /api/ai/chat
 * Chat with AI using Gemini
 * Body: { message: string, context: string }
 * Note: context is pre-formatted on frontend to avoid sending large matchData arrays
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!isAIConfigured()) {
      return res.status(503).json({ error: 'AI service is not configured. Please set GEMINI_API_KEY environment variable.' });
    }

    // Use the pre-formatted context from frontend
    const response = await chatWithAI(message, context || '');
    res.json({ response });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get AI response' });
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
