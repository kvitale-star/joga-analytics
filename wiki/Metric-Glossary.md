# Metric Glossary

Complete reference for all metrics available in JOGA Analytics.

## Shooting Metrics

### Shots For
Total number of shots taken by your team (excluding goals).

### Shots Against
Total number of shots taken by the opponent (excluding goals).

### Goals For
Number of goals scored by your team.

### Goals Against
Number of goals conceded to the opponent.

### Attempts For
Total attempts by your team (shots + goals). Includes all shots on goal.

### Attempts Against
Total attempts by the opponent (shots + goals).

### Expected Goals (xG)
Quality-weighted measure of goal-scoring chances. Higher xG = better chances.

### Expected Goals Against (xGA)
Opponent's expected goals. Measures quality of chances you allowed.

### Conversion Rate
Percentage of shots that result in goals. Calculated as: (Goals / Shots) × 100

### Total Shots Ratio (TSR)
Your shots divided by total shots (yours + opponent's). Measures shot dominance.

## Possession & Passing

### Possession
Percentage of time your team had the ball.

### Passes For
Total number of passes completed by your team.

### Passes Against
Total number of passes completed by the opponent.

### Pass Share
Your passes as percentage of total passes (yours + opponent's).

### Average Pass Length
Average distance of passes in meters.

### Pass Strings
Sequences of consecutive passes:
- **3-Pass Strings**: Number of sequences with 3+ passes
- **6+ Pass Strings**: Number of sequences with 6+ passes

### Sustained Passing Index (SPI)
Measure of passing continuity. Higher SPI = more sustained passing sequences.

### Passes Per Minute (PPM)
Rate of passing. Higher PPM = more active passing.

## Advanced Metrics

### Positional Attempts
Shots broken down by field position:
- Inside the box
- Outside the box

### Pass by Zone
Passing distribution across field zones.

### Set Pieces
- **Corners For/Against**: Corner kicks
- **Free Kicks For/Against**: Free kicks

## Defensive Metrics

### Defensive Actions
Various defensive statistics (varies by data source).

## JOGA-Specific Metrics

### Weighted Metrics
Some metrics have weighted versions (e.g., SPI (w)) that apply additional weighting factors.

## Understanding Metrics

### Percentages
- Possession, Pass Share, Conversion Rate are percentages
- Range from 0% to 100%
- Higher is generally better (except for opponent metrics)

### Ratios
- TSR, ratios compare your performance to opponent's
- Values above 0.5 indicate dominance
- Values below 0.5 indicate being dominated

### Counts
- Shots, Goals, Passes are counts
- Higher numbers generally better (for "For" metrics)
- Lower numbers generally better (for "Against" metrics)

## Metric Availability

### Not All Metrics Available
- Some metrics require specific data entry
- Not all matches have all metrics
- Computed metrics require source data

### Computed Metrics
Some metrics are calculated from others:
- Conversion Rate = Goals / Shots
- TSR = Shots For / (Shots For + Shots Against)
- SPI = Calculated from pass strings

## Tips for Understanding Metrics

1. **Context Matters**: Consider opponent strength, match conditions
2. **Trends Over Time**: Look at changes, not just single values
3. **Compare Related Metrics**: Shots + xG + Goals = complete picture
4. **Use Opponent Data**: Compare your metrics to opponent's for context
5. **Check Glossary**: Use this glossary when unsure about a metric

---

**Related Pages:**
- [Team Data View](Team-Data-View) - See metrics in charts
- [Chart Customization](Chart-Customization) - Customize metric display
