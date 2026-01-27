#!/usr/bin/env node
/**
 * Ensure backend is built before starting
 * Only rebuilds if dist/server.js doesn't exist or source files are newer
 * This prevents crashes if Railway's build command already built the project
 */

import { existsSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendRoot = join(__dirname, '..');
const distServer = join(backendRoot, 'dist', 'server.js');
const srcServer = join(backendRoot, 'src', 'server.ts');

function needsRebuild() {
  // If dist/server.js doesn't exist, we need to build
  if (!existsSync(distServer)) {
    console.log('📦 dist/server.js not found, building...');
    return true;
  }

  // If src/server.ts doesn't exist (shouldn't happen), skip
  if (!existsSync(srcServer)) {
    console.log('⚠️  src/server.ts not found, skipping build check');
    return false;
  }

  // Check if source is newer than compiled
  try {
    const srcTime = statSync(srcServer).mtimeMs;
    const distTime = statSync(distServer).mtimeMs;
    
    if (srcTime > distTime) {
      console.log('📦 Source files are newer than dist, rebuilding...');
      return true;
    }
  } catch (error) {
    // If we can't check timestamps, rebuild to be safe
    console.log('⚠️  Could not check file timestamps, rebuilding to be safe...');
    return true;
  }

  // No rebuild needed
  console.log('✅ Build is up to date');
  return false;
}

if (needsRebuild()) {
  try {
    console.log('🔨 Running: npm run build');
    execSync('npm run build', {
      cwd: backendRoot,
      stdio: 'inherit',
    });
    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    // Don't exit with error - let Railway's build command handle it
    // If this is during prestart and build fails, npm start won't run
    // which is actually what we want (don't start with broken build)
    process.exit(1);
  }
}
