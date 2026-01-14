# Backend Setup Example (Raw SQL)

> **Note:** For a cleaner, type-safe approach, see `backend-setup-kysely.md` which uses Kysely query builder.

This is a minimal working example using raw SQL. If you prefer cleaner code, use the Kysely version instead.

## Project Structure

```
joga-analytics/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── database.ts
│   │   │   └── migrations.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   └── index.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   └── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
└── (your existing frontend)
```

## Backend package.json

```json
{
  "name": "joga-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "@sendgrid/mail": "^8.1.0",
    "better-sqlite3": "^9.2.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/better-sqlite3": "^7.6.9",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

## Backend src/db/database.ts

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use same database file for local and production
// For production, ensure the data/ directory is writable and backed up
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/joga.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Optimize for production use
db.pragma('journal_mode = WAL'); // Better concurrency
db.pragma('synchronous = NORMAL'); // Good balance of speed and safety

export default db;
```

## Backend src/db/migrations.ts

```typescript
import db from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    );
  `);

  // Get current version
  const currentVersion = db.prepare('SELECT MAX(version) as version FROM schema_migrations').get() as { version: number | null };
  const version = currentVersion.version || 0;

  // Read migration file (copy from frontend)
  const migrationPath = path.join(__dirname, '../../migrations/001_initial_schema.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  if (version < 1) {
    console.log('Running migration 001...');
    db.exec(migrationSQL);
    db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)')
      .run(1, 'Initial schema');
    console.log('Migration 001 completed');
  }
}
```

## Backend src/server.ts

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runMigrations } from './db/migrations.js';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Initialize database
runMigrations();

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
```

## Backend src/routes/auth.ts

```typescript
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as any;
  
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );

  // Update last login
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
    .run(new Date().toISOString(), user.id);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: Boolean(user.email_verified),
    },
    token,
  });
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  const userId = (req as any).userId;
  const user = db.prepare('SELECT id, email, name, role, email_verified, preferences FROM users WHERE id = ?')
    .get(userId) as any;

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: Boolean(user.email_verified),
    preferences: JSON.parse(user.preferences || '{}'),
  });
});

// ... more routes

export default router;
```

## Backend src/middleware/auth.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    (req as any).userId = user.userId;
    (req as any).userRole = user.role;
    next();
  });
}
```

## Backend .env

```env
# Server
PORT=3001
FRONTEND_URL=http://localhost:3000

# Database (SQLite - same for local and production!)
# For production, use absolute path or ensure data/ directory is writable
DATABASE_PATH=./data/joga.db

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# SendGrid
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

**Note:** SQLite file will be in `backend/data/joga.db`. Make sure to:
- Backup this file regularly
- Keep it in a persistent volume on your server
- Don't commit it to git (add to .gitignore)

## Frontend .env

```env
# API Configuration
VITE_API_URL=http://localhost:3001/api
VITE_USE_BACKEND=true

# Email (now handled by backend)
VITE_EMAIL_SERVICE_ENABLED=true
```

## Running Locally

1. **Backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Frontend:**
   ```bash
   npm run dev
   ```

Both run simultaneously, frontend calls backend API.

## Next Steps

1. Port all your migrations
2. Create all API endpoints
3. Update frontend services to use API
4. Test thoroughly
5. Deploy!
