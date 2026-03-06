# JOGA Analytics — Issue Remediation Plan

## Context

The app review identified three categories of issues requiring remediation: (1) frontend UX regressions caused by crude `window.location.reload()` / `alert()` patterns, (2) inconsistent error handling with no unified notification system, and (3) testing gaps — particularly for the frontend and for `matchStatsService` (the largest service, 32K+ lines, zero coverage). This plan addresses all three in priority order.

---

## Phase 1 — HIGH: Toast/Notification System (foundation for all UX fixes)

**Why first:** Every error-handling and UX fix below depends on a toast component. Build it once and reuse everywhere.

### Step 1.1 — Create `ToastNotification` component
**File to create:** `src/components/ToastNotification.tsx`

- Renders a fixed-position stack of toasts (top-right)
- Accepts `type: 'success' | 'error' | 'warning' | 'info'`
- Auto-dismisses after 4 seconds; also has a manual close button
- Uses existing TailwindCSS color tokens (green-50/red-50/yellow-50/blue-50 — matching the inline error containers already in `GenerateRecommendationModal.tsx` and `RecommendationList.tsx`)

### Step 1.2 — Create `useToast` hook
**File to create:** `src/hooks/useToast.ts`

- Exposes `toast.success(msg)`, `toast.error(msg)`, `toast.warning(msg)`, `toast.info(msg)`
- Manages a toast queue array with unique IDs and auto-removal timers
- Follows same patterns as `useLocalStorageState.ts` and `useURLState.ts` in `src/hooks/`

### Step 1.3 — Wire `ToastNotification` into `App.tsx`
**File to modify:** `src/App.tsx` (line ~1 — top-level render)

- Mount `<ToastNotification />` once at the root, outside all view conditionals
- Export a `ToastContext` so any descendant component can call `useToast()`

---

## Phase 2 — HIGH: Fix RecommendationsView UX

**File to modify:** `src/components/RecommendationsView.tsx`

### Step 2.1 — Remove `window.location.reload()` (lines 73, 86)
Replace the hard reload with proper local state management:
- After `markRecommendationAsApplied()` succeeds, call `setRecommendations(prev => prev.filter(r => r.id !== id))` (optimistic removal from list)
- This mirrors the pattern already used in `RecommendationList.tsx` (which maintains its own filtered state)

### Step 2.2 — Replace `alert()` calls (lines 76, 89) with `useToast`
- `alert('Failed to accept...')` → `toast.error('Failed to accept recommendation. Please try again.')`
- `alert('Failed to skip...')` → `toast.error('Failed to skip recommendation. Please try again.')`
- Add a success toast after each successful accept/skip

### Step 2.3 — Fix `any[]` type (line 20)
- `useState<any[]>([])` → `useState<Team[]>([])`
- Import `Team` from `src/types/auth.ts` (same source App.tsx uses on line 53)

### Step 2.4 — Complete the detail view (TODO at lines 95-96)
- Implement a `RecommendationDetailModal` component (or expand `RecommendationCard` inline expansion, which already exists in `RecommendationCard.tsx`)
- Replace the TODO with a state-driven modal: `const [detailRec, setDetailRec] = useState<Recommendation | null>(null)`
- The detail data is already available from `getRecommendationById()` in `src/services/recommendationService.ts`

---

## Phase 3 — HIGH: Replace Remaining `alert()` Calls Across App

**Other files using `alert()`:**
- `src/components/UserManagement.tsx` (line ~455 — "Password reset successfully")
- `src/components/Glossary.tsx` — confirm locations via grep

For each instance: replace with `toast.success()` / `toast.error()` via `useToast` hook.

---

## Phase 4 — MEDIUM: Standardize Inline Error Display Pattern

Several components (e.g., `RecommendationList.tsx`) use inline styled error containers — this is a good pattern. Ensure it's used consistently:

**Files to audit/update:**
- Any component still using raw `<p className="text-red-500">` without a wrapper
- Standardize on the red-50/border-red-200 container pattern from `GenerateRecommendationModal.tsx` (lines 113–117)
- Create a reusable `InlineError` and `InlineSuccess` component to avoid duplication

---

## Phase 5 — MEDIUM: Extract Custom Hooks from App.tsx

**File to modify:** `src/App.tsx` (currently 4,064 lines, 11 useEffect hooks, 19 useLocalStorageState hooks)

Break out into focused custom hooks. Existing hooks in `src/hooks/` (`useLocalStorageState`, `useURLState`, `useViewScopedState`, `useChartConfig`) serve as models.

### New hooks to create:

| Hook | File | Extracts |
|---|---|---|
| `useMatchData` | `src/hooks/useMatchData.ts` | useEffect for loading match data, matchData/loading/error state, columnKeys |
| `useTeamData` | `src/hooks/useTeamData.ts` | useEffect for loading database teams, databaseTeams state, teamSlugMap/teamSlugs memos |
| `useCustomCharts` | `src/hooks/useCustomCharts.ts` | useEffect for loading custom charts + expansion states, customCharts/customChartData |
| `useFilteredData` | `src/hooks/useFilteredData.ts` | All filteredData/availableOpponents/availableDates/dataToDisplay memo logic |

App.tsx will import these hooks and remain the coordinator, but drop below ~1,500 lines.

---

## Phase 6 — MEDIUM: Reduce Prop Drilling in GameDataView

**File to modify:** `src/components/GameDataView.tsx` (currently accepts 29 props — lines 1964–1992 in App.tsx)

### Approach: Group related props into typed config objects

Rather than a Context (which would be over-engineered at this scale), group props into 3 structured objects:

```typescript
// Passed as 3 props instead of 29
<GameDataView
  data={{ matchData, columnKeys, teamSlugMap }}
  helpers={{ getTeamKey, getOpponentKey, getLabelKey, parseDateHelper }}
  filters={{ selectedTeam, setSelectedTeam, selectedOpponents, setSelectedOpponents,
             selectedDate, setSelectedDate, selectedShootingMetrics, ... }}
/>
```

- Define `GameDataViewData`, `GameDataViewHelpers`, `GameDataViewFilters` interfaces in `src/types.ts`
- Update `GameDataView.tsx` to destructure from these objects
- Update the call site in `App.tsx`

---

## Phase 7 — MEDIUM: Add Frontend Component Tests

**Pattern to follow:** Existing tests in `src/__tests__/RecommendationCard.test.tsx`, `RecommendationList.test.tsx`, `RecommendationsView.test.tsx` (Vitest)

### New test files to create:

| File | Coverage focus |
|---|---|
| `src/__tests__/ToastNotification.test.tsx` | Renders, auto-dismiss, manual close, all toast types |
| `src/__tests__/useToast.test.ts` | Queue management, deduplication, auto-removal timing |
| `src/__tests__/RecommendationsView.test.tsx` | Expand existing tests: verify no reload on accept/skip, verify toast shown on error, verify Team type |
| `src/__tests__/useMatchData.test.ts` | Loading state, error state, data parsing (after Phase 5 extraction) |
| `src/__tests__/useTeamData.test.ts` | Team loading, slug map creation (after Phase 5 extraction) |

---

## Phase 8 — LOW: Add Backend Tests for `trainingLogService`

**File to create:** `backend/src/__tests__/trainingLogs.test.ts`

**Pattern:** Follow `backend/src/__tests__/insights.test.ts` (608 lines) — uses real DB with test helpers (`createTestAdmin`, `createTestTeam`, etc.) from `backend/src/test-helpers/`

### Coverage targets:
- CRUD operations on training logs
- Focus tag filtering
- Date range queries
- Association with insights and recommendations
- Auth/permission checks

---

## Phase 9 — LOW: Add Backend Tests for `matchStatsService`

**File:** `backend/src/services/matchStatsService.ts` (32,757 lines — highest risk, zero coverage)

**Approach:** Start with the most critical calculation functions first (not full coverage in one pass):
- Aggregate stat calculations
- Per-match stat normalization
- Half-split computation (unique to JOGA data)
- Edge cases: empty data, single-match seasons

**File to create:** `backend/src/__tests__/matchStats.test.ts`

---

## File Summary

| Priority | Files to Create | Files to Modify |
|---|---|---|
| HIGH | `src/components/ToastNotification.tsx`, `src/hooks/useToast.ts` | `src/App.tsx`, `src/components/RecommendationsView.tsx`, `src/components/UserManagement.tsx`, `src/components/Glossary.tsx` |
| MEDIUM | `src/components/InlineError.tsx`, `src/components/InlineSuccess.tsx`, `src/hooks/useMatchData.ts`, `src/hooks/useTeamData.ts`, `src/hooks/useCustomCharts.ts`, `src/hooks/useFilteredData.ts`, `src/__tests__/ToastNotification.test.tsx`, `src/__tests__/useToast.test.ts`, `src/__tests__/useMatchData.test.ts`, `src/__tests__/useTeamData.test.ts` | `src/types.ts`, `src/components/GameDataView.tsx`, `src/App.tsx`, `src/__tests__/RecommendationsView.test.tsx` |
| LOW | `backend/src/__tests__/trainingLogs.test.ts`, `backend/src/__tests__/matchStats.test.ts` | — |

---

## Verification

After each phase:
1. **Phase 1–3:** Start dev server (`npm run dev`), navigate to Recommendations view, accept/skip a recommendation — verify toast appears, list updates without page reload
2. **Phase 3:** Trigger a password reset in UserManagement — verify toast instead of alert
3. **Phase 5–6:** Confirm App.tsx renders unchanged after hook extraction (`npm run build` must pass with no TS errors)
4. **Phases 7–9:** `npm test` from root — all new tests must pass
5. Full TypeScript check: `npx tsc --noEmit` must show zero errors throughout
