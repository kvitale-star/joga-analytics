#!/usr/bin/env node
/**
 * Railway start script
 * Ensures build exists, then starts Node directly (not through npm)
 * This allows SIGTERM to reach the Node process for graceful shutdown
 * 
 * Usage: node scripts/start.js
 * 
 * This script ensures the build exists, then uses exec to replace itself
 * with Node running dist/server.js. This makes Node the main process.
 */

import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendRoot = join(__dirname, '..');
const distServer = join(backendRoot, 'dist', 'server.js');

// Ensure build exists
if (!existsSync(distServer)) {
  console.log('📦 dist/server.js not found, building...');
  try {
    execSync('npm run build', {
      cwd: backendRoot,
      stdio: 'inherit',
    });
    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Build exists');
}

// Start Node directly by importing the server module
// This ensures Node is the main process (not npm), so SIGTERM works correctly
console.log('🚀 Starting server...');
console.log(`📁 Server path: ${distServer}`);

// Import the server module - it will automatically call startServer()
// when not in test mode
try {
  const serverUrl = pathToFileURL(distServer).href;
  await import(serverUrl);
  // Server should now be starting - the import triggers startServer() automatically
} catch (error) {
  console.error('❌ Failed to start server:', error);
  if (error instanceof Error) {
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
  process.exit(1);
}
