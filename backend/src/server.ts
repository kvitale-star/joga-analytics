import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { runMigrations } from './db/migrations.js';
import { requireCsrfToken, setCsrfTokenCookie } from './middleware/csrf.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import teamRoutes from './routes/teams.js';
import seasonRoutes from './routes/seasons.js';
import preferenceRoutes from './routes/preferences.js';
import matchRoutes from './routes/matches.js';
import sheetsRoutes from './routes/sheets.js';
import aiRoutes from './routes/ai.js';
import glossaryRoutes from './routes/glossary.js';
import customChartsRoutes from './routes/customCharts.js';

// Load environment variables
// Try to load from backend/.env explicitly
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

// Environment configuration loaded (no sensitive details logged)
// Use deployment dashboard or protected diagnostics endpoint to verify configuration

export const app = express();
// Railway automatically sets PORT - use it or default to 3001 for local dev
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Trust proxy - required for Railway (and other reverse proxies)
// Set to 1 to trust only the first proxy (Railway), which is more secure than 'true'
// This allows Express to correctly identify client IPs from X-Forwarded-For header
app.set('trust proxy', 1);

// Middleware
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
console.log('🔒 CORS configured for origin:', frontendUrl);

// Cookie parser (must be before routes and CORS)
app.use(cookieParser());

// Manual CORS handling to ensure Access-Control-Allow-Credentials is always set
// This is more reliable than the cors middleware for cross-origin scenarios (Railway)
// CRITICAL for Safari: Must set CORS headers correctly for cross-origin cookies
app.use((req, res, next) => {
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', frontendUrl);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-ID, X-CSRF-Token');
    res.setHeader('Access-Control-Expose-Headers', 'X-CSRF-Token'); // Allow frontend to read CSRF token from response headers
    res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours (helps Safari)
    return res.status(204).end();
  }
  
  // Set CORS headers for all other requests
  // CRITICAL: Safari requires exact origin match (no wildcards) when credentials are true
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', frontendUrl); // Must be exact origin, not wildcard
  res.setHeader('Access-Control-Expose-Headers', 'X-CSRF-Token'); // Always expose CSRF token header
  next();
});

// Increase JSON body size limit to handle base64-encoded images
// Base64 encoding increases size by ~33%, and Gemini can handle up to 20 MB images
// Setting limit to 25 MB to provide buffer for base64 encoding overhead
app.use(express.json({ limit: '25mb' }));

// CSRF protection (after cookie parser, before routes)
app.use(setCsrfTokenCookie); // Set CSRF token cookie for authenticated requests
app.use(requireCsrfToken); // Validate CSRF token for state-changing requests

// Content Security Policy headers
app.use((req, res, next) => {
  // CSP for API endpoints - allow same origin only
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'"
  );
  
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
});

// Health check - register EARLY so Railway can check it immediately
// This must be before database initialization so Railway health checks work
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Request logging (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Initialize database and run migrations
export async function initializeDatabase() {
  try {
    await runMigrations();
    console.log('✓ Database initialized and migrations completed');
  } catch (error) {
    console.error('✗ Database initialization failed:', error);
    // Don't exit here - let the caller decide how to handle the error
    // This allows the server to start even if database init fails (for health checks)
    throw error;
  }
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/seasons', seasonRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/sheets', sheetsRoutes);
app.use('/api/glossary', glossaryRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/custom-charts', customChartsRoutes);

// NOTE: /api/config/check endpoint removed for security reasons
// It exposed which environment variables were configured, aiding reconnaissance
// Use server logs or deployment dashboard to verify configuration instead

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

// Start server (when running normally)
export async function startServer() {
  // Railway requires binding to 0.0.0.0, not just localhost
  const HOST = process.env.HOST || '0.0.0.0';

  // CRITICAL: Register signal handlers BEFORE creating server
  // Railway may send SIGTERM immediately, so handlers must be ready
  let server: ReturnType<typeof app.listen> | null = null;
  
  const gracefulShutdown = async (signal: string) => {
    console.log(`⚠️  ${signal} received, shutting down gracefully...`);
    
    if (!server) {
      console.log('⚠️  Server not started yet, exiting immediately');
      process.exit(0);
    }
    
    // Stop accepting new connections
    server.close(async (err) => {
      if (err) {
        console.error('❌ Error closing server:', err);
        process.exit(1);
      } else {
        console.log('✅ HTTP server closed');
      }
      
      // Close database connection
      try {
        const { closeDatabase } = await import('./db/database.js');
        await closeDatabase();
        console.log('✅ Database connection closed');
      } catch (dbError) {
        console.warn('⚠️  Error closing database:', dbError);
      }
      
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds if server doesn't close
    setTimeout(() => {
      console.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };
  
  // Register signal handlers FIRST (before server starts)
  process.on('SIGTERM', () => {
    console.log('📡 SIGTERM signal received');
    gracefulShutdown('SIGTERM').catch((err) => {
      console.error('❌ Error during graceful shutdown:', err);
      process.exit(1);
    });
  });
  
  process.on('SIGINT', () => {
    console.log('📡 SIGINT signal received');
    gracefulShutdown('SIGINT').catch((err) => {
      console.error('❌ Error during graceful shutdown:', err);
      process.exit(1);
    });
  });
  
  // Keep process alive - prevent accidental exits
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    // Don't exit - log and continue (server might still be usable)
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    // Don't exit - log and continue
  });

  // CRITICAL: Start listening IMMEDIATELY so Railway health checks work
  // Initialize database in background - health endpoint doesn't need it
  server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Backend server running on http://${HOST}:${PORT}`);
    console.log(`📊 API available at http://${HOST}:${PORT}/api`);
    console.log(`💚 Health check: http://${HOST}:${PORT}/api/health`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`✅ Server is ready and listening on port ${PORT}`);
    
    // Initialize database in background (non-blocking)
    // This allows Railway health checks to work immediately
    initializeDatabase().catch((error) => {
      console.error('❌ Database initialization failed:', error);
      // Don't exit - server is already running, just log the error
      // Routes that need database will fail gracefully
    });
  });
  
  // Handle server errors
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      console.error('❌ Server error:', error);
      throw error;
    }
  });
  
  return server; // Return server instance for potential cleanup
}

// In test runs we import the app into supertest without listening.
if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
  // Wrap in try-catch to handle any synchronous errors during import
  try {
    startServer().catch((error) => {
      console.error('❌ Failed to start server:', error);
      console.error('Error details:', error instanceof Error ? error.stack : error);
      process.exit(1);
    });
  } catch (error) {
    // Handle synchronous errors (e.g., during module import)
    console.error('❌ Synchronous error during server startup:', error);
    console.error('Error details:', error instanceof Error ? error.stack : error);
    process.exit(1);
  }
}
