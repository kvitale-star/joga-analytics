/**
 * Standalone migration script
 * Run migrations manually: npm run migrate
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from backend/.env for local runs.
// (Railway provides env vars directly, but local `npm run migrate` needs this.)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Prefer loading from current working directory (when running from backend/, this is backend/.env)
dotenv.config();

// Fallback: explicitly load backend/.env based on this file location
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: join(__dirname, '..', '..', '..', '.env') });
}

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL is still not set after loading .env. cwd:', process.cwd());
} else {
  console.log('✅ DATABASE_URL loaded for migration');
}

async function main() {
  // IMPORTANT: import after dotenv, because migrations import database.ts (which requires DATABASE_URL)
  const { runMigrations } = await import('./migrations.js');
  await runMigrations();
}

main()
  .then(() => {
    console.log('✅ Migrations completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
