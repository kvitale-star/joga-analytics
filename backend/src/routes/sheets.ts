import express from 'express';
import { authenticateSession } from '../middleware/auth.js';
import {
  fetchSheetData,
  fetchColumnMetadata,
  appendRowToSheet,
} from '../services/sheetsService.js';

const router = express.Router();

// All sheet routes require authentication
router.use(authenticateSession);

/**
 * GET /api/sheets/data
 * Fetch data from Google Sheets
 * Query params: range (e.g., "Match Log!A1:ZZ1000")
 */
router.get('/data', async (req, res) => {
  try {
    const range = req.query.range as string;

    if (!range) {
      return res.status(400).json({ error: 'Range parameter is required (e.g., "Match Log!A1:ZZ1000")' });
    }

    console.log('📊 Sheets API - Request received:', { range, userId: req.userId });
    const data = await fetchSheetData(range);
    console.log('📊 Sheets API - Success, returning', data.length, 'rows');
    res.json(data);
  } catch (error: any) {
    console.error('📊 Sheets API - Error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to fetch sheet data' });
  }
});

/**
 * GET /api/sheets/metadata
 * Fetch column metadata from Google Sheets
 * Query params: range (e.g., "Metadata!A1:Z100")
 */
router.get('/metadata', async (req, res) => {
  try {
    const range = req.query.range as string;

    if (!range) {
      return res.status(400).json({ error: 'Range parameter is required (e.g., "Metadata!A1:Z100")' });
    }

    const metadata = await fetchColumnMetadata(range);
    res.json(metadata);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch metadata' });
  }
});

/**
 * POST /api/sheets/append
 * Append a new row to Google Sheets
 * Body: { sheetName: string, columnKeys: string[], rowData: Record<string, string | number> }
 */
router.post('/append', async (req, res) => {
  try {
    const { sheetName, columnKeys, rowData } = req.body;

    if (!sheetName || !columnKeys || !rowData) {
      return res.status(400).json({ error: 'sheetName, columnKeys, and rowData are required' });
    }

    await appendRowToSheet(sheetName, columnKeys, rowData);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to append row to sheet' });
  }
});

export default router;
