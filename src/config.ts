import { SheetConfig } from './types';

// Configuration for your Google Sheet
// Note: Credentials are now managed by the backend for security
// The backend handles API keys and spreadsheet ID via environment variables
export const sheetConfig: SheetConfig = {
  // Range to fetch (e.g., 'Sheet1!A1:Z100' or just 'Sheet1' for all data)
  // Using A1:ZZ1000 to include up to 702 columns (enough for most use cases)
  // Or use just 'Match Log' to fetch all data from the sheet
  range: 'Match Log!A1:ZZ1000',
  
  // spreadsheetId and apiKey are no longer needed here - backend handles them
  // They are configured via backend environment variables:
  // GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SHEETS_API_KEY
};

