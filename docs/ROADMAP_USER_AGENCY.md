# User Agency Implementation Roadmap

## Quick Reference: What Users Will Be Able To Do

### Phase 0.5: Chart Configuration (Weeks 1-2) - Quick Win ✅ COMPLETE
**Users can:**
- ✅ Toggle individual metrics on/off in existing charts
- ✅ Add optional metrics to charts (e.g., add attempts to shots chart)
- ✅ Toggle opponent data inclusion
- ✅ Save their chart preferences
- ✅ Expand charts to full width
- ✅ All 18 charts now support full customization

**Example Use Case:**
> "I want to see shots, attempts, and goals all in one chart, but hide shots against"

### Phase 1: Custom Charts (Weeks 3-6)
**Users can:**
- Create charts by selecting any metrics
- Choose chart types (line, bar, scatter, area, etc.)
- Configure axes and aggregations
- Save and reuse custom charts

**Example Use Case:**
> "I want to see how our corner kicks correlate with goals scored, as a scatter plot"

### Phase 2: Calculated Metrics (Weeks 7-10)
**Users can:**
- Create formulas like `{Goals} / {Minutes} * 90` (Goals per 90)
- Use calculated metrics in any chart
- Share formulas with other coaches

**Example Use Case:**
> "I want a metric for 'Expected Goals per Shot' = xG / Shots"

### Phase 3: Custom Dashboards (Weeks 9-12)
**Users can:**
- Arrange charts in custom layouts
- Save multiple dashboard views
- Set a default dashboard
- Share dashboards with their team

**Example Use Case:**
> "I want a pre-game dashboard with just possession, shots, and xG charts"

### Phase 4: Advanced Features (Weeks 15-18)
**Prerequisites:** ✅ View-scoped URL state implemented (enables bookmarking)

**Users can:**
- Save filter combinations as bookmarks (leverages view-scoped URL state)
- Create automated reports
- Compare different views side-by-side
- Share insights with comments

**Example Use Case:**
> "I want a weekly email report with our team's key metrics"

---

## Implementation Checklist

### Phase 1: Custom Charts
- [ ] Create `CustomChartBuilder` component
- [ ] Create `DynamicChartRenderer` component
- [ ] Create `MetricExplorer` component
- [ ] Add `custom_charts` database table
- [ ] Create API routes for custom charts
- [ ] Add "Custom Charts" to navigation
- [ ] Add chart library/export functionality

### Phase 2: Calculated Metrics
- [ ] Create `CalculatedMetricBuilder` component
- [ ] Create `FormulaEditor` component
- [ ] Build formula engine/parser
- [ ] Add `calculated_metrics` database table
- [ ] Create API routes for calculated metrics
- [ ] Integrate calculated metrics into chart builder
- [ ] Add validation and error handling

### Phase 3: Custom Dashboards
- [ ] Create `DashboardBuilder` component
- [ ] Create `DashboardWidget` component
- [ ] Integrate drag-and-drop (react-grid-layout)
- [ ] Add `custom_dashboards` database table
- [ ] Create API routes for dashboards
- [ ] Add dashboard selector to navigation
- [ ] Implement default dashboard setting

### Phase 4: Advanced Features
- [ ] Create `SavedViewsManager` component
- [ ] Create `ReportBuilder` component
- [ ] Create `ComparisonView` component
- [ ] Add sharing/collaboration features
- [ ] Add scheduled report functionality
- [ ] Add export capabilities (PDF, Excel)

---

## Technical Dependencies

### New Libraries Needed
- **Chart Library:** Recharts or Chart.js (for dynamic rendering)
- **Grid Layout:** react-grid-layout (for dashboard builder)
- **Formula Parser:** mathjs or custom parser
- **PDF Generation:** jsPDF or Puppeteer (for reports)
- **Excel Export:** xlsx (for data export)

### Database Migrations
```sql
-- Migration 1: Custom Charts
-- Migration 2: Calculated Metrics  
-- Migration 3: Custom Dashboards
-- Migration 4: Saved Views
-- Migration 5: Custom Reports
```

### API Endpoints to Add
- ~20 new endpoints across 4 resource types
- Authentication/authorization for all endpoints
- Rate limiting for formula evaluation

---

## Quick Wins (Can Start Immediately)

1. **Chart Configuration Panel** - Low effort, high value ⭐ **NEW**
   - Add toggle controls to existing charts
   - Allow users to show/hide metrics
   - Save preferences per user
   - Immediate personalization without full custom chart builder

2. **Metric Explorer** - Low effort, high value
   - Shows all available metrics
   - Search and filter
   - Preview sample values
   - Helps users discover what's possible

2. **Chart Type Switcher** - Medium effort, high value
   - Allow users to change chart type for existing metrics
   - E.g., view Shots as line chart instead of bar chart
   - Quick way to give more agency without full custom builder

3. **Saved Filter Combinations** - Low effort, high value
   - Save current filter state (team + date range + opponent) - Uses view-scoped URL state
   - Quick access menu
   - Foundation for saved views

4. **Export Current View** - Low effort, high value
   - Export visible charts as image/PDF
   - Export filtered data as CSV/Excel
   - Immediate utility for coaches

---

## User Testing Plan

### Phase 1 Testing
- Give 3-5 coaches access to custom chart builder
- Task: "Create a chart comparing any two metrics you find interesting"
- Measure: Success rate, time to complete, satisfaction

### Phase 2 Testing
- Task: "Create a calculated metric for a stat you track manually"
- Measure: Formula correctness, usefulness, adoption

### Phase 3 Testing
- Task: "Build your ideal dashboard layout"
- Measure: Dashboard usage, time saved, satisfaction

---

## Rollout Strategy

### Beta Program
- Week 1-2: Internal testing with 2-3 power users
- Week 3-4: Extended beta with 10-15 coaches
- Week 5+: General availability

### Feature Flags
- Use feature flags to enable/disable features per user
- Gradual rollout (10% → 50% → 100%)
- Easy rollback if issues arise

### Documentation
- Video tutorials for each phase
- Example templates
- FAQ section
- In-app tooltips and help

---

## Success Criteria

### Phase 1 Success
- 50% of active users create at least 1 custom chart
- Average 3+ custom charts per active user
- 80% user satisfaction rating

### Phase 2 Success
- 30% of users create at least 1 calculated metric
- Calculated metrics used in 20% of custom charts
- Reduction in "can you add metric X?" requests

### Phase 3 Success
- 70% of users create a custom dashboard
- 50% set a custom dashboard as default
- Average dashboard views per user: 2+

### Phase 4 Success
- 40% of users use saved views
- 20% of users create scheduled reports
- 30% of users share dashboards/charts

---

## Next Steps

1. **Review this strategy** with stakeholders
2. **Prioritize phases** based on user feedback
3. **Create detailed technical specs** for Phase 1
4. **Set up project tracking** (GitHub issues, milestones)
5. **Begin Phase 1 implementation**
