// Load .env file BEFORE any test files or database imports
// This runs via Jest's setupFiles (before test files are loaded)
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load backend/.env file explicitly
const envPath = join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

// Set NODE_ENV to test if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Allow separate test DB connection string so tests don't hit dev/prod DB.
if (process.env.DATABASE_URL_TEST && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}
