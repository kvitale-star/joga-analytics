/**
 * Test script for SendGrid email service
 * 
 * Usage: tsx src/scripts/test-email.ts <email> <type>
 * 
 * Examples:
 *   tsx src/scripts/test-email.ts kvitale@gmail.com reset
 *   tsx src/scripts/test-email.ts kvitale@gmail.com verification
 */

import dotenv from 'dotenv';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: join(__dirname, '../../.env') });

const email = process.argv[2];
const type = process.argv[3] || 'reset';

if (!email) {
  console.error('Usage: tsx src/scripts/test-email.ts <email> [reset|verification]');
  console.error('Example: tsx src/scripts/test-email.ts kvitale@gmail.com reset');
  process.exit(1);
}

// Generate a test token
const testToken = 'test-token-' + Date.now();

async function testEmail() {
  console.log('='.repeat(60));
  console.log('Testing SendGrid Email Service');
  console.log('='.repeat(60));
  console.log(`Email: ${email}`);
  console.log(`Type: ${type}`);
  console.log(`SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? 'Set ✓' : 'Not set ✗'}`);
  console.log(`SENDGRID_FROM_EMAIL: ${process.env.SENDGRID_FROM_EMAIL || 'Not set ✗'}`);
  console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL || 'Not set (defaults to http://localhost:3000)'}`);
  console.log('='.repeat(60));
  console.log('');

  try {
    if (type === 'verification') {
      console.log('Sending verification email...');
      await sendVerificationEmail(email, testToken);
      console.log('✓ Verification email sent successfully!');
      console.log(`Check your inbox at: ${email}`);
    } else {
      console.log('Sending password reset email...');
      await sendPasswordResetEmail(email, testToken);
      console.log('✓ Password reset email sent successfully!');
      console.log(`Check your inbox at: ${email}`);
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('Test completed successfully!');
    console.log('='.repeat(60));
  } catch (error: any) {
    console.error('');
    console.error('✗ Error sending email:');
    console.error(error.message);
    console.error('');
    
    if (error.response) {
      console.error('SendGrid API Error Details:');
      console.error(`Status Code: ${error.code || error.response.status}`);
      
      if (error.response.body) {
        if (error.response.body.errors) {
          console.error('Errors:');
          error.response.body.errors.forEach((err: any) => {
            console.error(`  - ${err.message || err}`);
          });
        } else {
          console.error('Response Body:');
          console.error(JSON.stringify(error.response.body, null, 2));
        }
      }
      
      // Specific error messages for common issues
      if (error.code === 401 || error.response.status === 401) {
        console.error('');
        console.error('⚠️  Unauthorized (401) - This usually means:');
        console.error('   1. The API key is invalid or incorrect');
        console.error('   2. The API key has extra spaces or quotes');
        console.error('   3. The API key was revoked or regenerated');
        console.error('');
        console.error('   Check your backend/.env file:');
        console.error('   - Make sure SENDGRID_API_KEY starts with "SG."');
        console.error('   - Remove any quotes around the API key');
        console.error('   - Ensure there are no extra spaces');
      }
    } else {
      console.error('Full error:', error);
    }
    
    process.exit(1);
  }
}

testEmail();
