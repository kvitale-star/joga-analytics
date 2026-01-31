import express from 'express';
import { authenticateSession } from '../middleware/auth.js';
import {
  fetchSheetData,
  fetchColumnMetadata,
  appendRowToSheet,
} from '../services/sheetsService.js';
import { getMergedMatchData } from '../services/mergedDataService.js';
import { getUserTeamAssignments } from '../services/teamService.js';

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
    console.error('📊 Sheets API - Full error:', error);
    // Pass through the error message from Google Sheets API
    // Check for specific error message patterns from sheetsService
    const statusCode = error.message?.includes('access denied') ? 403 :
                       error.message?.includes('not found') || error.message?.includes('Spreadsheet not found') ? 404 :
                       error.message?.includes('Invalid request') || error.message?.includes('Invalid range') ? 400 :
                       error.message?.includes('Quota exceeded') ? 429 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to fetch sheet data' });
  }
});

/**
 * GET /api/sheets/merged
 * Get merged match data from both Google Sheets and PostgreSQL
 * Query params: 
 *   - range: Google Sheets range (default: "Match Log!A1:ZZ1000")
 *   - teamId: Filter by team ID
 *   - startDate: Filter by start date
 *   - endDate: Filter by end date
 */
router.get('/merged', async (req, res) => {
  try {
    const range = (req.query.range as string) || 'Match Log!A1:ZZ1000';
    const teamId = req.query.teamId ? parseInt(req.query.teamId as string) : undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    // Role-based visibility: coaches/viewers can only see their assigned teams
    let teamIds: number[] | undefined;
    if (req.userId && req.userRole && req.userRole !== 'admin') {
      const assignedTeamIds = await getUserTeamAssignments(req.userId);
      
      if (teamId && !assignedTeamIds.includes(teamId)) {
        return res.status(403).json({ error: 'You can only view matches for your assigned teams' });
      }
      
      teamIds = teamId ? [teamId] : assignedTeamIds;
    } else if (teamId) {
      teamIds = [teamId];
    }

    const mergedData = await getMergedMatchData({
      sheetRange: range,
      teamId,
      teamIds,
      startDate,
      endDate,
    });

    console.log('📊 Merged data API - Success, returning', mergedData.length, 'matches');
    res.json(mergedData);
  } catch (error: any) {
    console.error('📊 Merged data API - Error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to get merged match data' });
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

/**
 * GET /api/sheets/test
 * Diagnostic endpoint to test Google Sheets API connection
 * Returns detailed information about configuration and connection status
 */
router.get('/test', async (req, res) => {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

    const diagnostics: any = {
      envVarsSet: {
        GOOGLE_SHEETS_SPREADSHEET_ID: !!spreadsheetId,
        GOOGLE_SHEETS_API_KEY: !!apiKey,
      },
      spreadsheetIdPreview: spreadsheetId ? `${spreadsheetId.substring(0, 10)}...` : 'NOT SET',
      apiKeyPreview: apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET',
    };

    if (!spreadsheetId || !apiKey) {
      return res.status(500).json({
        error: 'Environment variables not set',
        diagnostics,
        fix: 'Set GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SHEETS_API_KEY in Railway environment variables',
      });
    }

    // Try to fetch a small range to test the connection
    const testRange = 'A1:A1'; // Minimal test range
    const encodedRange = encodeURIComponent(testRange);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?key=${apiKey}`;

    console.log('📊 Sheets Test - Testing connection...');
    const response = await fetch(url);
    const data = await response.json();

    diagnostics.testRequest = {
      url: url.replace(apiKey, 'API_KEY_HIDDEN'),
      status: response.status,
      statusText: response.statusText,
    };

    if (!response.ok) {
      const errorMessage = (data as any).error?.message || response.statusText;
      const errorDetails = (data as any).error?.details || [];
      const errorCode = (data as any).error?.code;

      diagnostics.error = {
        message: errorMessage,
        code: errorCode,
        details: errorDetails,
      };

      // Provide specific guidance based on error
      let fixGuidance = '';
      if (response.status === 403) {
        if (errorMessage?.includes('API key not valid')) {
          fixGuidance = 'API key is invalid. Check that the key is correct in Railway environment variables.';
        } else if (errorMessage?.includes('API key not found')) {
          fixGuidance = 'API key not found. Verify the key exists in Google Cloud Console.';
        } else if (errorMessage?.includes('permission denied') || errorMessage?.includes('access denied')) {
          fixGuidance = 'Access denied. Possible causes: 1) Google Sheets API not enabled for this API key, 2) API key has IP/referrer restrictions blocking Railway, 3) Spreadsheet is private (API keys can only access public sheets).';
        } else {
          fixGuidance = 'Access denied (403). Check: 1) Google Sheets API enabled, 2) API key restrictions, 3) Sheet is public.';
        }
      } else if (response.status === 404) {
        fixGuidance = 'Spreadsheet not found. Verify the GOOGLE_SHEETS_SPREADSHEET_ID is correct (found in the Google Sheets URL).';
      } else if (response.status === 400) {
        fixGuidance = 'Invalid request. Check the spreadsheet ID format.';
      }

      return res.status(response.status).json({
        error: 'Google Sheets API test failed',
        diagnostics,
        fix: fixGuidance || 'Check Railway logs for detailed error information',
      });
    }

    diagnostics.success = true;
    diagnostics.testResult = {
      hasData: !!(data as any).values,
      rowCount: (data as any).values?.length || 0,
    };

    return res.json({
      success: true,
      message: 'Google Sheets API connection successful',
      diagnostics,
    });
  } catch (error: any) {
    console.error('📊 Sheets Test - Error:', error);
    return res.status(500).json({
      error: 'Test failed with exception',
      message: error.message,
      diagnostics: {
        exception: error.toString(),
      },
    });
  }
});

export default router;
