# AI Context Cache Implementation Plan

## Overview

This document provides a detailed, phased implementation plan for adding Context Cache support to enable cost-effective AI-powered recommendations and training plans aligned with US Soccer frameworks and JOGA club philosophy.

## Prerequisites

- ✅ Gemini API key configured (Tier 1 paid plan)
- ✅ Database schema supports new tables
- ✅ Existing AI chat functionality working
- ⏳ US Soccer framework PDFs available (need extraction)
- ⏳ Club philosophy documents prepared

## Implementation Phases

### Phase 1: Database & Infrastructure (Week 1)

**Goal**: Set up database schema and basic cache management infrastructure.

#### Tasks

1. **Create Database Migration**
   - [ ] Create migration file: `backend/src/db/migrations/XXX_add_ai_cache_table.ts`
   - [ ] Add `ai_cache` table with columns:
     - `id`, `user_id`, `cache_type`, `cache_id`, `expires_at`, `data_hash`, `created_at`, `updated_at`
   - [ ] Add indexes: `(user_id, cache_type)`, `(expires_at)`
   - [ ] Test migration on local database

2. **Update Database Schema Types**
   - [ ] Add `AICacheTable` interface to `backend/src/db/schema.ts`
   - [ ] Export interface for use in services

3. **Create Cache Manager Service**
   - [ ] Create `backend/src/services/aiCacheManager.ts`
   - [ ] Implement `getStoredCache(userId)` - query database
   - [ ] Implement `isCacheValid(cache, dataHash)` - validation logic
   - [ ] Implement `storeCacheMetadata()` - save cache info
   - [ ] Implement `hashMatchData()` - detect data changes
   - [ ] Add error handling and logging

4. **Test Infrastructure**
   - [ ] Unit tests for cache validation logic
   - [ ] Database integration tests
   - [ ] Verify cache metadata storage/retrieval

**Deliverables**:
- Database migration file
- Cache manager service with basic functions
- Tests passing

**Estimated Time**: 4-6 hours

---

### Phase 2: Framework Document Setup (Week 1-2)

**Goal**: Extract and organize US Soccer frameworks and club philosophy documents.

#### Tasks

1. **Create Framework Directory Structure**
   - [ ] Create `backend/src/frameworks/us-soccer/` directory
   - [ ] Create `backend/src/frameworks/club/` directory
   - [ ] Add `.gitkeep` files if needed

2. **Extract US Soccer PDFs**
   - [ ] Extract text from US Soccer coaching license PDFs (D, C, B, A, Pro)
   - [ ] Save as markdown files: `coaching-license-{level}.md`
   - [ ] Extract player development plan PDF → `player-development-plan.md`
   - [ ] Extract youth development guidelines → `youth-development-guidelines.md`
   - [ ] Extract tactical frameworks → `tactical-frameworks.md`
   - [ ] Review extracted text for accuracy

3. **Create Club Philosophy Documents**
   - [ ] Create `joga-philosophy.md` with club playing style
   - [ ] Create `club-playing-style.md` with detailed style description
   - [ ] Create `training-methodology.md` with training approach
   - [ ] Review and refine documents

4. **Framework Loading Service**
   - [ ] Create `backend/src/services/frameworkLoader.ts`
   - [ ] Implement `loadUSSFrameworks()` - read all US Soccer docs
   - [ ] Implement `loadClubPhilosophy()` - read club docs
   - [ ] Add error handling for missing files
   - [ ] Cache loaded frameworks in memory (optional optimization)

**Deliverables**:
- Framework markdown files in organized structure
- Framework loader service
- Documentation of framework structure

**Estimated Time**: 6-8 hours (depends on PDF extraction method)

---

### Phase 3: Context Builder Enhancement (Week 2)

**Goal**: Build comprehensive context including frameworks, patterns, and match data.

#### Tasks

1. **Enhance Context Builder**
   - [ ] Update `buildComprehensiveContext()` in `aiService.ts`
   - [ ] Add framework loading integration
   - [ ] Add half-time pattern analysis
   - [ ] Add performance pattern identification
   - [ ] Add win/loss pattern analysis
   - [ ] Structure context with clear sections

2. **Pattern Analysis Functions**
   - [ ] Create `analyzeHalfTimePatterns()` - 1st vs 2nd half insights
   - [ ] Create `identifyPerformancePatterns()` - correlations, trends
   - [ ] Create `analyzeWinLossPatterns()` - winning vs losing differences
   - [ ] Add statistical analysis (averages, trends, anomalies)
   - [ ] Format patterns as readable text for AI

3. **Context Formatting**
   - [ ] Structure context with clear headers
   - [ ] Include US Soccer frameworks with license level context
   - [ ] Include club philosophy with alignment notes
   - [ ] Add instructions for AI on using frameworks
   - [ ] Test context size and formatting

4. **Integration Testing**
   - [ ] Test context building with sample data
   - [ ] Verify framework documents are included
   - [ ] Check context size (should be manageable)
   - [ ] Validate pattern analysis accuracy

**Deliverables**:
- Enhanced context builder
- Pattern analysis functions
- Comprehensive context output

**Estimated Time**: 8-10 hours

---

### Phase 4: Context Cache API Integration (Week 2-3)

**Goal**: Integrate Gemini Context Cache API for cache creation and usage.

#### Tasks

1. **Update Gemini Service**
   - [ ] Update `backend/src/services/aiService.ts`
   - [ ] Add `createContextCache()` function
   - [ ] Implement Gemini `cacheContent()` API call
   - [ ] Handle cache creation errors
   - [ ] Store cache expiration times

2. **Implement Cache Creation**
   - [ ] Create `createNewCache()` in cache manager
   - [ ] Build comprehensive context
   - [ ] Call Gemini API to create cache
   - [ ] Store cache ID and metadata in database
   - [ ] Add logging for cache creation

3. **Implement Cached Chat**
   - [ ] Create `chatWithCachedContext()` function
   - [ ] Use `cachedContent` parameter in Gemini API
   - [ ] Handle cache not found errors
   - [ ] Fallback to non-cached if cache fails

4. **Error Handling**
   - [ ] Handle cache expiration errors
   - [ ] Handle cache not found errors
   - [ ] Handle API rate limits
   - [ ] Graceful fallback to non-cached mode

**Deliverables**:
- Context Cache API integration
- Cache creation and usage functions
- Error handling and fallbacks

**Estimated Time**: 6-8 hours

---

### Phase 5: Lazy Cache Integration (Week 3)

**Goal**: Integrate lazy cache creation into existing AI chat flow.

#### Tasks

1. **Update AI Chat Route**
   - [ ] Modify `backend/src/routes/ai.ts` `/chat` endpoint
   - [ ] Add lazy cache check before chat
   - [ ] Call `getOrCreateCache()` from cache manager
   - [ ] Use cached context for chat requests
   - [ ] Update request/response types

2. **Update Frontend AI Service**
   - [ ] Modify `src/services/aiService.ts`
   - [ ] Send `matchData` and `columnKeys` to backend (not pre-formatted context)
   - [ ] Remove frontend context caching (move to backend)
   - [ ] Update error handling

3. **Cache Lifecycle Management**
   - [ ] Implement cache validation on each AI request
   - [ ] Auto-recreate expired caches
   - [ ] Handle cache invalidation on data changes
   - [ ] Add cache cleanup for old/expired caches

4. **Testing**
   - [ ] Test lazy cache creation (first AI use)
   - [ ] Test cache reuse (subsequent requests)
   - [ ] Test cache expiration and recreation
   - [ ] Test with different users/teams
   - [ ] Verify cost savings

**Deliverables**:
- Lazy cache integration
- Updated AI chat flow
- Cache lifecycle management
- Tests passing

**Estimated Time**: 6-8 hours

---

### Phase 6: Recommendations System (Week 3-4)

**Goal**: Build AI-powered recommendations system for tactical suggestions and training plans.

#### Tasks

1. **Create Recommendations Service**
   - [ ] Create `backend/src/services/recommendationsService.ts`
   - [ ] Implement `generateRecommendations()` function
   - [ ] Build system prompt for recommendations
   - [ ] Structure output format (tactical + training)
   - [ ] Add coach license level context

2. **Recommendations API Endpoint**
   - [ ] Create `backend/src/routes/recommendations.ts`
   - [ ] Add `POST /api/ai/recommendations` endpoint
   - [ ] Accept parameters: `focusArea`, `coachLicenseLevel`, `teamAgeGroup`
   - [ ] Use cached context for recommendations
   - [ ] Return structured recommendations

3. **Frontend Recommendations UI**
   - [ ] Create `src/components/RecommendationsView.tsx`
   - [ ] Add recommendations request to `src/services/aiService.ts`
   - [ ] Display tactical and training recommendations
   - [ ] Show US Soccer standard alignment
   - [ ] Show club philosophy alignment
   - [ ] Format recommendations nicely

4. **Recommendations Formatting**
   - [ ] Parse AI response into structured format
   - [ ] Validate recommendation structure
   - [ ] Format for display (markdown, sections)
   - [ ] Add export/save functionality (optional)

**Deliverables**:
- Recommendations service
- Recommendations API endpoint
- Frontend recommendations UI
- Structured output format

**Estimated Time**: 10-12 hours

---

### Phase 7: Testing & Optimization (Week 4)

**Goal**: Comprehensive testing and performance optimization.

#### Tasks

1. **Unit Tests**
   - [ ] Test cache manager functions
   - [ ] Test context builder
   - [ ] Test pattern analysis functions
   - [ ] Test framework loader
   - [ ] Test recommendations service

2. **Integration Tests**
   - [ ] Test full cache creation flow
   - [ ] Test lazy cache on AI use
   - [ ] Test cache expiration and recreation
   - [ ] Test recommendations generation
   - [ ] Test with various data sizes

3. **Performance Testing**
   - [ ] Measure cache creation time
   - [ ] Measure cached request latency
   - [ ] Compare costs: cached vs non-cached
   - [ ] Test with large datasets (100+ matches)
   - [ ] Monitor cache hit rates

4. **Error Scenarios**
   - [ ] Test with missing frameworks
   - [ ] Test with expired cache
   - [ ] Test with invalid cache ID
   - [ ] Test API failures
   - [ ] Test database failures

5. **Documentation**
   - [ ] Update API documentation
   - [ ] Document cache lifecycle
   - [ ] Document framework structure
   - [ ] Add troubleshooting guide
   - [ ] Update README

**Deliverables**:
- Comprehensive test suite
- Performance benchmarks
- Error handling verified
- Documentation updated

**Estimated Time**: 8-10 hours

---

### Phase 8: Deployment & Monitoring (Week 4-5)

**Goal**: Deploy to production and set up monitoring.

#### Tasks

1. **Production Preparation**
   - [ ] Review all framework documents
   - [ ] Verify database migration works on production
   - [ ] Test cache creation on production-like environment
   - [ ] Verify Gemini API limits and quotas
   - [ ] Set up environment variables

2. **Deployment**
   - [ ] Run database migration on production
   - [ ] Deploy backend changes
   - [ ] Deploy frontend changes
   - [ ] Verify framework files are deployed
   - [ ] Test end-to-end on production

3. **Monitoring Setup**
   - [ ] Add cache creation logging
   - [ ] Add cache hit/miss metrics
   - [ ] Monitor cache expiration
   - [ ] Track API costs
   - [ ] Set up alerts for cache failures

4. **User Communication**
   - [ ] Document new features for users
   - [ ] Update user guide with recommendations
   - [ ] Announce new AI capabilities
   - [ ] Gather user feedback

**Deliverables**:
- Production deployment
- Monitoring in place
- User documentation
- Feedback collection

**Estimated Time**: 6-8 hours

---

## Total Estimated Time

**Total**: 54-70 hours (approximately 7-9 weeks at 8 hours/week)

## Dependencies

- Gemini API Context Cache feature availability
- US Soccer framework PDFs
- Club philosophy documents
- Database migration capability

## Risk Mitigation

1. **Gemini API Changes**: Monitor API updates, have fallback to non-cached mode
2. **Framework Updates**: Version control framework docs, easy to update
3. **Cache Expiration**: Implement smart recreation logic
4. **Cost Overruns**: Monitor usage, set up alerts
5. **Performance Issues**: Optimize context size, use separate caches if needed

## Success Criteria

- ✅ Cache created only when AI features used (lazy creation)
- ✅ Cache reused for subsequent requests (cost savings)
- ✅ Recommendations align with US Soccer standards
- ✅ Recommendations align with club philosophy
- ✅ Training plans are age-appropriate
- ✅ Cost reduction of 80%+ compared to non-cached approach
- ✅ All tests passing
- ✅ Production deployment successful

## Future Enhancements

1. **Separate Framework Cache**: Cache frameworks separately with longer TTL
2. **Per-Team Caches**: Separate cache per team for multi-team scenarios
3. **Incremental Updates**: Update cache incrementally when new matches added
4. **Cache Warming**: Pre-create cache for active users
5. **Multi-Model Support**: Support Gemini 3 Flash when available
6. **Recommendation History**: Save and track recommendation effectiveness
7. **Custom Training Plans**: Generate detailed session plans with drills
