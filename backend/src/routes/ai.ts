import express from 'express';
import { authenticateSession } from '../middleware/auth.js';
import { chatWithAI, isAIConfigured } from '../services/aiService.js';

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
 * GET /api/ai/status
 * Check if AI service is configured
 */
router.get('/status', async (req, res) => {
  res.json({ configured: isAIConfigured() });
});

export default router;
