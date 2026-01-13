// Import sql.js - it's a CommonJS module that Vite converts to ESM
// We'll use dynamic import to handle the async initialization
import type { Database as SqlJsDatabase } from 'sql.js';

// Cache for the import promise
let sqlJsImport: Promise<any> | null = null;

// Database instance (sql.js uses async initialization)
let dbInstance: SqlJsDatabase | null = null;
let dbInitPromise: Promise<SqlJsDatabase> | null = null;

// Database storage key in IndexedDB/localStorage
const DB_STORAGE_KEY = 'joga_database';

// Global sql.js loader function (will be set when script loads)
declare global {
  interface Window {
    initSqlJs?: any;
  }
}

/**
 * Load sql.js via script tag (fallback for Vite import issues)
 */
function loadSqlJsViaScript(): Promise<any> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.initSqlJs) {
      resolve(window.initSqlJs);
      return;
    }
    
    // Check if script is already loading
    if (document.querySelector('script[data-sqljs]')) {
      // Wait for it to load
      const checkInterval = setInterval(() => {
        if (window.initSqlJs) {
          clearInterval(checkInterval);
          resolve(window.initSqlJs);
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('sql.js script load timeout'));
      }, 10000);
      return;
    }
    
    // Load sql.js from CDN via script tag
    const script = document.createElement('script');
    script.src = 'https://sql.js.org/dist/sql-wasm.js';
    script.setAttribute('data-sqljs', 'true');
    script.async = true;
    
    script.onload = () => {
      // sql.js exposes initSqlJs globally when loaded via script tag
      // Wait a bit for it to initialize, then check multiple possible locations
      setTimeout(() => {
        const initFn = window.initSqlJs || (window as any).initSqlJs || (globalThis as any).initSqlJs;
        if (initFn && typeof initFn === 'function') {
          resolve(initFn);
        } else {
          // sql.js might expose it differently - check for the function directly
          const possibleInit = (window as any).initSqlJs || (globalThis as any).initSqlJs;
          if (possibleInit && typeof possibleInit === 'function') {
            resolve(possibleInit);
          } else {
            reject(new Error('sql.js loaded but initSqlJs not found on window'));
          }
        }
      }, 200);
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load sql.js script from CDN'));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Initialize SQL.js and load/create database
 */
async function initDatabase(): Promise<SqlJsDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = (async () => {
    try {
      // Load SQL.js - try dynamic import first, fallback to script tag
      let SQL: any;
      let initSqlJsFn: any = null;
      
      // Method 1: Try dynamic import (works if Vite handles it correctly)
      try {
        if (!sqlJsImport) {
          // Try namespace import pattern
          sqlJsImport = import('sql.js').then(module => {
            // sql.js might export as namespace
            return module;
          });
        }
        const sqlJsModule = await sqlJsImport;
        
        // Try to get initSqlJs from the module
        // sql.js exports initSqlJs, not as default in some cases
        initSqlJsFn = (sqlJsModule as any).default || 
                      (sqlJsModule as any).initSqlJs ||
                      (typeof sqlJsModule === 'function' ? sqlJsModule : null);
        
        // If module is empty, it's a Vite issue - use script tag fallback
        if (Object.keys(sqlJsModule).length === 0) {
          console.warn('sql.js module is empty. Falling back to script tag loading...');
          initSqlJsFn = null; // Will trigger script tag load below
        }
        
        // If we got a function, validate it
        if (initSqlJsFn && typeof initSqlJsFn !== 'function') {
          initSqlJsFn = null;
        }
      } catch (importError) {
        console.warn('Dynamic import failed, will try script tag method:', importError);
        initSqlJsFn = null; // Will trigger script tag load below
      }
      
      // Method 2: Fallback to script tag loading if dynamic import failed
      if (!initSqlJsFn || typeof initSqlJsFn !== 'function') {
        console.log('Loading sql.js via script tag (CDN)...');
        initSqlJsFn = await loadSqlJsViaScript();
      }
      
      if (!initSqlJsFn || typeof initSqlJsFn !== 'function') {
        throw new Error('Failed to load sql.js via all methods. Please check your internet connection.');
      }
      
      // Initialize SQL.js with WASM file location
      SQL = await initSqlJsFn({
        locateFile: (file: string) => {
          // Load WASM from CDN
          if (file.endsWith('.wasm')) {
            return `https://sql.js.org/dist/${file}`;
          }
          return file;
        },
      });

      // Try to load existing database from localStorage
      const savedDb = localStorage.getItem(DB_STORAGE_KEY);
      
      let newDbInstance: SqlJsDatabase;
      if (savedDb) {
        try {
          const uint8Array = Uint8Array.from(JSON.parse(savedDb));
          newDbInstance = new SQL.Database(uint8Array);
        } catch (loadError) {
          console.warn('Failed to load saved database, creating new one:', loadError);
          newDbInstance = new SQL.Database();
        }
      } else {
        // Create new database
        newDbInstance = new SQL.Database();
      }

      // Enable foreign keys
      try {
        newDbInstance.run('PRAGMA foreign_keys = ON;');
      } catch (pragmaError) {
        console.warn('Failed to enable foreign keys:', pragmaError);
        // Continue anyway
      }

      dbInstance = newDbInstance;
      return newDbInstance;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  })();

  return dbInitPromise;
}

/**
 * Get or create database instance
 */
export async function getDatabase(): Promise<SqlJsDatabase> {
  return initDatabase();
}

/**
 * Save database to localStorage
 */
export function saveDatabase(db: SqlJsDatabase): void {
  try {
    const data = db.export();
    const array = Array.from(data);
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(array));
  } catch (error) {
    console.error('Failed to save database:', error);
  }
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    saveDatabase(dbInstance);
    dbInstance.close();
    dbInstance = null;
    dbInitPromise = null;
  }
}

/**
 * Run a migration (SQL script)
 */
export async function runMigration(db: SqlJsDatabase, sql: string): Promise<void> {
  // Split by semicolon, but preserve multi-line statements
  // First, remove single-line comments (-- comments)
  const lines = sql.split('\n');
  const cleanedLines = lines.map(line => {
    const commentIndex = line.indexOf('--');
    if (commentIndex >= 0) {
      // Check if it's inside a string (basic check)
      const beforeComment = line.substring(0, commentIndex);
      const quoteCount = (beforeComment.match(/'/g) || []).length;
      if (quoteCount % 2 === 0) {
        // Even number of quotes means comment is not inside a string
        return beforeComment;
      }
    }
    return line;
  });
  
  const cleanedSql = cleanedLines.join('\n');
  
  // Split by semicolon
  const statements = cleanedSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  console.log(`Split migration into ${statements.length} statements`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement) continue; // Skip empty statements
    
    // Log CREATE TABLE statements for debugging
    if (/CREATE\s+TABLE/i.test(statement)) {
      const tableMatch = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
      if (tableMatch) {
        console.log(`[${i + 1}/${statements.length}] Executing CREATE TABLE for: ${tableMatch[1]}`);
        console.log(`Statement preview: ${statement.substring(0, 200)}...`);
      }
    }
    
    // Check if this is a CREATE INDEX statement
    const createIndexMatch = statement.match(/CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s+ON\s+(\w+)/i);
    if (createIndexMatch) {
      const indexName = createIndexMatch[1];
      const tableName = createIndexMatch[2];
      
      // First, check if the table exists
      try {
        const tableCheckStmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?");
        tableCheckStmt.bind([tableName]);
        if (!tableCheckStmt.step()) {
          // Table doesn't exist
          tableCheckStmt.free();
          throw new Error(`Cannot create index ${indexName}: table ${tableName} does not exist. This suggests table creation failed earlier in the migration.`);
        }
        tableCheckStmt.free();
      } catch (tableCheckError: any) {
        if (tableCheckError.message && tableCheckError.message.includes('does not exist')) {
          throw tableCheckError;
        }
        console.warn(`Could not verify table ${tableName} exists, attempting to create index anyway`);
      }
      
      // Then check if the index already exists
      try {
        const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name=?");
        stmt.bind([indexName]);
        if (stmt.step()) {
          // Index exists
          stmt.free();
          console.log(`Index ${indexName} already exists, skipping creation`);
          continue;
        }
        stmt.free();
      } catch (checkError) {
        // If check fails, try to create anyway
        console.warn(`Could not check if index ${indexName} exists, attempting to create`);
      }
    }
    
    try {
      db.run(statement);
      
      // Log successful CREATE TABLE statements
      if (/CREATE\s+TABLE/i.test(statement)) {
        const tableMatch = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
        if (tableMatch) {
          console.log(`✓ Successfully created table: ${tableMatch[1]}`);
        }
      }
    } catch (error: any) {
      const errorMsg = (error?.message || String(error) || '').toLowerCase();
      const errorStr = String(error).toLowerCase();
      
      // Check statement types
      const isCreateTable = /CREATE\s+TABLE/i.test(statement);
      const isCreateIndex = /CREATE\s+INDEX/i.test(statement);
      
      // NEVER ignore errors for CREATE TABLE - these are critical
      if (isCreateTable) {
        const tableMatch = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
        const tableName = tableMatch ? tableMatch[1] : 'unknown';
        console.error(`CRITICAL: CREATE TABLE statement failed for table: ${tableName}`);
        console.error('Full statement:', statement);
        console.error('Error message:', errorMsg);
        console.error('Error object:', error);
        throw new Error(`CREATE TABLE failed for ${tableName}: ${errorMsg}. Check console for full statement.`);
      }
      
      // Never ignore "no such table" errors
      if (errorMsg.includes('no such table') || errorStr.includes('no such table')) {
        console.error('CRITICAL: Table does not exist. This suggests a previous CREATE TABLE statement failed.');
        console.error('Failed statement:', statement.substring(0, 200));
        throw new Error(`Table does not exist. Original error: ${errorMsg}. This usually means a CREATE TABLE statement failed earlier.`);
      }
      
      // For CREATE INDEX, only ignore if index already exists
      if (isCreateIndex) {
        if (errorMsg.includes('already exists') || errorStr.includes('already exists') ||
            (errorMsg.includes('index') && (errorMsg.includes('exists') || errorMsg.includes('duplicate')))) {
          console.log('Ignoring expected error (index already exists):', errorMsg.substring(0, 100));
          continue;
        }
        // For other CREATE INDEX errors, throw
        console.error('CREATE INDEX failed:', statement.substring(0, 200));
        throw error;
      }
      
      // For other statements (ALTER, etc.), check for "already exists" patterns
      if (errorMsg.includes('already exists') || 
          errorStr.includes('already exists') ||
          errorMsg.includes('duplicate column') ||
          errorMsg.includes('duplicate table') ||
          errorMsg.includes('unique constraint failed')) {
        console.log('Ignoring expected error (object already exists):', errorMsg.substring(0, 100));
        continue;
      }
      
      // For all other errors, log and throw
      console.error('Migration statement failed:', statement.substring(0, 200));
      console.error('Full error object:', error);
      console.error('Error message:', errorMsg);
      throw error;
    }
  }
  
  saveDatabase(db);
}

/**
 * Get current schema version
 */
export async function getCurrentVersion(db: SqlJsDatabase): Promise<number> {
  try {
    const result = db.exec('SELECT MAX(version) as version FROM schema_migrations');
    if (result.length > 0 && result[0].values.length > 0) {
      const version = result[0].values[0][0];
      return typeof version === 'number' ? version : 0;
    }
    return 0;
  } catch {
    // Table doesn't exist yet
    return 0;
  }
}

/**
 * Record migration in schema_migrations table
 */
export async function recordMigration(
  db: SqlJsDatabase,
  version: number,
  description: string
): Promise<void> {
  try {
    const stmt = db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)');
    stmt.run([version, description]);
    stmt.free();
    saveDatabase(db);
  } catch (error: any) {
    // If schema_migrations doesn't exist yet, that's OK - it will be created in the first migration
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes('no such table')) {
      console.warn('schema_migrations table does not exist yet. Migration will be recorded after table is created.');
      // Don't throw - the migration itself succeeded
    } else {
      throw error;
    }
  }
}

/**
 * Helper to execute a SELECT query and get first result
 */
export async function queryOne<T = any>(
  db: SqlJsDatabase,
  sql: string,
  params: any[] = []
): Promise<T | null> {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    
    if (stmt.step()) {
      const result = stmt.getAsObject() as T;
      stmt.free();
      return result;
    }
    
    stmt.free();
    return null;
  } catch (error) {
    console.error('Query error:', error, 'SQL:', sql, 'Params:', params);
    throw error;
  }
}

/**
 * Helper to execute a SELECT query and get all results
 */
export async function queryAll<T = any>(
  db: SqlJsDatabase,
  sql: string,
  params: any[] = []
): Promise<T[]> {
  try {
    const stmt = db.prepare(sql);
    if (params && params.length > 0) {
      stmt.bind(params);
    }
    
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    
    stmt.free();
    return results;
  } catch (error) {
    console.error('Query error:', error, 'SQL:', sql, 'Params:', params);
    throw error;
  }
}

/**
 * Helper to execute INSERT/UPDATE/DELETE
 */
export async function execute(
  db: SqlJsDatabase,
  sql: string,
  params: any[] = []
): Promise<{ lastInsertRowid: number; changes: number }> {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    
    // Get last insert rowid (sql.js doesn't have a direct method, need to query)
    let lastInsertRowid = 0;
    try {
      const result = db.exec('SELECT last_insert_rowid() as id');
      if (result.length > 0 && result[0].values.length > 0) {
        lastInsertRowid = result[0].values[0][0] as number || 0;
      }
    } catch {
      // If query fails, lastInsertRowid stays 0
    }
    
    const changes = db.getRowsModified();
    
    stmt.free();
    saveDatabase(db);
    
    return { lastInsertRowid, changes };
  } catch (error) {
    console.error('Execute error:', error, 'SQL:', sql, 'Params:', params);
    throw error;
  }
}

