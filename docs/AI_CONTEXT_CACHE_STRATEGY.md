# AI Context Cache Strategy

## Overview

This document outlines the strategy for implementing Gemini Context Cache to enable cost-effective AI-powered recommendations and training plans that align with both US Soccer coaching frameworks and JOGA club philosophy.

## Goals

1. **Cost Optimization**: Minimize AI API costs by using Context Cache (90% cheaper than regular tokens)
2. **Lazy Cache Creation**: Only create/refresh cache when AI features are actually used, not on app load
3. **Comprehensive Context**: Include match data, US Soccer frameworks, club philosophy, and performance patterns
4. **Standards-Aligned Recommendations**: Generate tactical suggestions and training plans that align with:
   - US Soccer coaching license standards (D, C, B, A, Pro)
   - US Soccer player development plans
   - JOGA club philosophy and playing style

## Context Cache Benefits

### Cost Savings
- **Cached tokens**: ~90% cheaper than regular input tokens
- **One-time cache creation**: Pay once, use many times
- **Lazy creation**: Only create when needed, not on app load

### Context Size
With Context Cache, we can include:
- Full season match data (all matches, all metrics)
- Half-time breakdowns (1st vs 2nd half for every match)
- Pre-computed pattern analysis
- Opponent strength data (4-point scale)
- Historical trends and correlations
- US Soccer coaching frameworks (all license levels)
- Club philosophy documents
- Team-specific context

## Architecture

### Cache Lifecycle

```
User Opens App → No Cache Created ($0.00)
User Clicks "Chat" → Check Database for Cache
  ├─ Cache Exists & Valid? → Use It ($0.0001 - cached tokens)
  └─ Cache Expired/Missing? → Create Cache ($0.01 - one-time)
User Asks Questions → Use Cached Context ($0.0001 per request)
User Closes App → Cache Stays in Database
User Returns 2 Weeks Later → Cache Expired → Recreate on First AI Use
```

### Cache Types

1. **Combined Cache** (Recommended for simplicity)
   - Single cache containing: match data + frameworks + patterns
   - Recreated when expired or match data changes
   - Simpler to manage

2. **Separate Caches** (Optional optimization)
   - Framework cache: US Soccer docs + club philosophy (changes rarely)
   - Match data cache: Match history + patterns (changes with new matches)
   - More complex but allows longer framework cache TTL

## Database Schema

### AI Cache Table

```sql
CREATE TABLE ai_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NULL, -- Optional: per-user cache, or NULL for shared
  cache_type TEXT NOT NULL, -- 'framework' | 'match_data' | 'combined'
  cache_id TEXT NOT NULL, -- Gemini's cache ID
  expires_at TEXT NOT NULL, -- ISO timestamp when cache expires
  data_hash TEXT NULL, -- Hash of match data to detect changes
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_cache_user_type ON ai_cache(user_id, cache_type);
CREATE INDEX idx_ai_cache_expires ON ai_cache(expires_at);
```

## File Structure

### Framework Documents

```
backend/
  src/
    frameworks/
      us-soccer/
        - coaching-license-d.md
        - coaching-license-c.md
        - coaching-license-b.md
        - coaching-license-a.md
        - coaching-license-pro.md
        - player-development-plan.md
        - youth-development-guidelines.md
        - tactical-frameworks.md
      club/
        - joga-philosophy.md
        - club-playing-style.md
        - training-methodology.md
```

### PDF Extraction Strategy

1. **One-time extraction**: Convert US Soccer PDFs to markdown files
2. **Manual or automated**: Use `pdf-parse` (Node.js) or manual copy/paste
3. **Version control**: Track framework documents in git
4. **Easy updates**: Edit markdown files directly when frameworks update

## Implementation Flow

### 1. Lazy Cache Creation

```typescript
// User clicks "Chat" or uses AI feature
async function chatWithAI(message, matchData, columnKeys) {
  // Step 1: Check database for existing cache
  const existingCache = await getStoredCache(userId);
  
  // Step 2: Validate cache (check expiration + data hash)
  if (existingCache && isCacheValid(existingCache, currentDataHash)) {
    // Cache valid - use it (NO API CALL, NO COST)
    return await useCachedContext(message, existingCache.cacheId);
  }
  
  // Step 3: Cache expired/missing - create new one
  const newCache = await createNewCache(matchData, columnKeys, frameworks);
  await storeCacheMetadata(newCache);
  
  // Step 4: Use new cache
  return await useCachedContext(message, newCache.cacheId);
}
```

### 2. Context Building

The comprehensive context includes:

1. **Match Data**: All matches with full metrics
2. **Half-Time Patterns**: 1st vs 2nd half analysis
3. **Performance Patterns**: Win/loss patterns, correlations
4. **US Soccer Frameworks**: All license levels + development plans
5. **Club Philosophy**: JOGA playing style, training methodology
6. **Opponent Strength**: 4-point scale data (when available)

### 3. Cache Validation

Cache is considered valid if:
- Not expired (expires_at > current time)
- Data hash matches (match data hasn't changed)
- Cache ID exists in Gemini

Cache is invalidated when:
- Expiration time reached
- Match data changes (new matches added)
- Manual invalidation requested

## Cost Analysis

### Scenario: 100 matches, 50KB framework docs

| Approach | Cache Creation | Per Request | Monthly (10 requests) |
|----------|---------------|-------------|----------------------|
| **No Cache** | N/A | $0.01 | $0.10 |
| **Eager Cache** (on app load) | $0.01 (even if unused) | $0.0001 | $0.01 + wasted |
| **Lazy Cache** (on AI use) | $0.01 (only when needed) | $0.0001 | $0.011 |

### Cost Optimization

- **Lazy creation**: Only pay when AI is actually used
- **Cache reuse**: Subsequent requests use cached tokens (90% cheaper)
- **Smart invalidation**: Only recreate when data actually changes
- **Separate framework cache**: Optional - frameworks change rarely

## Recommendations System

### Output Structure

```typescript
interface Recommendation {
  tactical: Array<{
    recommendation: string;
    usSoccerStandard: string; // Which US Soccer standard this aligns with
    clubAlignment: string; // How it aligns with JOGA philosophy
    dataSupport: string; // Supporting data from match history
  }>;
  training: Array<{
    plan: string;
    usSoccerStandard: string;
    clubAlignment: string;
    ageAppropriate: string;
    duration: string;
    focus: string[];
  }>;
  insights: string;
}
```

### Alignment Requirements

All recommendations must:
1. Reference US Soccer coaching standards (appropriate license level)
2. Align with JOGA club philosophy and playing style
3. Be supported by match data patterns
4. Consider age-appropriateness (US Soccer youth guidelines)
5. Include specific, actionable steps

## Security & Privacy

- Cache IDs stored in database (not sensitive data)
- Framework documents are public US Soccer materials
- Club philosophy documents are internal (store securely)
- User-specific caches optional (for multi-user scenarios)
- Cache expiration ensures fresh context

## Monitoring & Maintenance

### Cache Health Checks
- Monitor cache expiration times
- Track cache creation frequency
- Alert on excessive cache recreation (indicates issues)

### Framework Updates
- When US Soccer updates frameworks, update markdown files
- Invalidate framework cache when documents change
- Version control framework documents

### Performance Metrics
- Cache hit rate (how often existing cache is used)
- Cache creation time
- Average request cost with cache vs without

## Future Enhancements

1. **Separate Framework Cache**: Cache frameworks separately with longer TTL
2. **Per-Team Caches**: Separate cache per team (if multi-team scenarios)
3. **Incremental Updates**: Update cache incrementally when new matches added
4. **Cache Warming**: Pre-create cache for active users
5. **Multi-Model Support**: Support Gemini 3 Flash when available

## References

- [Gemini Context Cache Documentation](https://ai.google.dev/docs/caching)
- US Soccer Coaching License Standards
- JOGA Club Philosophy Documents
