#!/usr/bin/env node

/**
 * Wait for backend to be ready before building frontend
 * This prevents frontend build failures when backend hasn't finished building yet
 * 
 * Usage: node scripts/wait-for-backend.js [backend-url] [max-wait-seconds]
 * 
 * Example: node scripts/wait-for-backend.js https://your-backend.railway.app/api 300
 */

const BACKEND_URL = process.env.VITE_API_URL?.replace('/api', '') || process.argv[2] || 'http://localhost:3001';
const MAX_WAIT_SECONDS = parseInt(process.argv[3] || process.env.RAILWAY_BACKEND_WAIT_SECONDS || '300', 10);
const HEALTH_CHECK_ENDPOINT = `${BACKEND_URL}/api/health`;
const CHECK_INTERVAL_MS = 5000; // Check every 5 seconds
const MAX_ATTEMPTS = Math.floor((MAX_WAIT_SECONDS * 1000) / CHECK_INTERVAL_MS);

let attempts = 0;

async function checkBackendHealth() {
  try {
    const response = await fetch(HEALTH_CHECK_ENDPOINT, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Add a timeout to prevent hanging
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      console.log('✅ Backend is healthy:', data);
      return true;
    } else {
      console.log(`⏳ Backend not ready yet (status: ${response.status}), waiting...`);
      return false;
    }
  } catch (error) {
    // Network errors are expected if backend isn't up yet
    if (error.name === 'AbortError') {
      console.log('⏳ Backend health check timed out, waiting...');
    } else if (error.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
      console.log('⏳ Backend not reachable yet, waiting...');
    } else {
      console.log(`⏳ Backend check failed: ${error.message}, waiting...`);
    }
    return false;
  }
}

async function waitForBackend() {
  console.log(`🔍 Waiting for backend at ${HEALTH_CHECK_ENDPOINT}`);
  console.log(`⏱️  Maximum wait time: ${MAX_WAIT_SECONDS} seconds (${MAX_ATTEMPTS} attempts)`);

  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    console.log(`📡 Attempt ${attempts}/${MAX_ATTEMPTS}...`);

    const isHealthy = await checkBackendHealth();
    
    if (isHealthy) {
      console.log(`✅ Backend is ready! Proceeding with frontend build...`);
      process.exit(0);
    }

    // Wait before next attempt (except on last attempt)
    if (attempts < MAX_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
    }
  }

  // If we get here, backend never became healthy
  console.error(`❌ Backend did not become healthy within ${MAX_WAIT_SECONDS} seconds`);
  console.error(`   Checked ${MAX_ATTEMPTS} times at ${HEALTH_CHECK_ENDPOINT}`);
  console.error(`   This might mean:`);
  console.error(`   - Backend is still building`);
  console.error(`   - Backend URL is incorrect: ${BACKEND_URL}`);
  console.error(`   - Backend has a different health check endpoint`);
  console.error(`   - Network connectivity issues`);
  console.error(`\n   Proceeding with frontend build anyway (may fail if backend isn't ready)...`);
  
  // Exit with code 0 to allow build to continue (non-blocking)
  // Change to process.exit(1) if you want to fail the build when backend isn't ready
  process.exit(0);
}

// Run the wait function
waitForBackend().catch(error => {
  console.error('❌ Error waiting for backend:', error);
  console.error('   Proceeding with frontend build anyway...');
  process.exit(0); // Non-blocking - allows build to continue
});
