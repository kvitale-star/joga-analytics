import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runMigrations } from './db/migrations.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import teamRoutes from './routes/teams.js';
import preferenceRoutes from './routes/preferences.js';
import matchRoutes from './routes/matches.js';

// Load environment variables
dotenv.config();

const app = express();
// Railway automatically sets PORT - use it or default to 3001 for local dev
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Middleware
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
console.log('🔒 CORS configured for origin:', frontendUrl);

// CORS configuration
const corsOptions = {
  origin: frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Explicitly handle OPTIONS requests (preflight)
app.options('*', cors(corsOptions));

app.use(express.json());

// Request logging (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Initialize database and run migrations
async function initializeDatabase() {
  try {
    await runMigrations();
    console.log('✓ Database initialized and migrations completed');
  } catch (error) {
    console.error('✗ Database initialization failed:', error);
    process.exit(1);
  }
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/matches', matchRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Root path - friendly message for browser access
app.get('/', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>JOGA Backend API</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          background: white;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
          color: #333;
          margin-top: 0;
        }
        .info {
          background: #e3f2fd;
          border-left: 4px solid #2196f3;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .link {
          display: inline-block;
          margin-top: 20px;
          padding: 12px 24px;
          background: #2196f3;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-weight: 500;
        }
        .link:hover {
          background: #1976d2;
        }
        code {
          background: #f5f5f5;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Monaco', 'Courier New', monospace;
        }
        .endpoints {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
        .endpoint {
          margin: 10px 0;
          font-family: monospace;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 JOGA Backend API</h1>
        <div class="info">
          <strong>This is the backend API server.</strong><br>
          The frontend application is running on a different port.
        </div>
        <p>
          <a href="${frontendUrl}" class="link">Go to Frontend Application →</a>
        </p>
        <div class="endpoints">
          <h3>API Endpoints:</h3>
          <div class="endpoint">GET <code>/api/health</code> - Health check</div>
          <div class="endpoint">POST <code>/api/auth/login</code> - Login</div>
          <div class="endpoint">GET <code>/api/auth/me</code> - Get current user</div>
          <div class="endpoint">GET <code>/api/users</code> - Get all users (admin)</div>
          <div class="endpoint">GET <code>/api/teams</code> - Get all teams (admin)</div>
          <div class="endpoint">GET <code>/api/matches</code> - Get all matches</div>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            For API documentation, see the backend README or check the source code.
          </p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// 404 handler - better error message
app.use((req, res) => {
  // If it's an API request (starts with /api), return JSON
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ 
      error: 'Not found',
      message: `The endpoint ${req.path} does not exist.`,
      availableEndpoints: [
        '/api/health',
        '/api/auth/login',
        '/api/auth/me',
        '/api/users',
        '/api/teams',
        '/api/matches',
      ]
    });
  }
  
  // For non-API requests, show HTML
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>404 - Not Found</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
          text-align: center;
        }
        h1 { color: #333; }
        .link {
          display: inline-block;
          margin-top: 20px;
          padding: 12px 24px;
          background: #2196f3;
          color: white;
          text-decoration: none;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <h1>404 - Not Found</h1>
      <p>The path <code>${req.path}</code> does not exist on this server.</p>
      <p>This is the backend API. The frontend is on a different port.</p>
      <a href="${frontendUrl}" class="link">Go to Frontend →</a>
    </body>
    </html>
  `);
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
async function startServer() {
  await initializeDatabase();
  
  // Railway requires binding to 0.0.0.0, not just localhost
  const HOST = process.env.HOST || '0.0.0.0';
  
  app.listen(PORT, HOST, () => {
    console.log(`🚀 Backend server running on http://${HOST}:${PORT}`);
    console.log(`📊 API available at http://${HOST}:${PORT}/api`);
    console.log(`💚 Health check: http://${HOST}:${PORT}/api/health`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
