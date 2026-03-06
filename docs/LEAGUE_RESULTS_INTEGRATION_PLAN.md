# League Results Integration Plan

**Status:** Planning  
**Target:** Implement on separate branch after Phase 5 is complete  
**Last Updated:** February 10, 2025

## Overview

League results are publicly posted and provide valuable context for interpreting match data. For example: scoring 8 goals against "Team X" means something different if Team X typically loses most games by 8–10 goals versus if Team X is a top-tier opponent.

This plan describes how to:
1. Add a per-season league table URL to each team
2. Surface it on the team page (Team Management)
3. Pull league context into the recommendation engine for smarter, opponent-aware suggestions

**Key constraint:** League table links change each season, so storage must be season-aware.

---

## 1. Data Model

### 1.1 Option A: Team Metadata (Recommended for Phase 1)

- Add `league_table_url` to the `teams.metadata` JSON field
- Teams already have `season_id` — each team row is season-scoped, so one URL per team record
- No schema migration required; leverages existing metadata parsing in `teamService.ts`
- Update `TeamMetadata` interface in `src/types/auth.ts` to include `league_table_url?: string`

### 1.2 Option B: Dedicated Table (If Richer Data Needed Later)

If you later want cached scraped standings or multiple links per team:

```sql
CREATE TABLE team_season_links (
  id INTEGER PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  league_table_url TEXT NOT NULL,
  league_name TEXT,
  last_fetched_at TIMESTAMPTZ,
  standings_cache_json TEXT,  -- cached scraped data (optional, Phase 2)
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, season_id)
);
```

**Recommendation:** Start with Option A for simplicity. Migrate to Option B if scraping/caching becomes necessary.

---

## 2. Frontend: Team Page Integration

### 2.1 Where to Add the Link

1. **Team Management (Settings)** — When creating or editing a team in `TeamManagement.tsx`, add an optional "League Table URL" field
2. **Team Header (optional)** — In Briefing Feed, Recommendations, or Dashboard when a team is selected, show a "View league table" link if the URL exists

### 2.2 UI Specification

```
[Edit Team Form]
...
League Table URL: [_________________________________________________]
                  (Optional. Public league standings for opponent context.)
...
[Save] [Cancel]
```

- Input type: URL or text
- Validation: Optional; if provided, basic URL format check
- Help text: "Links to public league standings for this season. Used to provide opponent context in AI recommendations."

---

## 3. Backend: Integration with Recommendation Engine

### 3.1 Current Architecture

The recommendation engine uses `buildTeamContext` in `teamContextBuilder.ts`, which assembles:

- Team info, development stage, club philosophy
- Match data (including opponent names)
- Insights and training logs

It does **not** currently include opponent strength or league context.

### 3.2 Phase 1: URL in Context

When building `formatTeamContextForAI`, if the team has a `league_table_url`:

1. Include a section in the formatted context:

```
## LEAGUE CONTEXT
League standings (public): {league_table_url}
Note: Coach can open this link for opponent strength context. Consider recommendations that account for relative opponent quality when interpreting match results.
```

2. Update the recommendation prompt template to instruct the AI to consider opponent strength when the league context is available.

### 3.3 Phase 2: Scraped Standings (Future Work)

If you later want to **parse** the league table and inject structured data:

1. **League Standings Service** (`backend/src/services/leagueStandingsService.ts`)
   - Fetch the league table URL
   - Parse HTML (or JSON if the league provides an API) to extract: team name, played, wins, draws, losses, goals for, goals against, points
   - Normalize opponent names to match `opponent_name` in matches (fuzzy matching may be needed)
   - Cache results (e.g., in `team_season_links.standings_cache_json`)

2. **Context Format for AI**

```
## OPPONENT LEAGUE CONTEXT
League: {league_name}

| Opponent | Pld | W | D | L | GF | GA | GD | Pts |
|----------|-----|---|---|---|----|----|----|-----|
| Team A   | 12  | 2 | 1 | 9 | 15 | 42 | -27| 7   |
| Team X   | 12  | 1 | 0 | 11| 8  | 65 | -57| 3   |
...

Our recent matches: vs Team X (W 8-0), vs Team A (W 3-1)
Context: Team X typically concedes 5+ goals per game. Our 8-0 is strong but expected vs weak opposition.
```

3. **Recommendation Prompt Addition**

```
OPPONENT CONTEXT: For each opponent in our match history, consider their league position and typical results. 
A high score vs a weak opponent may warrant different recommendations than a high score vs a strong opponent.
```

---

## 4. Opponent Name Matching

Match data stores `opponent_name` from the spreadsheet. League tables use their own naming (e.g., "Valley United BU13" vs "Valley United"). Fuzzy matching or a manual alias map may be needed to link opponents to league rows. Phase 1 can skip this; Phase 2 would implement matching (e.g., Levenshtein distance or a small alias table).

---

## 5. Implementation Phases

### Phase 1: URL Storage + Display (4–6 hours)

| Step | Task | Files |
|------|------|-------|
| 1 | Extend `TeamMetadata` with `league_table_url` | `src/types/auth.ts` |
| 2 | Add URL field to Team Management create/edit form | `src/components/TeamManagement.tsx` |
| 3 | Update `formatTeamContextForAI` to include league URL when present | `backend/src/services/teamContextBuilder.ts` |
| 4 | (Optional) Surface "View league table" link in Briefing/Recommendations header | `BriefingFeedView.tsx`, `RecommendationsView.tsx` |

### Phase 2: Scraping + Rich Context (12–20 hours)

| Step | Task | Files |
|------|------|-------|
| 1 | Migration for `team_season_links` | `backend/src/db/migrations.ts` |
| 2 | Implement `leagueStandingsService` (fetch, parse) | `backend/src/services/` |
| 3 | Opponent name normalization / fuzzy matching | `backend/src/utils/opponentMatching.ts` |
| 4 | Integrate standings into `buildTeamContext` | `teamContextBuilder.ts` |
| 5 | Update recommendation prompt with opponent context | `recommendationService.ts` |
| 6 | Cache invalidation when standings refresh | `aiCacheManager.ts` |

---

## 6. Dependencies & Considerations

- **Phase 5 Dependency:** This work assumes Phase 5 (Workflow Views) is complete — the Briefing Feed, Prep View, and team-centric navigation will define where "team page" surfaces.
- **League Format:** Phase 2 scraping depends on the structure of your league's website. Different leagues use different HTML structures; consider supporting one format first.
- **Rate Limiting:** If scraping, cache aggressively and avoid hitting external sites on every recommendation request.
- **Privacy:** Only use publicly posted league data.

---

## 7. Success Criteria

**Phase 1:**
- [ ] Admin can add/edit league table URL per team in Team Management
- [ ] URL is persisted and surfaced in team context for recommendations
- [ ] AI recommendation prompt instructs consideration of opponent strength when URL is present

**Phase 2:**
- [ ] League standings are fetched and parsed (or manually imported)
- [ ] Opponent names from matches map to league table rows
- [ ] Recommendations explicitly reference opponent strength when generating suggestions
- [ ] Cache invalidates when standings data is refreshed

---

## 8. Related Documentation

- [IMPLEMENTATION_PLAN_MERGED.md](../IMPLEMENTATION_PLAN_MERGED.md) — Phase 5 scope and sequencing
- [TEAM_INTEGRATION_PLAN.md](./TEAM_INTEGRATION_PLAN.md) — Team/database integration
- [TEAM_MANAGEMENT.md](./TEAM_MANAGEMENT.md) — Team Management UI

---

**Branch:** Create `feature/league-results-context` from `main` after Phase 5 completion.
