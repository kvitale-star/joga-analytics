import { MatchData, SheetConfig } from '../types';

/**
 * Fetches data from Google Sheets using the Sheets API
 * For public sheets, you can use the simple API endpoint
 * For private sheets, you'll need OAuth or service account credentials
 */
export async function fetchSheetData(config: SheetConfig): Promise<MatchData[]> {
  const { spreadsheetId, range, apiKey } = config;
  
  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID is required');
  }

  // For public sheets, use the simple API endpoint
  // URL encode the range to handle special characters like spaces in sheet names
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?key=${apiKey || ''}`;
  
  try {
    console.log('Fetching from URL:', url.replace(apiKey || '', 'API_KEY_HIDDEN'));
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      // Google Sheets API returns error details in the response
      const errorMessage = data.error?.message || response.statusText;
      
      if (response.status === 403) {
        throw new Error(`Access denied: ${errorMessage}. Please check your API key or make the sheet public.`);
      }
      if (response.status === 404) {
        throw new Error(`Spreadsheet not found: ${errorMessage}. Please check the spreadsheet ID and sheet name.`);
      }
      if (response.status === 400) {
        throw new Error(`Invalid request: ${errorMessage}. Please check the range format (e.g., "Sheet1!A1:Z100").`);
      }
      throw new Error(`Failed to fetch data (${response.status}): ${errorMessage}`);
    }
    
    if (!data.values || data.values.length === 0) {
      return [];
    }
    
    // First row is headers
    const headers = data.values[0].map((h: string) => h.trim());
    const rows = data.values.slice(1);
    
    // Convert rows to objects
    const matchData: MatchData[] = rows.map((row: string[]) => {
      const match: MatchData = {};
      headers.forEach((header: string, index: number) => {
        const value = row[index] || '';
        const lowerHeader = header.toLowerCase();
        
        // Don't parse dates as numbers - keep them as strings
        // Date columns typically have "date" in the name
        if (lowerHeader.includes('date')) {
          match[header] = value;
        } else {
          // Try to parse as number if possible (but not if it looks like a date string)
          // Check if it looks like a date string (MM/DD/YYYY or similar formats)
          const looksLikeDate = /^\d{1,2}\/\d{1,2}\/\d{4}/.test(value) || 
                                 /^\d{4}-\d{1,2}-\d{1,2}/.test(value);
          
          if (looksLikeDate) {
            match[header] = value; // Keep date strings as strings
          } else {
            const numValue = parseFloat(value);
            match[header] = isNaN(numValue) ? value : numValue;
          }
        }
      });
      return match;
    });
    
    return matchData;
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
}

/**
 * Appends a new row to Google Sheets
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
  const { spreadsheetId, range, apiKey } = config;
  
  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID is required');
  }
  
  if (!apiKey) {
    throw new Error('API key is required for writing to sheets');
  }

  // Extract sheet name from range (e.g., "Match Log" from "Match Log!A1:ZZ1000")
  const sheetName = range.split('!')[0];
  
  // Build the row array in the same order as columnKeys
  // Use empty string for missing values
  const rowValues = columnKeys.map(key => {
    const value = rowData[key];
    if (value === undefined || value === null) {
      return '';
    }
    // Convert to string for the API
    return String(value);
  });

  // Use the append endpoint
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=RAW&key=${apiKey}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      const errorMessage = data.error?.message || response.statusText;
      
      if (response.status === 403) {
        throw new Error(`Access denied: ${errorMessage}. Please check your API key and ensure the sheet is writable.`);
      }
      if (response.status === 404) {
        throw new Error(`Spreadsheet not found: ${errorMessage}. Please check the spreadsheet ID and sheet name.`);
      }
      if (response.status === 400) {
        throw new Error(`Invalid request: ${errorMessage}. Please check the data format.`);
      }
      throw new Error(`Failed to append row (${response.status}): ${errorMessage}`);
    }
    
    return;
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

/**
 * Fetches merged match data from both Google Sheets and PostgreSQL
 * This calls the backend API endpoint that merges data from both sources
 */
export async function fetchMergedMatchData(options?: {
  range?: string;
  teamId?: number;
  startDate?: string;
  endDate?: string;
}): Promise<MatchData[]> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const params = new URLSearchParams();
  
  if (options?.range) {
    params.append('range', options.range);
  }
  if (options?.teamId) {
    params.append('teamId', String(options.teamId));
  }
  if (options?.startDate) {
    params.append('startDate', options.startDate);
  }
  if (options?.endDate) {
    params.append('endDate', options.endDate);
  }
  
  const url = `${apiUrl}/api/sheets/merged${params.toString() ? `?${params.toString()}` : ''}`;
  
  try {
    const response = await fetch(url, {
      credentials: 'include', // Include cookies for authentication
    });
    
    if (!response.ok) {
      // Provide more detailed error information
      let errorMessage = `Failed to fetch merged data: ${response.status} ${response.statusText}`;
      
      // Handle different error status codes
      if (response.status === 401 || response.status === 403) {
        errorMessage = 'Authentication required. Please log in to view match data.';
      } else if (response.status === 404) {
        errorMessage = 'API endpoint not found. Please check that the backend server is running and the endpoint is available.';
      } else {
        // Try to parse error response
        try {
          const errorText = await response.text();
          if (errorText) {
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.error) {
                errorMessage = `Failed to fetch merged data: ${errorJson.error}`;
              }
            } catch {
              // If not JSON, use the text as-is
              errorMessage = `Failed to fetch merged data: ${errorText}`;
            }
          }
        } catch {
          // If we can't read the response, use the status text
        }
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching merged match data:', error);
    throw error;
  }
}
