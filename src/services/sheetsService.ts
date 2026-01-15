import { MatchData, SheetConfig } from '../types';
import { apiGet, apiPost } from './apiClient';

/**
 * Fetches data from Google Sheets using the backend API
 * The backend handles authentication and API key management
 */
export async function fetchSheetData(config: SheetConfig): Promise<MatchData[]> {
  const { range } = config;
  
  if (!range) {
    throw new Error('Range is required');
  }

  try {
    // Call backend API which handles Google Sheets API calls
    const data = await apiGet<MatchData[]>(`/sheets/data?range=${encodeURIComponent(range)}`);
    return data;
  } catch (error: any) {
    console.error('Error fetching sheet data:', error);
    
    // Provide more helpful error messages
    if (error.message?.includes('GOOGLE_SHEETS_SPREADSHEET_ID') || error.message?.includes('GOOGLE_SHEETS_API_KEY')) {
      throw new Error('Backend configuration error: Google Sheets credentials not set. Contact your administrator.');
    }
    
    if (error.message?.includes('401') || error.message?.includes('Not authenticated')) {
      throw new Error('Authentication required. Please log in to access sheet data.');
    }
    
    if (error.message?.includes('403') || error.message?.includes('Access denied')) {
      throw new Error('Access denied. Please check that the Google Sheets API key has proper permissions and the sheet is accessible.');
    }
    
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      throw new Error('Spreadsheet not found. Please verify the spreadsheet ID is correct in backend configuration.');
    }
    
    // Re-throw with original message if it's already helpful
    throw error;
  }
}

/**
 * Appends a new row to Google Sheets using the backend API
 * @param config Sheet configuration
 * @param columnKeys Array of column keys in the order they appear in the sheet
 * @param rowData Object with field names as keys and values to append
 * @returns Promise that resolves when the row is successfully appended
 */
export async function appendRowToSheet(
  config: SheetConfig,
  columnKeys: string[],
  rowData: Record<string, string | number>
): Promise<void> {
  const { range } = config;
  
  if (!range) {
    throw new Error('Range is required');
  }

  // Extract sheet name from range (e.g., "Match Log" from "Match Log!A1:ZZ1000")
  const sheetName = range.split('!')[0];
  
  try {
    // Call backend API which handles Google Sheets API calls
    await apiPost('/sheets/append', {
      sheetName,
      columnKeys,
      rowData,
    });
  } catch (error) {
    console.error('Error appending row to sheet:', error);
    throw error;
  }
}

/**
 * Alternative method using service account credentials
 * This requires the googleapis package and proper authentication
 */
export async function fetchSheetDataWithAuth(_config: SheetConfig): Promise<MatchData[]> {
  // This would use the googleapis library for authenticated access
  // Implementation would go here if using service account
  throw new Error('Service account authentication not yet implemented. Use fetchSheetData for public sheets.');
}

