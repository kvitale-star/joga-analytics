/**
 * AI Context Cache
 * Caches formatted context to avoid rebuilding on every chat message
 */

import { MatchData } from '../types';
import { ColumnMetadataMap } from './metadataService';

interface CachedContext {
  dataHash: string;           // Hash of matchData + columnKeys for invalidation
  dataContext: string;        // Formatted match data string
  metadataContext: string;    // Formatted metadata string
  metadata: ColumnMetadataMap; // Raw metadata for potential reuse
  timestamp: number;          // Cache creation time
}

// Module-level cache
let contextCache: CachedContext | null = null;

// Cache TTL: 5 minutes (metadata might change)
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Computes a hash for cache invalidation based on data characteristics
 * Uses a fast, non-cryptographic approach suitable for cache keys
 */
export function computeDataHash(matchData: MatchData[], columnKeys: string[]): string {
  // Create a fingerprint based on:
  // 1. Number of matches
  // 2. Column keys (sorted for consistency)
  // 3. First and last match identifiers (date/opponent) if available
  
  const matchCount = matchData.length;
  const sortedKeys = [...columnKeys].sort().join(',');
  
  // Get identifying info from first and last matches
  let firstMatchId = '';
  let lastMatchId = '';
  
  if (matchData.length > 0) {
    const first = matchData[0];
    const last = matchData[matchData.length - 1];
    
    // Use date and opponent as identifiers if available
    const dateKey = columnKeys.find(k => k.toLowerCase().includes('date'));
    const oppKey = columnKeys.find(k => k.toLowerCase().includes('opponent'));
    
    if (dateKey || oppKey) {
      firstMatchId = `${first[dateKey || ''] || ''}_${first[oppKey || ''] || ''}`;
      lastMatchId = `${last[dateKey || ''] || ''}_${last[oppKey || ''] || ''}`;
    } else {
      // Fallback: use stringified first few values
      firstMatchId = JSON.stringify(Object.values(first).slice(0, 3));
      lastMatchId = JSON.stringify(Object.values(last).slice(0, 3));
    }
  }
  
  // Simple hash: concatenate and use as key
  return `${matchCount}|${sortedKeys.length}|${firstMatchId}|${lastMatchId}`;
}

/**
 * Retrieves cached context if valid
 */
export function getCachedContext(dataHash: string): CachedContext | null {
  if (!contextCache) {
    return null;
  }
  
  // Check hash match
  if (contextCache.dataHash !== dataHash) {
    console.log('🔄 AI context cache miss: data changed');
    return null;
  }
  
  // Check TTL
  const age = Date.now() - contextCache.timestamp;
  if (age > CACHE_TTL_MS) {
    console.log('🔄 AI context cache expired');
    contextCache = null;
    return null;
  }
  
  console.log('✅ AI context cache hit');
  return contextCache;
}

/**
 * Stores context in cache
 */
export function setCachedContext(
  dataHash: string,
  dataContext: string,
  metadataContext: string,
  metadata: ColumnMetadataMap
): void {
  contextCache = {
    dataHash,
    dataContext,
    metadataContext,
    metadata,
    timestamp: Date.now(),
  };
  console.log('💾 AI context cached');
}

/**
 * Invalidates the context cache
 * Call this when data or sheet config changes
 */
export function invalidateContextCache(): void {
  if (contextCache) {
    console.log('🗑️ AI context cache invalidated');
    contextCache = null;
  }
}

/**
 * Gets cache status for debugging
 */
export function getCacheStatus(): { cached: boolean; age: number | null; hash: string | null } {
  if (!contextCache) {
    return { cached: false, age: null, hash: null };
  }
  return {
    cached: true,
    age: Date.now() - contextCache.timestamp,
    hash: contextCache.dataHash,
  };
}
