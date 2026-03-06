# Phase 4: Recommendation Engine - Summary & Preparation

## Current Status

**Backend:** ✅ **COMPLETE** (implemented in Phase 3)
- Database schema (`recommendations` table) - ✅ Complete
- Recommendation service (`recommendationService.ts`) - ✅ Complete
- API routes (`routes/recommendations.ts`) - ✅ Complete
- AI integration with cached context - ✅ Complete
- Automated tests (15 tests) - ✅ All passing

**Frontend:** ⏳ **PENDING** - This is what Phase 4 focuses on

---

## Phase 4 Goal

**Generate age-appropriate, philosophy-aligned training recommendations based on insights and training history, with a complete frontend interface for coaches to view, accept, modify, and implement recommendations.**

---

## What's Already Done (Backend)

### ✅ Database
- `recommendations` table with all necessary fields
- Indexes for efficient queries
- Foreign key relationships to teams, insights, seasons

### ✅ Service Layer
- `generateRecommendations()` - Creates AI-powered recommendations
- `getRecommendationsForTeam()` - Retrieves recommendations with filtering
- `markRecommendationAsApplied()` - Tracks when recommendations are used
- `getRecommendationById()` - Gets single recommendation

### ✅ API Endpoints
- `GET /api/recommendations/team/:teamId` - List recommendations for a team
- `POST /api/recommendations/generate` - Generate new recommendations
- `PATCH /api/recommendations/:id/apply` - Mark as applied
- `GET /api/recommendations/:id` - Get single recommendation

### ✅ AI Integration
- Uses Gemini Context Cache (from Phase 3)
- Includes team context (matches, insights, training logs)
- Includes US Soccer frameworks
- Includes JOGA club philosophy
- Generates recommendations aligned with both frameworks

---

## What Needs to Be Done (Frontend)

### 4.1 Frontend Service Layer

**Create:** `src/services/recommendationService.ts`

```typescript
// Functions needed:
- getRecommendationsForTeam(teamId, options?)
- generateRecommendation(teamId, insightId?)
- markRecommendationAsApplied(recommendationId)
- getRecommendationById(recommendationId)
- updateRecommendationStatus(recommendationId, status)
- addCoachNotes(recommendationId, notes)
```

**Purpose:** Frontend API client for recommendation endpoints, similar to existing `matchService.ts`, `insightService.ts`, etc.

---

### 4.2 Recommendation Display Components

#### 4.2.1 RecommendationCard Component

**Create:** `src/components/RecommendationCard.tsx`

**Features:**
- Display recommendation title, description, action items
- Show linked insight (if applicable) - collapsible
- Display recommended focus tags as pills/chips
- Show training plan (if included) - structured display
- Show framework alignment (US Soccer + JOGA)
- Show priority indicator (urgent/high/medium/low)
- Show difficulty progression (introductory/reinforcement/progression/challenge)
- Action buttons:
  - "Accept & Log Training" - Creates training log entry with recommended tags
  - "Modify" - Opens edit dialog
  - "Skip" - Marks as skipped
  - "Dismiss" - Marks as dismissed

**Design:**
- Card-based layout (similar to InsightCard if it exists)
- Color-coded by priority
- Expandable sections for details
- Clean, scannable layout

---

#### 4.2.2 RecommendationList Component

**Create:** `src/components/RecommendationList.tsx`

**Features:**
- List of RecommendationCard components
- Filtering by:
  - Status (active, accepted, skipped)
  - Category (shooting, possession, passing, defending, general)
  - Priority (urgent, high, medium, low)
  - Recommendation type (tactical, training, general)
- Sorting by priority and date
- Empty state when no recommendations
- Loading state while fetching

---

#### 4.2.3 RecommendationDetailView Component

**Create:** `src/components/RecommendationDetailView.tsx`

**Features:**
- Full-page view of a single recommendation
- All details expanded
- Linked insight displayed prominently
- Training plan with structured breakdown
- Coach notes section (editable)
- Status management
- Related recommendations sidebar

---

### 4.3 Integration with Existing Views

#### 4.3.1 InsightCard Integration

**Update:** Any existing insight display components

**Add:**
- "Get Recommendation" button on insight cards
- Triggers recommendation generation for that specific insight
- Shows loading state while generating
- Displays generated recommendation inline or in modal

---

#### 4.3.2 Training Log Integration

**Update:** Training log components (if they exist)

**Add:**
- "Accept & Log Training" button on recommendations
- Pre-populates training log form with:
  - Recommended focus tags
  - Session date (defaults to today)
  - Notes field pre-filled with recommendation summary
  - Links recommendation_id to training log entry

---

### 4.4 Recommendation Generation UI

#### 4.4.1 Generate Recommendation Button/Modal

**Create:** `src/components/GenerateRecommendationModal.tsx`

**Features:**
- Triggered from insight cards or team view
- Options:
  - Generate from specific insight
  - Generate for category (shooting, possession, etc.)
  - Generate general recommendations
- Loading state with progress
- Display generated recommendations immediately
- Error handling

---

### 4.5 Recommendation Management

#### 4.5.1 Recommendation Status Management

**Features:**
- Quick actions to change status (Accept, Skip, Modify)
- Status indicators (badges, colors)
- Filter by status
- Bulk actions (if multiple recommendations)

---

#### 4.5.2 Coach Notes

**Features:**
- Add/edit notes on recommendations
- Notes persist with recommendation
- Display notes prominently
- Use notes to track modifications or implementation details

---

### 4.6 Team View Integration

**Update:** Team-specific views (if they exist)

**Add:**
- Recommendations section showing active recommendations for the team
- Quick access to generate recommendations
- Link to full recommendations list

---

## Implementation Checklist

### Phase 4.1: Core Service Layer
- [ ] Create `src/services/recommendationService.ts`
- [ ] Implement all API client functions
- [ ] Add error handling
- [ ] Add TypeScript types

### Phase 4.2: Display Components
- [ ] Create `RecommendationCard.tsx`
- [ ] Create `RecommendationList.tsx`
- [ ] Create `RecommendationDetailView.tsx`
- [ ] Add styling and responsive design
- [ ] Add loading and error states

### Phase 4.3: Integration
- [ ] Integrate with insight cards (add "Get Recommendation" button)
- [ ] Integrate with training log (add "Accept & Log" functionality)
- [ ] Add recommendations to team views
- [ ] Add recommendations to briefing feed (Phase 5, but can start here)

### Phase 4.4: Generation UI
- [ ] Create `GenerateRecommendationModal.tsx`
- [ ] Add generation triggers throughout app
- [ ] Add loading states and progress indicators
- [ ] Handle generation errors gracefully

### Phase 4.5: Management Features
- [ ] Status management UI
- [ ] Coach notes editing
- [ ] Filtering and sorting
- [ ] Bulk actions (if needed)

### Phase 4.6: Testing
- [ ] Component tests for RecommendationCard
- [ ] Component tests for RecommendationList
- [ ] Integration tests for recommendation flow
- [ ] E2E tests for generate → accept → log training flow

---

## Key Technical Considerations

### API Integration
- Use existing `apiClient.ts` pattern
- Handle CSRF tokens for state-changing requests
- Include proper error handling
- Use TypeScript types from backend schema

### State Management
- Consider using React Context for recommendations state
- Or use component-level state with proper prop drilling
- Cache recommendations to avoid unnecessary API calls

### User Experience
- Show loading states during generation (can take 5-10 seconds)
- Provide clear feedback on actions (accept, skip, etc.)
- Make it easy to navigate between insights and recommendations
- Ensure mobile-responsive design

### Performance
- Lazy load recommendation details
- Paginate if many recommendations exist
- Cache recommendations list
- Optimize re-renders

---

## Dependencies

**Requires:**
- ✅ Phase 1 (Insights Engine) - For insight-based recommendations
- ✅ Phase 2 (Training Log) - For "Accept & Log" functionality
- ✅ Phase 3 (Framework Integration) - For AI context and philosophy alignment

**Enables:**
- Phase 5 (Workflow Views) - Recommendations will be featured in Briefing Feed and other views

---

## Estimated Time

**Phase 4 Frontend Implementation:** 15-20 hours

**Breakdown:**
- Service layer: 2-3 hours
- RecommendationCard component: 3-4 hours
- RecommendationList component: 2-3 hours
- RecommendationDetailView: 2-3 hours
- Integration with insights: 2-3 hours
- Integration with training log: 2-3 hours
- Generation UI: 2-3 hours
- Testing: 2-3 hours

---

## Success Criteria

- ✅ Coaches can view recommendations for their teams
- ✅ Coaches can generate recommendations from insights
- ✅ Coaches can accept recommendations and create training logs
- ✅ Recommendations display with proper formatting and context
- ✅ All recommendation statuses can be managed
- ✅ Coach notes can be added to recommendations
- ✅ Recommendations are properly filtered and sorted
- ✅ Mobile-responsive design
- ✅ All components tested

---

## Next Steps

1. **Review existing frontend patterns** - Look at how insights, matches, training logs are displayed
2. **Create service layer** - Start with `recommendationService.ts`
3. **Build core components** - RecommendationCard first, then list
4. **Integrate gradually** - Add to existing views one at a time
5. **Test thoroughly** - Ensure end-to-end flow works

---

## Notes

- Backend is production-ready and tested
- Frontend can be built incrementally
- Start with basic display, then add advanced features
- Consider user feedback during development
- Recommendations will be most valuable when integrated into workflow views (Phase 5)
