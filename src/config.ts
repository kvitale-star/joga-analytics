import { SheetConfig } from './types';

// Configuration for your Google Sheet
// Replace these values with your actual sheet information
export const sheetConfig: SheetConfig = {
  // Your Google Sheet ID (found in the URL: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit)
  spreadsheetId: '14IkkUmoTRGtRvaTdjpaWxUMVw4Lfv7MjcP7ajf2Jgyw',
  
  // Range to fetch (e.g., 'Sheet1!A1:Z100' or just 'Sheet1' for all data)
  // Using A1:ZZ1000 to include up to 702 columns (enough for most use cases)
  // Or use just 'Match Log' to fetch all data from the sheet
  range: 'Match Log!A1:ZZ1000',
  
  // Optional: Google API Key (for public sheets)
  // Get one from: https://console.cloud.google.com/apis/credentials
  apiKey: 'AIzaSyAvFCsE4M7uV_pHyZDRUCoQdREiJtVfuCM',
};

// Gemini API Key for the chatbot feature
// Get a free API key from: https://makersuite.google.com/app/apikey
// Add it to your .env file as: VITE_GEMINI_API_KEY=your_api_key_here
// Or set it directly here (not recommended for production):
export const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

