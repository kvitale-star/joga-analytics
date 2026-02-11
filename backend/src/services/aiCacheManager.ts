/**
 * AI Cache Manager Service
 * Manages Gemini Context Cache metadata and lifecycle
 */

import { db } from '../db/database.js';
import { AIContextCacheRow, NewAIContextCache } from '../db/schema.js';
import crypto from 'crypto';

export interface CacheMetadata {
  teamId: number;
  cacheType: 'combined' | 'framework_only' | 'data_only';
  cacheId: string; // Gemini's cachedContent name
  dataHash: string;
  expiresAt: Date;
}

/**
 * Get stored cache metadata for a team
 */
export async function getStoredCache(
  teamId: number,
  cacheType: 'combined' | 'framework_only' | 'data_only' = 'combined'
): Promise<AIContextCacheRow | null> {
  const cache = await db
    .selectFrom('ai_context_cache')
    .selectAll()
    .where('team_id', '=', teamId)
    .where('cache_type', '=', cacheType)
    .orderBy('created_at', 'desc')
    .limit(1)
    .executeTakeFirst();

  return cache || null;
}

/**
 * Check if cache is valid (not expired and data hasn't changed)
 */
export function isCacheValid(
  cache: AIContextCacheRow,
  currentDataHash: string
): boolean {
  // Check expiration
  const expiresAt = new Date(cache.expires_at);
  const now = new Date();
  if (expiresAt < now) {
    console.log('📊 Cache expired:', cache.cache_id);
    return false;
  }

  // Check data hash (detect if match data changed)
  if (cache.data_hash !== currentDataHash) {
    console.log('📊 Cache invalidated due to data change:', cache.cache_id);
    return false;
  }

  return true;
}

/**
 * Store cache metadata in database
 */
export async function storeCacheMetadata(metadata: CacheMetadata): Promise<AIContextCacheRow> {
  // Invalidate any existing cache for this team/type
  await invalidateTeamCache(metadata.teamId, metadata.cacheType);

  // Insert new cache metadata
  const newCache: NewAIContextCache = {
    team_id: metadata.teamId,
    cache_type: metadata.cacheType,
    cache_id: metadata.cacheId,
    data_hash: metadata.dataHash,
    expires_at: metadata.expiresAt.toISOString(),
  };

  const inserted = await db
    .insertInto('ai_context_cache')
    .values(newCache)
    .returningAll()
    .executeTakeFirstOrThrow();

  console.log('✅ Cache metadata stored:', inserted.cache_id);
  return inserted;
}

/**
 * Hash match data to detect changes
 * Returns a hash string that changes when match data changes
 */
export function hashMatchData(matches: any[]): string {
  // Create a simple hash of match data
  // Include: match count, latest match date, and a hash of match IDs
  const matchIds = matches.map(m => m.id || m.match_id).sort().join(',');
  const latestMatchDate = matches.length > 0 
    ? (matches[0].match_date || matches[0].date || '')
    : '';
  const matchCount = matches.length;

  const dataString = `${matchCount}:${latestMatchDate}:${matchIds}`;
  return crypto.createHash('sha256').update(dataString).digest('hex').substring(0, 16);
}

/**
 * Invalidate cache for a team (delete from database)
 * Called when match data changes, training logs added, etc.
 */
export async function invalidateTeamCache(
  teamId: number,
  cacheType: 'combined' | 'framework_only' | 'data_only' = 'combined'
): Promise<void> {
  await db
    .deleteFrom('ai_context_cache')
    .where('team_id', '=', teamId)
    .where('cache_type', '=', cacheType)
    .execute();

  console.log(`🗑️  Invalidated cache for team ${teamId}, type ${cacheType}`);
}

/**
 * Clean up expired caches (maintenance function)
 */
export async function cleanupExpiredCaches(): Promise<number> {
  const now = new Date().toISOString();
  
  // Query expired caches first to get count
  const expiredCaches = await db
    .selectFrom('ai_context_cache')
    .select('id')
    .where('expires_at', '<', now)
    .execute();

  const deletedCount = expiredCaches.length;
  
  // Delete expired caches
  if (deletedCount > 0) {
    await db
      .deleteFrom('ai_context_cache')
      .where('expires_at', '<', now)
      .execute();
    console.log(`🧹 Cleaned up ${deletedCount} expired cache(s)`);
  }
  
  return deletedCount;
}
