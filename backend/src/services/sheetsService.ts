/**
 * Backend Google Sheets Service
 * Fetches data from Google Sheets API using backend credentials
 */

interface SheetDataResponse {
  values: string[][];
}

interface MatchData {
  [key: string]: string | number;
}

/**
 * Fetches data from Google Sheets using the Sheets API
 */
export async function fetchSheetData(range: string): Promise<MatchData[]> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

  console.log('📊 Sheets Service - Checking environment variables...');
  console.log('  GOOGLE_SHEETS_SPREADSHEET_ID:', spreadsheetId ? `${spreadsheetId.substring(0, 10)}...` : 'NOT SET');
  console.log('  GOOGLE_SHEETS_API_KEY:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');

  if (!spreadsheetId) {
    console.error('❌ GOOGLE_SHEETS_SPREADSHEET_ID is not set');
    throw new Error('Backend configuration error: GOOGLE_SHEETS_SPREADSHEET_ID environment variable is not set. Please configure this in your backend .env file or deployment environment variables.');
  }

  if (!apiKey) {
    console.error('❌ GOOGLE_SHEETS_API_KEY is not set');
    throw new Error('Backend configuration error: GOOGLE_SHEETS_API_KEY environment variable is not set. Please configure this in your backend .env file or deployment environment variables.');
  }

  // URL encode the range to handle special characters like spaces in sheet names
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?key=${apiKey}`;

  console.log('📊 Fetching from Google Sheets API...');
  console.log('  Range:', range);
  console.log('  URL:', url.replace(apiKey, 'API_KEY_HIDDEN'));

  try {
    const response = await fetch(url);
    const data = await response.json() as SheetDataResponse;
    
    console.log('📊 Google Sheets API Response Status:', response.status);

    if (!response.ok) {
      const errorMessage = (data as any).error?.message || response.statusText;
      const errorDetails = (data as any).error?.details || [];
      const fullError = errorDetails.length > 0 
        ? `${errorMessage} (${errorDetails.map((d: any) => d.message || d).join(', ')})`
        : errorMessage;

      console.error('📊 Google Sheets API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: (data as any).error,
        fullError,
      });

      if (response.status === 403) {
        throw new Error(`Google Sheets API access denied: ${fullError}. Please check: 1) API key has Sheets API enabled, 2) Sheet is public or API key has access, 3) API key quota not exceeded.`);
      }
      if (response.status === 404) {
        throw new Error(`Spreadsheet not found: ${fullError}. Please verify: 1) Spreadsheet ID is correct, 2) Sheet name in range exists (e.g., "Match Log" in "Match Log!A1:ZZ1000").`);
      }
      if (response.status === 400) {
        throw new Error(`Invalid request: ${fullError}. Please check the range format (e.g., "Sheet1!A1:Z100").`);
      }
      throw new Error(`Google Sheets API error (${response.status}): ${fullError}`);
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
        if (lowerHeader.includes('date')) {
          match[header] = value;
        } else {
          // Try to parse as number if possible (but not if it looks like a date string)
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
 * Fetches column metadata from a "Metadata" tab in Google Sheets
 */
export async function fetchColumnMetadata(range: string): Promise<Record<string, any>> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

  if (!spreadsheetId || !apiKey) {
    return {};
  }

  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json() as SheetDataResponse;

    if (!response.ok || !data.values || data.values.length === 0) {
      return {};
    }

    // First row is headers
    const headers = data.values[0].map((h: string) => h.trim().toLowerCase());
    const rows = data.values.slice(1);

    // Convert to object keyed by column name
    const metadata: Record<string, any> = {};
    rows.forEach((row: string[]) => {
      const columnName = row[0]?.trim();
      if (columnName) {
        const columnMeta: Record<string, any> = {};
        headers.forEach((header: string, index: number) => {
          if (index > 0 && row[index]) {
            columnMeta[header] = row[index].trim();
          }
        });
        metadata[columnName] = columnMeta;
      }
    });

    return metadata;
  } catch (error) {
    console.error('Error fetching column metadata:', error);
    return {};
  }
}

/**
 * Appends a new row to Google Sheets
 */
export async function appendRowToSheet(
  sheetName: string,
  columnKeys: string[],
  rowData: Record<string, string | number>
): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

  if (!spreadsheetId) {
    throw new Error('Backend configuration error: GOOGLE_SHEETS_SPREADSHEET_ID environment variable is not set. Please configure this in your backend .env file or deployment environment variables.');
  }

  if (!apiKey) {
    throw new Error('Backend configuration error: GOOGLE_SHEETS_API_KEY environment variable is not set. Please configure this in your backend .env file or deployment environment variables.');
  }

  // Build the row array in the same order as columnKeys
  const rowValues = columnKeys.map(key => {
    const value = rowData[key];
    if (value === undefined || value === null) {
      return '';
    }
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

    const data = await response.json() as any;

    if (!response.ok) {
      const errorMessage = (data as any).error?.message || response.statusText;

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
