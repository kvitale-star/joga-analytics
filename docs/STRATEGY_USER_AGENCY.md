# Strategy: Increasing User Agency in Data Visualization

## Executive Summary

Currently, the app follows a **top-down, prescriptive model** where the programmer defines all charts, metrics, and views. Coaches can only select from predefined options. This strategy outlines a path to a **bottom-up, user-driven model** where coaches can create, customize, and save their own data visualizations and analysis workflows.

---

## Current State Analysis

### What Users Can Do Now
- ✅ Select from predefined chart types (Shots, Goals, Possession, etc.)
- ✅ Filter by team, opponent, date range, last N games
- ✅ Toggle chart visibility via dropdowns
- ✅ View metrics in Game Data view with category filtering
- ✅ Use AI chat for data questions

### What Users Cannot Do
- ❌ Create custom charts with their own metric combinations
- ❌ Define custom calculated metrics (e.g., "Goals per 90 minutes")
- ❌ Save custom dashboard layouts
- ❌ Create and save custom reports
- ❌ Change chart types for existing metrics (e.g., view shots as a scatter plot)
- ❌ Compare multiple custom views side-by-side
- ❌ Share custom views with other users
- ❌ Schedule automated reports
- ❌ Export custom data views

---

## Strategic Goals

1. **Empower coaches to answer their own questions** without waiting for developer changes
2. **Enable data exploration** beyond predefined views
3. **Support personalized workflows** that match each coach's analysis style
4. **Facilitate knowledge sharing** between coaches and teams
5. **Reduce developer burden** by making the app self-service

---

## Implementation Strategy

### Phase 0.5: Chart Configuration (Weeks 1-2) - Quick Win
**Goal:** Make existing charts more flexible and configurable

#### 0.5.1 Chart Configuration Panel
- **Component:** `ChartConfigPanel.tsx` (reusable component)
- **Features:**
  - Toggle visibility of individual metrics/series within a chart
  - Add/remove optional metrics (e.g., attempts, goals in shots chart)
  - Toggle opponent data inclusion
  - Save chart preferences per user
  - Reset to defaults

- **Example Use Cases:**
  - **Shots Chart:**
    - Toggle "Shots For" on/off
    - Toggle "Shots Against" on/off
    - Optionally add "Attempts For" metric
    - Optionally add "Attempts Against" metric
    - Optionally add "Goals For" metric
    - Optionally add "Goals Against" metric
    - Toggle "Include Opponents" (show opponent's shots in same chart)
  
  - **Goals Chart:**
    - Toggle "Goals For" on/off
    - Toggle "Goals Against" on/off
    - Optionally add "Expected Goals (xG)" metric
    - Optionally add "Expected Goals Against (xGA)" metric
    - Toggle opponent data inclusion
  
  - **Possession Chart:**
    - Toggle "Possession %" on/off
    - Toggle "Pass Share %" on/off
    - Optionally add "Time in Possession" metric
    - Toggle opponent data inclusion

- **Implementation Approach:**
  - Add `chartConfig` prop to existing chart components
  - Configuration object: `{ visibleMetrics: string[], includeOpponent: boolean }`
  - Store user preferences in `user_preferences` JSON field (or new `chart_preferences` table)
  - Charts dynamically render only selected metrics
  - UI: Collapsible panel with checkboxes for each available metric

- **Backend:**
  - Extend `user_preferences` JSON to include chart configurations:
    ```json
    {
      "chartPreferences": {
        "shots": {
          "visibleMetrics": ["shotsFor", "shotsAgainst", "attemptsFor"],
          "includeOpponent": true
        },
        "goals": {
          "visibleMetrics": ["goalsFor", "goalsAgainst"],
          "includeOpponent": false
        }
      }
    }
    ```
  - Or create new table: `chart_preferences`
    - `id`, `user_id`, `chart_type`, `config` (JSON), `created_at`, `updated_at`

- **API Endpoints:**
  - `GET /api/preferences/chart/:chartType` - Get user's chart preferences
  - `PUT /api/preferences/chart/:chartType` - Update chart preferences
  - `DELETE /api/preferences/chart/:chartType` - Reset to defaults

- **Benefits:**
  - Immediate value with minimal development
  - Users can personalize existing charts without creating new ones
  - Foundation for more advanced customization
  - No new chart types needed - just configuration
  - Backward compatible (defaults to current behavior)

- **Technical Implementation Example:**
  ```typescript
  // Before (hardcoded):
  <ShotsChart 
    data={data}
    shotsForKey="Shots For"
    shotsAgainstKey="Shots Against"
    opponentKey="Opponent"
  />
  
  // After (configurable):
  <ShotsChart 
    data={data}
    shotsForKey="Shots For"
    shotsAgainstKey="Shots Against"
    opponentKey="Opponent"
    config={{
      visibleMetrics: ['shotsFor', 'shotsAgainst', 'attemptsFor'], // User selected
      includeOpponent: true, // User preference
      optionalMetrics: {
        attemptsFor: 'Attempts For',
        attemptsAgainst: 'Attempts Against',
        goalsFor: 'Goals For',
        goalsAgainst: 'Goals Against'
      }
    }}
    onConfigChange={(newConfig) => saveChartPreferences('shots', newConfig)}
  />
  ```

- **UI Example:**
  - Small gear icon in chart header
  - Click opens collapsible panel below chart
  - Checkboxes for each metric:
    - ☑ Shots For (always visible)
    - ☑ Shots Against (always visible)
    - ☐ Attempts For (optional)
    - ☐ Attempts Against (optional)
    - ☐ Goals For (optional)
    - ☐ Goals Against (optional)
    - ☑ Include Opponents
  - "Save" and "Reset to Defaults" buttons

---

### Phase 1: Foundation (Weeks 3-6)
**Goal:** Enable basic custom chart creation

#### 1.1 Custom Chart Builder
- **Component:** `CustomChartBuilder.tsx`
- **Features:**
  - Drag-and-drop interface to select metrics
  - Chart type selector (line, bar, scatter, area, etc.)
  - X/Y axis configuration
  - Aggregation options (sum, average, count, min, max)
  - Filter application (team, date, opponent)
  - Preview before saving

- **Backend:**
  - New table: `custom_charts`
    - `id`, `user_id`, `name`, `description`
    - `chart_type` (line, bar, scatter, etc.)
    - `x_axis_metric`, `y_axis_metric` (or `metrics` JSON array)
    - `aggregation_type`, `filters` (JSON)
    - `created_at`, `updated_at`

- **API Endpoints:**
  - `POST /api/custom-charts` - Create chart
  - `GET /api/custom-charts` - List user's charts
  - `GET /api/custom-charts/:id` - Get chart config
  - `PUT /api/custom-charts/:id` - Update chart
  - `DELETE /api/custom-charts/:id` - Delete chart
  - `POST /api/custom-charts/:id/render` - Get chart data

#### 1.2 Dynamic Chart Renderer
- **Component:** `DynamicChartRenderer.tsx`
- **Features:**
  - Renders charts from configuration (not hardcoded components)
  - Supports all chart types via Chart.js or Recharts
  - Handles data transformation (aggregation, filtering)
  - Responsive sizing

#### 1.3 Metric Discovery
- **Component:** `MetricExplorer.tsx`
- **Features:**
  - Browse all available columns/metrics
  - Search and filter metrics
  - See metric descriptions and data types
  - Preview sample values
  - Show which charts currently use each metric

---

### Phase 2: Custom Metrics & Calculations (Weeks 5-8)
**Goal:** Allow users to create calculated metrics

#### 2.1 Calculated Metrics Builder
- **Component:** `CalculatedMetricBuilder.tsx`
- **Features:**
  - Formula builder (visual or text-based)
  - Support for:
    - Basic math: `+`, `-`, `*`, `/`, `%`
    - Functions: `AVG()`, `SUM()`, `COUNT()`, `MIN()`, `MAX()`
    - Conditional: `IF()`, `CASE WHEN`
    - Time-based: `PER_90()`, `PER_GAME()`
  - Validation and error checking
  - Preview with sample data

- **Backend:**
  - New table: `calculated_metrics`
    - `id`, `user_id`, `name`, `description`
    - `formula` (text), `formula_json` (structured)
    - `return_type` (number, percentage, etc.)
    - `is_public` (shareable with other users)

- **API Endpoints:**
  - `POST /api/calculated-metrics` - Create metric
  - `GET /api/calculated-metrics` - List metrics (user's + public)
  - `PUT /api/calculated-metrics/:id` - Update metric
  - `DELETE /api/calculated-metrics/:id` - Delete metric
  - `POST /api/calculated-metrics/:id/evaluate` - Test formula

#### 2.2 Formula Engine
- **Service:** `formulaEngine.ts`
- **Features:**
  - Parse and evaluate formulas
  - Support for metric references (`{Shots}`, `{Goals}`)
  - Safe execution (sandboxed)
  - Caching for performance

---

### Phase 3: Custom Dashboards (Weeks 9-12)
**Goal:** Let users create and save custom dashboard layouts

#### 3.1 Dashboard Builder
- **Component:** `DashboardBuilder.tsx`
- **Features:**
  - Drag-and-drop grid layout (react-grid-layout)
  - Add charts (predefined or custom)
  - Resize and reposition widgets
  - Multiple dashboard views per user
  - Set default dashboard

- **Backend:**
  - New table: `custom_dashboards`
    - `id`, `user_id`, `name`, `description`
    - `layout` (JSON - grid positions)
    - `widgets` (JSON array of chart/widget configs)
    - `is_default`, `is_public`
    - `created_at`, `updated_at`

- **API Endpoints:**
  - `POST /api/dashboards` - Create dashboard
  - `GET /api/dashboards` - List user's dashboards
  - `GET /api/dashboards/:id` - Get dashboard
  - `PUT /api/dashboards/:id` - Update dashboard
  - `DELETE /api/dashboards/:id` - Delete dashboard
  - `POST /api/dashboards/:id/set-default` - Set as default

#### 3.2 Widget System
- **Component:** `DashboardWidget.tsx`
- **Features:**
  - Wrapper for any chart type
  - Configurable refresh intervals
  - Export to image/PDF
  - Fullscreen mode
  - Edit/delete controls

---

### Phase 4: Advanced Features (Weeks 13-16)
**Goal:** Enable collaboration and automation

#### 4.1 Saved Views & Bookmarks
- **Component:** `SavedViewsManager.tsx`
- **Features:**
  - Save current filter/selection state
  - Quick access menu
  - Share with other users
  - Organize into folders

- **Backend:**
  - New table: `saved_views`
    - `id`, `user_id`, `name`, `description`
    - `view_type` (dashboard, game-data, club-data, etc.)
    - `state` (JSON - filters, selections, etc.)
    - `is_public`, `shared_with` (JSON array of user IDs)

#### 4.2 Custom Reports
- **Component:** `ReportBuilder.tsx`
- **Features:**
  - Define report sections (charts, tables, text)
  - Schedule automated generation
  - Email delivery
  - PDF/Excel export
  - Template system

- **Backend:**
  - New table: `custom_reports`
    - `id`, `user_id`, `name`, `description`
    - `sections` (JSON array)
    - `schedule` (cron expression or null)
    - `recipients` (JSON array of emails)
    - `format` (pdf, excel, html)

#### 4.3 Comparison Views
- **Component:** `ComparisonView.tsx`
- **Features:**
  - Side-by-side comparison of:
    - Different teams
    - Different time periods
    - Different metrics
    - Custom vs. baseline
  - Statistical significance indicators
  - Difference highlighting

#### 4.4 Sharing & Collaboration
- **Features:**
  - Share dashboards with specific users or teams
  - Public gallery of community-created charts
  - Comments/annotations on charts
  - Version history for custom charts

---

## Technical Architecture

### Frontend Components

```
src/
├── components/
│   ├── chart-config/
│   │   ├── ChartConfigPanel.tsx
│   │   └── MetricToggle.tsx
│   ├── custom-charts/
│   │   ├── CustomChartBuilder.tsx
│   │   ├── DynamicChartRenderer.tsx
│   │   ├── ChartTypeSelector.tsx
│   │   └── AxisConfigurator.tsx
│   ├── calculated-metrics/
│   │   ├── CalculatedMetricBuilder.tsx
│   │   ├── FormulaEditor.tsx
│   │   └── MetricPreview.tsx
│   ├── dashboards/
│   │   ├── DashboardBuilder.tsx
│   │   ├── DashboardWidget.tsx
│   │   └── DashboardSelector.tsx
│   ├── saved-views/
│   │   ├── SavedViewsManager.tsx
│   │   └── ViewBookmark.tsx
│   └── reports/
│       ├── ReportBuilder.tsx
│       └── ReportScheduler.tsx
├── services/
│   ├── customChartsService.ts
│   ├── calculatedMetricsService.ts
│   ├── dashboardsService.ts
│   ├── savedViewsService.ts
│   └── reportsService.ts
└── utils/
    ├── formulaEngine.ts
    ├── chartDataTransformer.ts
    └── aggregationHelpers.ts
```

### Backend Schema

```sql
-- Chart Preferences (Phase 0.5)
CREATE TABLE chart_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  chart_type TEXT NOT NULL, -- 'shots', 'goals', 'possession', etc.
  config JSON NOT NULL, -- { visibleMetrics: string[], includeOpponent: boolean }
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, chart_type)
);

-- Custom Charts
CREATE TABLE custom_charts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  chart_type TEXT NOT NULL, -- 'line', 'bar', 'scatter', etc.
  config JSON NOT NULL, -- Full chart configuration
  is_public BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Calculated Metrics
CREATE TABLE calculated_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  formula TEXT NOT NULL,
  formula_json JSON,
  return_type TEXT DEFAULT 'number',
  is_public BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Custom Dashboards
CREATE TABLE custom_dashboards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  layout JSON NOT NULL, -- Grid layout positions
  widgets JSON NOT NULL, -- Array of widget configs
  is_default BOOLEAN DEFAULT 0,
  is_public BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Saved Views
CREATE TABLE saved_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  view_type TEXT NOT NULL, -- 'dashboard', 'game-data', etc.
  state JSON NOT NULL, -- Filter/selection state
  is_public BOOLEAN DEFAULT 0,
  shared_with JSON, -- Array of user IDs
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Custom Reports
CREATE TABLE custom_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sections JSON NOT NULL,
  schedule TEXT, -- Cron expression or NULL
  recipients JSON, -- Array of email addresses
  format TEXT DEFAULT 'pdf',
  last_run_at DATETIME,
  next_run_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### API Routes

```typescript
// Chart Preferences (Phase 0.5)
GET    /api/preferences/chart/:chartType
PUT    /api/preferences/chart/:chartType
DELETE /api/preferences/chart/:chartType

// Custom Charts
POST   /api/custom-charts
GET    /api/custom-charts
GET    /api/custom-charts/:id
PUT    /api/custom-charts/:id
DELETE /api/custom-charts/:id
POST   /api/custom-charts/:id/render

// Calculated Metrics
POST   /api/calculated-metrics
GET    /api/calculated-metrics
GET    /api/calculated-metrics/:id
PUT    /api/calculated-metrics/:id
DELETE /api/calculated-metrics/:id
POST   /api/calculated-metrics/:id/evaluate

// Dashboards
POST   /api/dashboards
GET    /api/dashboards
GET    /api/dashboards/:id
PUT    /api/dashboards/:id
DELETE /api/dashboards/:id
POST   /api/dashboards/:id/set-default

// Saved Views
POST   /api/saved-views
GET    /api/saved-views
GET    /api/saved-views/:id
PUT    /api/saved-views/:id
DELETE /api/saved-views/:id

// Reports
POST   /api/reports
GET    /api/reports
GET    /api/reports/:id
PUT    /api/reports/:id
DELETE /api/reports/:id
POST   /api/reports/:id/run
POST   /api/reports/:id/schedule
```

---

## User Experience Flow

### Creating a Custom Chart
1. User navigates to "Custom Charts" section
2. Clicks "Create New Chart"
3. Selects metrics from explorer (with search/filter)
4. Chooses chart type
5. Configures axes, aggregation, filters
6. Previews chart with sample data
7. Saves chart with name/description
8. Chart appears in their dashboard/widget library

### Creating a Calculated Metric
1. User navigates to "Calculated Metrics"
2. Clicks "Create New Metric"
3. Enters formula (e.g., `{Goals} / {Minutes} * 90`)
4. System validates and shows preview
5. User saves metric
6. Metric appears in metric explorer and can be used in charts

### Building a Custom Dashboard
1. User navigates to "My Dashboards"
2. Clicks "Create New Dashboard"
3. Drags charts/widgets onto grid
4. Resizes and repositions widgets
5. Adds filters that apply to all widgets
6. Saves dashboard
7. Can set as default or share with others

---

## Migration Path

### For Existing Users
- All existing charts remain available
- New "Custom" section added to navigation
- Gradual introduction via onboarding tooltips
- Templates provided for common use cases

### For New Features
- Start with read-only custom charts (Phase 1)
- Add calculated metrics (Phase 2)
- Enable dashboard customization (Phase 3)
- Add collaboration features (Phase 4)

---

## Success Metrics

1. **Adoption Rate:** % of users who create at least one custom chart
2. **Engagement:** Average number of custom charts per active user
3. **Self-Service:** Reduction in "can you add a chart for X?" requests
4. **Time to Insight:** How quickly users can answer their own questions
5. **Sharing:** Number of shared dashboards/charts

---

## Risk Mitigation

### Performance Concerns
- **Risk:** Custom charts/queries could be slow
- **Mitigation:** 
  - Query optimization and caching
  - Limit complexity of calculated metrics
  - Background processing for heavy reports

### Data Quality
- **Risk:** Users create incorrect formulas/metrics
- **Mitigation:**
  - Formula validation
  - Preview before saving
  - Error messages with suggestions
  - Admin review for public metrics

### Complexity
- **Risk:** Feature overload confuses users
- **Mitigation:**
  - Progressive disclosure (advanced features hidden by default)
  - Templates and examples
  - Onboarding tutorials
  - Simple mode vs. advanced mode toggle

---

## Future Enhancements (Post-Phase 4)

1. **AI-Powered Suggestions:** "Based on your data, you might want to compare..."
2. **Anomaly Detection:** Automatic alerts for unusual patterns
3. **Predictive Analytics:** Forecast future performance
4. **Mobile App:** View dashboards on mobile devices
5. **API Access:** Programmatic access to custom charts/data
6. **Integration:** Connect with other tools (Excel, Tableau, etc.)

---

## Implementation Priority

### Must Have (MVP)
- ✅ **Chart configuration panel** - Make existing charts flexible (Phase 0.5)
- ✅ Custom chart builder with basic chart types
- ✅ Dynamic chart renderer
- ✅ Save/load custom charts
- ✅ Calculated metrics with basic formulas

### Should Have
- ✅ Custom dashboards with drag-and-drop
- ✅ Saved views/bookmarks
- ✅ Sharing capabilities

### Nice to Have
- ✅ Scheduled reports
- ✅ Advanced formula functions
- ✅ Comparison views
- ✅ Public gallery

---

## Conclusion

This strategy transforms the app from a **static reporting tool** into a **dynamic analysis platform** where coaches can:
- Answer their own questions without developer intervention
- Create personalized workflows
- Share insights with their teams
- Build institutional knowledge through saved views and templates

The phased approach allows for incremental delivery while maintaining system stability and user experience.
