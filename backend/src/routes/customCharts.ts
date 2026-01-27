import express from 'express';
import {
  getUserCustomCharts,
  getAllCustomCharts,
  getCustomChartById,
  createCustomChart,
  updateCustomChart,
  deleteCustomChart,
  prepareChartData,
  type ChartType,
  type CustomChartConfig,
} from '../services/customChartsService.js';
import { authenticateSession, requireAdmin } from '../middleware/auth.js';
import { fetchSheetData } from '../services/sheetsService.js';

// SheetConfig type (matches what sheets service expects)
interface SheetConfig {
  range: string;
  spreadsheetId?: string;
  apiKey?: string;
}

const router = express.Router();

// Auth required for all routes
router.use(authenticateSession);

/**
 * GET /api/custom-charts
 * Get all custom charts for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.userId!;
    const charts = await getUserCustomCharts(userId);
    res.json(charts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get custom charts' });
  }
});

/**
 * GET /api/custom-charts/all
 * Get all custom charts in the system (admin only)
 */
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const charts = await getAllCustomCharts();
    res.json(charts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get all custom charts' });
  }
});

/**
 * GET /api/custom-charts/:id
 * Get a specific custom chart by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.userId!;
    const chartId = parseInt(req.params.id);
    
    if (isNaN(chartId)) {
      return res.status(400).json({ error: 'Invalid chart ID' });
    }

    const chart = await getCustomChartById(chartId, userId);
    
    if (!chart) {
      return res.status(404).json({ error: 'Chart not found' });
    }

    res.json(chart);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get chart' });
  }
});

/**
 * POST /api/custom-charts
 * Create a new custom chart
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.userId!;
    const { name, description, chartType, config } = req.body;

    if (!name || !chartType || !config) {
      return res.status(400).json({ error: 'Name, chartType, and config are required' });
    }

    if (!['line', 'bar', 'area', 'scatter'].includes(chartType)) {
      return res.status(400).json({ error: 'Invalid chart type' });
    }

    const chart = await createCustomChart(userId, {
      name,
      description,
      chartType: chartType as ChartType,
      config: config as CustomChartConfig,
    });

    res.status(201).json(chart);
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'A chart with this name already exists' });
    }
    res.status(500).json({ error: error.message || 'Failed to create chart' });
  }
});

/**
 * PUT /api/custom-charts/:id
 * Update an existing custom chart
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = req.userId!;
    const chartId = parseInt(req.params.id);
    
    if (isNaN(chartId)) {
      return res.status(400).json({ error: 'Invalid chart ID' });
    }

    const { name, description, chartType, config } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (chartType !== undefined) {
      if (!['line', 'bar', 'area', 'scatter'].includes(chartType)) {
        return res.status(400).json({ error: 'Invalid chart type' });
      }
      updateData.chartType = chartType as ChartType;
    }
    if (config !== undefined) updateData.config = config as CustomChartConfig;

    const chart = await updateCustomChart(chartId, userId, updateData);
    res.json(chart);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to update chart' });
  }
});

/**
 * DELETE /api/custom-charts/:id
 * Delete a custom chart
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.userId!;
    const chartId = parseInt(req.params.id);
    
    if (isNaN(chartId)) {
      return res.status(400).json({ error: 'Invalid chart ID' });
    }

    await deleteCustomChart(chartId, userId);
    res.status(204).send();
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to delete chart' });
  }
});

/**
 * POST /api/custom-charts/:id/render
 * Render chart data based on chart config and optional filters
 * 
 * Request body:
 * - sheetConfig: { range: string } - Required sheet configuration
 * - filters?: CustomChartConfig['filters'] - Optional additional filters
 */
router.post('/:id/render', async (req, res) => {
  try {
    const userId = req.userId!;
    const chartId = parseInt(req.params.id);
    
    if (isNaN(chartId)) {
      return res.status(400).json({ error: 'Invalid chart ID' });
    }

    const chart = await getCustomChartById(chartId, userId);
    if (!chart) {
      return res.status(404).json({ error: 'Chart not found' });
    }

    const { range, filters } = req.body;

    if (!range) {
      return res.status(400).json({ error: 'range is required (e.g., "Match Log!A1:ZZ1000")' });
    }

    // Fetch match data from sheets (fetchSheetData takes range string directly)
    const matchData = await fetchSheetData(range);

    // Merge any additional filters from request with chart config filters
    const config: CustomChartConfig = {
      ...chart.config,
      filters: {
        ...chart.config.filters,
        ...filters,
      },
    };

    // Prepare chart data
    const chartData = prepareChartData(matchData, config);

    res.json(chartData);
  } catch (error: any) {
    console.error('Error rendering chart:', error);
    res.status(500).json({ error: error.message || 'Failed to render chart' });
  }
});

export default router;
