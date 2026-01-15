# Phase 0.5: Chart Customization Implementation Plan

## Overview

This document outlines the systematic plan for implementing chart configuration (Phase 0.5) across all charts in the JOGA Analytics application. The goal is to make existing charts flexible and configurable, allowing users to toggle metrics and opponent data visibility.

**Status:** 2/18 charts completed (Shots ✅, Possession ✅)

---

## Implementation Status

### ✅ Completed Charts
1. **ShotsChart** - Fully implemented with config panel
2. **PossessionChart** - Fully implemented with config panel

### 🔄 Remaining Charts (16)
- Batch 1: Shooting metrics (4 charts)
- Batch 2: Passing metrics (5 charts)  
- Batch 3: Specialized charts (3 charts)
- Batch 4: Complex/Advanced (4 charts)

---

## Available Metrics Reference

<!--
  AVAILABLE METRICS FOR CHART CUSTOMIZATION
  ==========================================
  
  This section lists all available metrics that can be added to charts.
  Use these metric IDs when configuring chart defaults or adding optional metrics.
  
  To modify defaults:
  1. Open src/types/chartConfig.ts
  2. Find the DEFAULT_XXX_CONFIG constant
  3. Update visibleMetrics array with metric IDs from below
  4. Update includeOpponent boolean as needed
  
  METRIC ID FORMAT:
  - Use camelCase (e.g., 'shotsFor', 'goalsAgainst')
  - For opponent metrics, use 'opp' prefix (e.g., 'oppShots', 'oppGoals')
  - For optional metrics, check if prop exists before adding to availableMetrics
  
  CATEGORY: SHOOTING METRICS
  --------------------------
  Primary Metrics:
  - 'shotsFor'              → "Shots For" (required for ShotsChart)
  - 'shotsAgainst'          → "Shots Against" (opponent shots)
  - 'goalsFor'              → "Goals For" (required for GoalsChart)
  - 'goalsAgainst'          → "Goals Against" (opponent goals)
  - 'xG'                    → "Expected Goals (xG)" (required for xGChart)
  - 'xGA'                   → "Expected Goals Against (xGA)" (opponent xG)
  - 'conversionRate'        → "Conversion Rate %" (required for ConversionRateChart)
  - 'oppConversionRate'     → "Opponent Conversion Rate %"
  - 'tsr'                   → "Total Shots Ratio %" (required for TSRChart)
  - 'oppTSR'                → "Opponent Total Shots Ratio %"
  - 'attempts'              → "Attempts" (required for AttemptsChart)
  - 'oppAttempts'           → "Opponent Attempts"
  
  Optional/Additional Metrics:
  - 'attemptsFor'           → "Attempts For" (optional for ShotsChart)
  - 'attemptsAgainst'       → "Attempts Against" (opponent attempts)
  - 'insideBoxAttempts'     → "% Attempts Inside Box" (for PositionalAttemptsChart)
  - 'outsideBoxAttempts'    → "% Attempts Outside Box"
  - 'oppInsideBoxAttempts'  → "Opp % Attempts Inside Box"
  - 'oppOutsideBoxAttempts' → "Opp % Attempts Outside Box"
  - 'insideBoxConvRate'     → "Inside Box Conversion Rate"
  - 'outsideBoxConvRate'    → "Outside Box Conversion Rate"
  
  Cross-Chart Metrics (can be added to multiple charts):
  - 'shotsFor' can be added to: GoalsChart, xGChart, ConversionRateChart, TSRChart
  - 'goalsFor' can be added to: ShotsChart, xGChart, ConversionRateChart
  - 'xG' can be added to: GoalsChart (to compare actual vs expected)
  
  CATEGORY: POSSESSION METRICS
  -----------------------------
  Primary Metrics:
  - 'possession'            → "Possession %" (required for PossessionChart)
  - 'oppPossession'         → "Opponent Possession %"
  - 'passShare'             → "Pass Share %" (required for PossessionChart)
  - 'oppPassShare'          → "Opponent Pass Share %"
  
  Optional/Additional Metrics:
  - 'timeInPossession'      → "Time in Possession" (optional for PossessionChart)
  - 'oppTimeInPossession'   → "Opponent Time in Possession"
  
  Cross-Chart Metrics:
  - 'possession' can be added to: PassShareChart
  - 'passShare' can be added to: PossessionChart (already included)
  
  CATEGORY: PASSING METRICS
  -------------------------
  Primary Metrics:
  - 'passesFor'             → "Passes" (required for PassesChart)
  - 'oppPasses'             → "Opponent Passes"
  - 'avgPassLength'         → "Average Pass Length" (required for AvgPassLengthChart)
  - 'oppAvgPassLength'      → "Opponent Average Pass Length"
  - 'ppm'                   → "Passes Per Minute" (required for PPMChart)
  - 'oppPPM'                → "Opponent Passes Per Minute"
  
  Pass String Metrics:
  - 'passStrings35'         → "3-5 Pass Strings" (required for PassStrLengthChart)
  - 'passStrings6Plus'      → "6+ Pass Strings" (required for PassStrLengthChart)
  - 'lpc'                   → "LPC (Longest Pass Chain)" (required for PassStrLengthChart)
  - 'oppPassStrings35'      → "Opponent 3-5 Pass Strings"
  - 'oppPassStrings6Plus'   → "Opponent 6+ Pass Strings"
  
  Optional/Additional Metrics:
  - 'passCompletion'        → "Pass Completion %" (if available)
  - 'passAccuracy'          → "Pass Accuracy %" (if available)
  - 'passStrings1'          → "1-Pass Strings" (if available)
  - 'passStrings2'          → "2-Pass Strings" (if available)
  - 'passStrings3'          → "3-Pass Strings" (if available)
  - 'passStrings4'          → "4-Pass Strings" (if available)
  - 'passStrings5'           → "5-Pass Strings" (if available)
  
  Pass by Zone Metrics (Dynamic):
  - 'zoneDef'               → "Pass % by Zone (Def)" (dynamic for PassByZoneChart)
  - 'zoneMid'               → "Pass % by Zone (Mid)"
  - 'zoneAtt'               → "Pass % by Zone (Att)"
  - 'oppZoneDef'            → "Opp Pass % by Zone (Def)"
  - 'oppZoneMid'            → "Opp Pass % by Zone (Mid)"
  - 'oppZoneAtt'            → "Opp Pass % by Zone (Att)"
  Note: Zone metrics are discovered dynamically from column names
  
  CATEGORY: JOGA METRICS
  ----------------------
  Primary Metrics:
  - 'spi'                   → "SPI (Sustained Passing Index)" (required for SPIChart)
  - 'spiW'                  → "SPI (w) - Weighted" (required for SPIChart)
  - 'oppSPI'                → "Opponent SPI"
  - 'oppSPIW'               → "Opponent SPI (w) - Weighted"
  
  Optional/Calculated Metrics:
  - 'spiDifference'         → "SPI Difference" (calculated: SPI - Opp SPI)
  - 'spiWeightedDifference' → "SPI Weighted Difference" (calculated)
  
  CATEGORY: MISC STATS
  --------------------
  Primary Metrics:
  - 'cornersFor'            → "Corners For" (required for MiscStatsChart)
  - 'cornersAgainst'        → "Corners Against" (required for MiscStatsChart)
  - 'freeKickFor'           → "Free Kick For" (required for MiscStatsChart)
  - 'freeKickAgainst'       → "Free Kick Against" (required for MiscStatsChart)
  
  Optional/Additional Metrics:
  - 'yellowCards'           → "Yellow Cards" (if available)
  - 'redCards'              → "Red Cards" (if available)
  - 'offsides'              → "Offsides" (if available)
  - 'fouls'                 → "Fouls" (if available)
  - 'foulsAgainst'          → "Fouls Against" (if available)
  
  CATEGORY: DEFENSIVE METRICS
  ---------------------------
  (Currently shown via AutoChart, but can be added to custom charts)
  - 'possessionsWon'        → "Possessions Won"
  - 'oppPossessionsWon'     → "Opponent Possessions Won"
  - 'tackles'               → "Tackles" (if available)
  - 'interceptions'         → "Interceptions" (if available)
  - 'clearances'            → "Clearances" (if available)
  - 'blocks'                → "Blocks" (if available)
  
  METRIC AVAILABILITY NOTES
  --------------------------
  - Metrics marked as "required" must always be available for that chart type
  - Metrics marked as "optional" should only be shown if the corresponding prop exists
  - Always check for prop existence before adding optional metrics to availableMetrics array
  - Opponent metrics are controlled by includeOpponent boolean in config
  - Some metrics are calculated (e.g., SPI Difference) and may need special handling
  
  EXAMPLE: Adding Optional Metrics to ShotsChart
  -----------------------------------------------
  In ShotsChart component:
  
  const availableMetrics = [
    { id: 'shotsFor', label: 'Shots For', required: false },
    ...(attemptsForKey ? [{ id: 'attemptsFor', label: 'Attempts For', required: false }] : []),
    ...(goalsForKey ? [{ id: 'goalsFor', label: 'Goals For', required: false }] : []),
  ];
  
  To add xG as optional:
  ...(xGKey ? [{ id: 'xG', label: 'Expected Goals (xG)', required: false }] : []),
  
  EXAMPLE: Modifying Default Config
  ---------------------------------
  To change ShotsChart default to show Shots + Attempts:
  
  // In src/types/chartConfig.ts
  export const DEFAULT_SHOTS_CONFIG: ChartConfig = {
    visibleMetrics: ['shotsFor', 'attemptsFor'],  // Changed from ['shotsFor']
    includeOpponent: true,
  };
  
  To change PossessionChart default to show only Possession (no Pass Share):
  
  export const DEFAULT_POSSESSION_CONFIG: ChartConfig = {
    visibleMetrics: ['possession'],  // Changed from ['possession', 'passShare']
    includeOpponent: false,  // Changed from true
  };
-->

---

## Chart Inventory & Analysis

### Batch 1: Simple Shooting Metrics Charts (Priority: HIGH)

These charts follow the same pattern as ShotsChart - simple bar charts with For/Against metrics.

#### 1. GoalsChart
- **Current Metrics:** Goals For, Goals Against
- **Chart Type:** BarChart
- **Complexity:** ⭐ Simple (1-2 hours)
- **Potential Additional Metrics:**
  - xG (if available in data)
  - xGA (if available in data)
  - Shots For (optional overlay)
  - Shots Against (optional overlay)
- **Default Config:**
  ```typescript
  {
    visibleMetrics: ['goalsFor', 'goalsAgainst'],
    includeOpponent: true
  }
  ```
- **Available Metrics:**
  - `goalsFor` (required)
  - `goalsAgainst` (required)
  - `xG` (optional, if xGKey prop exists)
  - `xGA` (optional, if xGAKey prop exists)
- **Notes:** Very similar to ShotsChart pattern. Can reuse most logic.

#### 2. xGChart (XGChart)
- **Current Metrics:** xG, xG (Opp)
- **Chart Type:** BarChart
- **Complexity:** ⭐ Simple (1-2 hours)
- **Potential Additional Metrics:**
  - Goals For (optional overlay to compare actual vs expected)
  - Goals Against (optional overlay)
  - Shots For (optional)
  - Shots Against (optional)
- **Default Config:**
  ```typescript
  {
    visibleMetrics: ['xG'],
    includeOpponent: true
  }
  ```
- **Available Metrics:**
  - `xG` (required)
  - `goalsFor` (optional, if goalsForKey prop exists)
  - `goalsAgainst` (optional, if goalsAgainstKey prop exists)
- **Notes:** Could benefit from showing actual goals vs expected goals overlay.

#### 3. ConversionRateChart
- **Current Metrics:** Conversion Rate, Opp Conversion Rate
- **Chart Type:** BarChart (percentage values)
- **Complexity:** ⭐ Simple (1-2 hours)
- **Potential Additional Metrics:**
  - Shots For (optional context)
  - Goals For (optional context)
  - Shots Against (optional)
  - Goals Against (optional)
- **Default Config:**
  ```typescript
  {
    visibleMetrics: ['conversionRate'],
    includeOpponent: true
  }
  ```
- **Available Metrics:**
  - `conversionRate` (required)
  - `shotsFor` (optional, if shotsForKey prop exists)
  - `goalsFor` (optional, if goalsForKey prop exists)
- **Notes:** Percentage chart, might want dual Y-axis if adding raw numbers.

#### 4. TSRChart
- **Current Metrics:** TSR, Opp TSR (both optional/conditional)
- **Chart Type:** BarChart (percentage, domain 0-100)
- **Complexity:** ⭐⭐ Medium (2-3 hours)
- **Potential Additional Metrics:**
  - Shots For (optional context)
  - Shots Against (optional context)
  - Total Shots (calculated from For + Against)
- **Default Config:**
  ```typescript
  {
    visibleMetrics: ['tsr'],
    includeOpponent: true
  }
  ```
- **Available Metrics:**
  - `tsr` (optional/conditional)
  - `shotsFor` (optional, if shotsForKey prop exists)
  - `shotsAgainst` (optional, if shotsAgainstKey prop exists)
- **Notes:** Already has conditional rendering. Need to handle optional metrics carefully.

---

### Batch 2: Passing Metrics Charts (Priority: MEDIUM)

These charts are more varied - some are simple, some are complex.

#### 5. PassesChart
- **Current Metrics:** Passes, Opp Passes
- **Chart Type:** BarChart
- **Complexity:** ⭐ Simple (1-2 hours)
- **Potential Additional Metrics:**
  - Pass Completion % (if available)
  - Pass Accuracy % (if available)
  - Pass Strings (optional)
- **Default Config:**
  ```typescript
  {
    visibleMetrics: ['passesFor'],
    includeOpponent: true
  }
  ```
- **Available Metrics:**
  - `passesFor` (required)
  - `passCompletion` (optional, if prop exists)
  - `passAccuracy` (optional, if prop exists)
- **Notes:** Simple bar chart pattern.

#### 6. PassShareChart
- **Current Metrics:** Pass Share, Opp Pass Share
- **Chart Type:** ComposedChart (Line + Bar)
- **Complexity:** ⭐⭐ Medium (2-3 hours)
- **Potential Additional Metrics:**
  - Possession % (related metric)
  - Time in Possession (optional)
- **Default Config:**
  ```typescript
  {
    visibleMetrics: ['passShare'],
    includeOpponent: true
  }
  ```
- **Available Metrics:**
  - `passShare` (required)
  - `possession` (optional, if possessionKey prop exists)
  - `timeInPossession` (optional, if timeInPossessionKey prop exists)
- **Notes:** Uses ComposedChart with dual Y-axis. Need to handle line/bar rendering logic.

#### 7. AvgPassLengthChart
- **Current Metrics:** Avg Pass Length, Opp Avg Pass Length
- **Chart Type:** BarChart
- **Complexity:** ⭐ Simple (1-2 hours)
- **Potential Additional Metrics:**
  - Long Passes (if available)
  - Short Passes (if available)
- **Default Config:**
  ```typescript
  {
    visibleMetrics: ['avgPassLength'],
    includeOpponent: true
  }
  ```
- **Available Metrics:**
  - `avgPassLength` (required)
- **Notes:** Simple bar chart, limited additional metrics.

#### 8. PPMChart
- **Current Metrics:** PPM, Opp PPM
- **Chart Type:** BarChart
- **Complexity:** ⭐ Simple (1-2 hours)
- **Potential Additional Metrics:**
  - Total Passes (optional context)
  - Minutes Played (optional context)
- **Default Config:**
  ```typescript
  {
    visibleMetrics: ['ppm'],
    includeOpponent: true
  }
  ```
- **Available Metrics:**
  - `ppm` (required)
- **Notes:** Simple bar chart, limited additional metrics.

#### 9. PassStrLengthChart
- **Current Metrics:** 3-5 Pass Strings, 6+ Pass Strings, LPC
- **Chart Type:** BarChart (multiple series)
- **Complexity:** ⭐⭐ Medium (2-3 hours)
- **Potential Additional Metrics:**
  - Total Pass Strings (calculated)
  - Average Pass String Length (calculated)
- **Default Config:**
  ```typescript
  {
    visibleMetrics: ['passStrings35', 'passStrings6Plus', 'lpc'],
    includeOpponent: false
  }
  ```
- **Available Metrics:**
  - `passStrings35` (required)
  - `passStrings6Plus` (required)
  - `lpc` (required)
- **Notes:** Multiple metrics, no opponent data currently. May want to add opponent variants if available.

---

### Batch 3: Specialized Charts (Priority: MEDIUM-LOW)

These charts have unique structures or multiple metrics.

#### 10. SPIChart
- **Current Metrics:** SPI, SPI (w), Opp SPI, Opp SPI (w)
- **Chart Type:** BarChart (4 series)
- **Complexity:** ⭐⭐ Medium (2-3 hours)
- **Potential Additional Metrics:**
  - SPI Difference (calculated: SPI - Opp SPI)
  - SPI Weighted Difference (calculated)
- **Default Config:**
  ```typescript
  {
    visibleMetrics: ['spi', 'spiW'],
    includeOpponent: true
  }
  ```
- **Available Metrics:**
  - `spi` (required)
  - `spiW` (required)
- **Notes:** Already shows 4 metrics. Configuration would allow toggling weighted vs non-weighted, or team vs opponent.

#### 11. AttemptsChart
- **Current Metrics:** Attempts, Opp Total Attempts
- **Chart Type:** BarChart
- **Complexity:** ⭐ Simple (1-2 hours)
- **Potential Additional Metrics:**
  - Shots For (related metric)
  - Goals For (related metric)
- **Default Config:**
  ```typescript
  {
    visibleMetrics: ['attempts'],
    includeOpponent: true
  }
  ```
- **Available Metrics:**
  - `attempts` (required)
  - `shotsFor` (optional, if shotsForKey prop exists)
  - `goalsFor` (optional, if goalsForKey prop exists)
- **Notes:** Simple pattern, similar to ShotsChart.

#### 12. MiscStatsChart
- **Current Metrics:** Corners For, Corners Against, Free Kick For, Free Kick Against
- **Chart Type:** BarChart (4 series)
- **Complexity:** ⭐⭐ Medium (2-3 hours)
- **Potential Additional Metrics:**
  - Yellow Cards (if available)
  - Red Cards (if available)
  - Offsides (if available)
- **Default Config:**
  ```typescript
  {
    visibleMetrics: ['cornersFor', 'freeKickFor'],
    includeOpponent: true
  }
  ```
- **Available Metrics:**
  - `cornersFor` (required)
  - `cornersAgainst` (required)
  - `freeKickFor` (required)
  - `freeKickAgainst` (required)
  - `yellowCards` (optional, if prop exists)
  - `redCards` (optional, if prop exists)
- **Notes:** Multiple metrics. Could group by type (Corners, Free Kicks, Cards) or allow individual toggles.

---

### Batch 4: Complex/Advanced Charts (Priority: LOW)

These charts have complex structures or may need custom logic.

#### 13. PositionalAttemptsChart
- **Current Metrics:** Team Inside Box, Team Outside Box, Opp Inside Box, Opp Outside Box
- **Chart Type:** BarChart (percentage, domain 0-100)
- **Complexity:** ⭐⭐⭐ Complex (3-4 hours)
- **Potential Additional Metrics:**
  - Total Attempts (optional context)
  - Inside Box % vs Outside Box % (stacked view option)
- **Default Config:**
  ```typescript
  {
    visibleMetrics: ['insideBox', 'outsideBox'],
    includeOpponent: true
  }
  ```
- **Available Metrics:**
  - `insideBox` (required)
  - `outsideBox` (required)
- **Notes:** Percentage-based, positional data. May want to add stacked bar option.

#### 14. PassByZoneChart
- **Current Metrics:** Dynamic zones (Def, Mid, Att, etc.) for both team and opponent
- **Chart Type:** BarChart (multiple dynamic series)
- **Complexity:** ⭐⭐⭐ Complex (4-5 hours)
- **Potential Additional Metrics:**
  - Zone totals (calculated)
  - Zone percentages (calculated)
- **Default Config:**
  ```typescript
  {
    visibleMetrics: ['zoneDef', 'zoneMid', 'zoneAtt'], // Dynamic based on available zones
    includeOpponent: true
  }
  ```
- **Available Metrics:**
  - Dynamic based on `passByZoneKeys` array
- **Notes:** Most complex - uses dynamic key arrays. Need to handle zone discovery and configuration dynamically.

#### 15. AutoChart
- **Current Metrics:** Single metric or pair (auto-discovered)
- **Chart Type:** Dynamic (Bar, Line, Area based on metric type)
- **Complexity:** ⭐⭐⭐ Complex (3-4 hours)
- **Potential Additional Metrics:**
  - Paired metric (if available)
  - Related metrics (if discoverable)
- **Default Config:**
  ```typescript
  {
    visibleMetrics: ['primary'], // The auto-discovered metric
    includeOpponent: false // Depends on pair discovery
  }
  ```
- **Available Metrics:**
  - Dynamic based on auto-discovery
- **Notes:** This is the most flexible chart. Configuration may need to be per-column rather than per-chart-type.

#### 16. (If exists) Other specialized charts
- **Status:** Need to verify if there are other chart components not yet reviewed
- **Action:** Review codebase for any additional chart components

---

## Implementation Strategy

### Phase 0.5.1: Extend ChartConfig Type System

**Tasks:**
1. Extend `ChartConfig` type to support all chart types
2. Add default configs for all charts in `chartConfig.ts`
3. Extend `getChartTitle()` function to handle all chart types
4. Update `isChartCustomized()` to handle all chart types

**Files to Modify:**
- `src/types/chartConfig.ts`

### Phase 0.5.2: Create Reusable Hook

**Tasks:**
1. Create `useChartConfig` hook to reduce repetition
2. Extract common logic (loading, saving, resetting)

**Files to Create:**
- `src/hooks/useChartConfig.ts`

**Benefits:**
- Reduces code duplication across 16 charts
- Consistent behavior
- Easier maintenance

### Phase 0.5.3: Batch Implementation

**Batch 1: Shooting Metrics (Weeks 1-2)**
- GoalsChart
- xGChart
- ConversionRateChart
- TSRChart
- **Estimated Time:** 6-10 hours
- **Priority:** HIGH (most used charts)

**Batch 2: Passing Metrics (Week 2-3)**
- PassesChart
- PassShareChart
- AvgPassLengthChart
- PPMChart
- PassStrLengthChart
- **Estimated Time:** 8-12 hours
- **Priority:** MEDIUM

**Batch 3: Specialized Charts (Week 3-4)**
- SPIChart
- AttemptsChart
- MiscStatsChart
- **Estimated Time:** 6-10 hours
- **Priority:** MEDIUM-LOW

**Batch 4: Complex Charts (Week 4-5)**
- PositionalAttemptsChart
- PassByZoneChart
- AutoChart
- **Estimated Time:** 10-15 hours
- **Priority:** LOW (may need custom approaches)

---

## Technical Implementation Pattern

### Standard Pattern (Most Charts)

```typescript
// 1. Import dependencies
import { ChartConfig, DEFAULT_XXX_CONFIG, getChartTitle } from '../types/chartConfig';
import { ChartConfigPanel } from './ChartConfigPanel';
import { useChartConfig } from '../hooks/useChartConfig';

// 2. Use hook (reduces boilerplate)
const { config, isLoading, handleConfigChange, handleSave, handleReset } = 
  useChartConfig('chartType', DEFAULT_XXX_CONFIG);

// 3. Build chart data based on config
const chartData = data.map((match) => {
  const base: any = { name: match[opponentKey] };
  
  // Add metrics based on config
  if (config.visibleMetrics.includes('metricId')) {
    base['Metric Label'] = match[metricKey] || 0;
  }
  
  // Add opponent metrics if enabled
  if (config.includeOpponent) {
    // ... opponent metrics
  }
  
  return base;
});

// 4. Render chart elements conditionally
const renderElements = () => {
  // Conditionally render bars/lines based on config
};

// 5. Add ChartConfigPanel
<ChartConfigPanel
  chartType="chartType"
  config={config}
  availableMetrics={availableMetrics}
  onConfigChange={handleConfigChange}
  onSave={handleSave}
  onReset={handleReset}
/>
```

### Special Cases

**PassShareChart (ComposedChart):**
- Need to handle Line vs Bar rendering
- Dual Y-axis support
- May need to extend config to support chart element type selection

**PassByZoneChart (Dynamic Zones):**
- Need dynamic metric discovery
- Configuration UI needs to handle variable number of zones
- May need zone grouping options

**AutoChart (Fully Dynamic):**
- May need per-column configuration storage
- Configuration discovery from column metadata
- Most flexible - may need custom approach

---

## Default Configurations

### Standard Defaults

```typescript
// Shooting metrics - show primary metric, include opponent
DEFAULT_GOALS_CONFIG: { visibleMetrics: ['goalsFor'], includeOpponent: true }
DEFAULT_XG_CONFIG: { visibleMetrics: ['xG'], includeOpponent: true }
DEFAULT_CONVERSION_RATE_CONFIG: { visibleMetrics: ['conversionRate'], includeOpponent: true }
DEFAULT_TSR_CONFIG: { visibleMetrics: ['tsr'], includeOpponent: true }

// Passing metrics - show primary metric, include opponent
DEFAULT_PASSES_CONFIG: { visibleMetrics: ['passesFor'], includeOpponent: true }
DEFAULT_PASS_SHARE_CONFIG: { visibleMetrics: ['passShare'], includeOpponent: true }
DEFAULT_AVG_PASS_LENGTH_CONFIG: { visibleMetrics: ['avgPassLength'], includeOpponent: true }
DEFAULT_PPM_CONFIG: { visibleMetrics: ['ppm'], includeOpponent: true }
DEFAULT_PASS_STR_LENGTH_CONFIG: { visibleMetrics: ['passStrings35', 'passStrings6Plus', 'lpc'], includeOpponent: false }

// Specialized
DEFAULT_SPI_CONFIG: { visibleMetrics: ['spi', 'spiW'], includeOpponent: true }
DEFAULT_ATTEMPTS_CONFIG: { visibleMetrics: ['attempts'], includeOpponent: true }
DEFAULT_MISC_STATS_CONFIG: { visibleMetrics: ['cornersFor', 'freeKickFor'], includeOpponent: true }
```

---

## Testing Checklist

For each chart implementation:
- [ ] Load default config on mount
- [ ] Save user preferences
- [ ] Reset to defaults works
- [ ] Toggle metrics updates chart correctly
- [ ] Toggle opponent data updates chart correctly
- [ ] Chart title updates based on visible metrics
- [ ] Optional metrics only show when data available
- [ ] Chart renders correctly with all metrics hidden (edge case)
- [ ] Chart renders correctly with only opponent data (edge case)
- [ ] Preferences persist across page reloads

---

## Migration Notes

### Backward Compatibility
- All charts default to current behavior if no user preferences exist
- Existing charts (Shots, Possession) already follow this pattern
- No breaking changes to chart props (additive only)

### User Experience
- Configuration panel appears as gear icon (already implemented)
- Collapsible panel below chart
- Save/Reset buttons
- Visual feedback when config changes

---

## Success Metrics

- **Completion:** 16 charts with config panels
- **User Adoption:** % of users who customize at least one chart
- **Customization Rate:** Average number of charts customized per user
- **Feature Usage:** Most commonly toggled metrics
- **Performance:** No degradation in chart render time

---

## Next Steps

1. ✅ Review and approve this plan
2. Create `useChartConfig` hook
3. Extend `chartConfig.ts` with all chart types
4. Implement Batch 1 (Shooting metrics)
5. Test and iterate
6. Continue with remaining batches

---

## Notes & Considerations

- **Optional Metrics:** Some metrics may not be available in all datasets. Always check for prop existence before adding to `availableMetrics`.
- **Chart Type Extensions:** Some charts (ComposedChart) may need config extensions for element types (Line vs Bar).
- **Dynamic Charts:** PassByZoneChart and AutoChart may need custom configuration approaches.
- **Performance:** Conditional rendering should be efficient. Consider memoization for complex charts.
- **Accessibility:** Ensure configuration panel is keyboard accessible and screen-reader friendly.

---

## Quick Reference: Modifying Chart Defaults

### How to Change Default Metrics

1. **Open the defaults file:**
   ```
   src/types/chartConfig.ts
   ```

2. **Find the chart's default config:**
   ```typescript
   export const DEFAULT_SHOTS_CONFIG: ChartConfig = {
     visibleMetrics: ['shotsFor'],
     includeOpponent: true,
   };
   ```

3. **Modify the values:**
   - Add/remove metric IDs from `visibleMetrics` array
   - Change `includeOpponent` to `true` or `false`
   - Use metric IDs from the "Available Metrics Reference" section above

4. **Save the file** - Changes apply to all new users immediately

### Example Modifications

**Make ShotsChart show Shots + Attempts by default:**
```typescript
export const DEFAULT_SHOTS_CONFIG: ChartConfig = {
  visibleMetrics: ['shotsFor', 'attemptsFor'],  // Added 'attemptsFor'
  includeOpponent: true,
};
```

**Make PossessionChart show only Possession (no Pass Share):**
```typescript
export const DEFAULT_POSSESSION_CONFIG: ChartConfig = {
  visibleMetrics: ['possession'],  // Removed 'passShare'
  includeOpponent: false,  // Changed from true
};
```

**Make GoalsChart include xG by default:**
```typescript
export const DEFAULT_GOALS_CONFIG: ChartConfig = {
  visibleMetrics: ['goalsFor', 'goalsAgainst', 'xG'],  // Added 'xG'
  includeOpponent: true,
};
```

### Adding New Optional Metrics to a Chart

1. **In the chart component**, add the metric to `availableMetrics` array:
   ```typescript
   const availableMetrics = [
     { id: 'shotsFor', label: 'Shots For', required: false },
     ...(xGKey ? [{ id: 'xG', label: 'Expected Goals (xG)', required: false }] : []),
   ];
   ```

2. **In the chart data mapping**, add the metric when it's visible:
   ```typescript
   if (config.visibleMetrics.includes('xG') && xGKey) {
     base['xG'] = typeof match[xGKey] === 'number' ? match[xGKey] : 0;
   }
   ```

3. **In the render function**, add the chart element:
   ```typescript
   if (config.visibleMetrics.includes('xG') && xGKey) {
     bars.push(
       <Bar key="xG" dataKey="xG" fill={JOGA_COLORS.valorBlue} />
     );
   }
   ```

### Full List of Available Metrics

See the "Available Metrics Reference" section above for a complete list of all metric IDs organized by category (Shooting, Possession, Passing, JOGA Metrics, Misc Stats, Defensive).
