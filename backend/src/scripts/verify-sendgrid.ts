/**
 * Verify SendGrid API key and configuration
 */

import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

async function verifySendGrid() {
  console.log('='.repeat(60));
  console.log('SendGrid Configuration Verification');
  console.log('='.repeat(60));
  
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  
  console.log(`API Key Set: ${apiKey ? 'Yes ✓' : 'No ✗'}`);
  if (apiKey) {
    console.log(`API Key Length: ${apiKey.length}`);
    console.log(`Starts with SG.: ${apiKey.startsWith('SG.') ? 'Yes ✓' : 'No ✗'}`);
    console.log(`First 10 chars: ${apiKey.substring(0, 10)}...`);
  }
  
  console.log(`From Email: ${fromEmail || 'Not set ✗'}`);
  console.log('='.repeat(60));
  console.log('');
  
  if (!apiKey) {
    console.error('❌ SENDGRID_API_KEY is not set in backend/.env');
    process.exit(1);
  }
  
  if (!apiKey.startsWith('SG.')) {
    console.error('❌ API key does not start with "SG." - invalid format');
    process.exit(1);
  }
  
  // Set API key
  sgMail.setApiKey(apiKey.trim());
  
  // Try to make a test API call to verify the key
  console.log('Testing API key with SendGrid...');
  try {
    // Use the SendGrid client to test the API key
    // We'll try to get account info (this requires a valid API key)
    const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Key is valid!');
      console.log(`   Account: ${data.username || 'N/A'}`);
      console.log(`   Email: ${data.email || 'N/A'}`);
    } else {
      const errorData = await response.json();
      console.error('❌ API Key validation failed:');
      console.error(`   Status: ${response.status}`);
      if (errorData.errors) {
        errorData.errors.forEach((err: any) => {
          console.error(`   - ${err.message}`);
        });
      }
      
      if (response.status === 401) {
        console.error('');
        console.error('⚠️  The API key is invalid or has been revoked.');
        console.error('   Please check:');
        console.error('   1. The API key in SendGrid dashboard');
        console.error('   2. That the API key has proper permissions');
        console.error('   3. That the API key hasn\'t been deleted or regenerated');
      }
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error testing API key:');
    console.error(error.message);
    process.exit(1);
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('✅ SendGrid configuration is valid!');
  console.log('='.repeat(60));
}

verifySendGrid();
