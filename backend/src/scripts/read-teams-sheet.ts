/**
 * Read Teams Sheet Script
 * 
 * Reads the "Teams" tab from Google Sheets to understand team structure
 * and help with migration mapping.
 * 
 * Run with: tsx src/scripts/read-teams-sheet.ts
 */

import { fetchSheetData } from '../services/sheetsService.js';
import dotenv from 'dotenv';

dotenv.config();

async function readTeamsSheet() {
  try {
    console.log('📊 Reading Teams tab from Google Sheets...\n');
    
    // Read the Teams tab - adjust range as needed
    const data = await fetchSheetData('Teams!A1:ZZ1000');
    
    if (data.length === 0) {
      console.log('No data found in Teams tab');
      return;
    }
    
    console.log(`Found ${data.length} row(s) in Teams tab\n`);
    
    // Display all rows
    console.log('Teams Data:');
    console.log('='.repeat(80));
    data.forEach((row, index) => {
      console.log(`\nRow ${index + 1}:`);
      Object.entries(row).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✓ Teams sheet read successfully');
    
  } catch (error: any) {
    console.error('❌ Error reading Teams sheet:', error.message);
    if (error.message.includes('GOOGLE_SHEETS')) {
      console.error('\nMake sure GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SHEETS_API_KEY are set in .env');
    }
    process.exit(1);
  }
}

readTeamsSheet();
