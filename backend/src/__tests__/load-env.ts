// Load .env file BEFORE any test files or database imports
// This runs via Jest's setupFiles (before test files are loaded)
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load backend/.env file explicitly
const envPath = join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

// Set NODE_ENV to test if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Disable rate limiting in tests for faster, more reliable test runs
process.env.DISABLE_RATE_LIMIT = 'true';

// Configure test database connection
// Priority: DATABASE_URL_TEST > DATABASE_URL > in-memory fallback
if (process.env.DATABASE_URL_TEST) {
  // Use explicit test database URL if provided
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
} else if (!process.env.DATABASE_URL) {
  // If no test DB configured, warn but don't fail
  // Tests should provide DATABASE_URL_TEST or DATABASE_URL in CI/local setup
  console.warn('⚠️  No DATABASE_URL or DATABASE_URL_TEST set. Tests may fail if database connection is required.');
}
