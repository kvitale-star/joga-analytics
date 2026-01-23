import express from 'express';
import { authenticateSession } from '../middleware/auth.js';
import {
  syncMetricDefinitionsFromSheet,
  getMetricDefinitions,
  getMetricDefinitionByName,
  getMetricCategories,
} from '../services/glossaryService.js';

const router = express.Router();

// All glossary routes require authentication
router.use(authenticateSession);

/**
 * GET /api/glossary
 * Get all metric definitions, optionally filtered by category
 * Query params: category (optional)
 */
router.get('/', async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const definitions = await getMetricDefinitions(category);
    res.json(definitions);
  } catch (error: any) {
    console.error('📚 Glossary API - Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch metric definitions' });
  }
});

/**
 * GET /api/glossary/categories
 * Get all unique categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await getMetricCategories();
    res.json(categories);
  } catch (error: any) {
    console.error('📚 Glossary API - Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch categories' });
  }
});

/**
 * GET /api/glossary/:metricName
 * Get metric definition by name
 */
router.get('/:metricName', async (req, res) => {
  try {
    const metricName = decodeURIComponent(req.params.metricName);
    const definition = await getMetricDefinitionByName(metricName);
    
    if (!definition) {
      return res.status(404).json({ error: 'Metric definition not found' });
    }
    
    res.json(definition);
  } catch (error: any) {
    console.error('📚 Glossary API - Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch metric definition' });
  }
});

/**
 * POST /api/glossary/sync
 * Sync metric definitions from Google Sheets Metadata tab
 * Admin only
 */
router.post('/sync', async (req, res) => {
  try {
    // Check if user is admin
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const syncedCount = await syncMetricDefinitionsFromSheet();
    res.json({ 
      success: true, 
      message: `Synced ${syncedCount} metric definitions`,
      count: syncedCount 
    });
  } catch (error: any) {
    console.error('📚 Glossary API - Sync Error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync metric definitions' });
  }
});

export default router;
