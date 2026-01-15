# JOGA Design Colors

## Brand Color Palette

JOGA uses three primary brand colors for all team-related data, buttons, and visual elements:

### Primary JOGA Colors

1. **Volt Yellow** - `#ceff00` / `rgb(206, 255, 0)`
   - Nike Volt Yellow
   - Used for: JOGA team data, primary buttons, highlights, charts

2. **Valor Blue** - `#6787aa` / `rgb(103, 135, 170)`
   - Nike Valor Blue
   - Used for: JOGA team data, secondary buttons, charts, accents

3. **Pink Foam** - `#FFC0CB` / `rgb(255, 192, 203)`
   - Pink Foam
   - Used for: JOGA team data, buttons, visual elements, charts

### Usage Guidelines

**✅ ALWAYS use these three colors for:**
- JOGA team data in charts and visualizations
- Buttons and interactive elements
- Team-related information displays
- Brand-consistent UI elements

**✅ Use gray shades for:**
- Opponent data in charts
- Neutral/background elements
- Secondary information

### Opponent Colors

Opponent data should always be represented using different shades of gray:

- **Primary Gray**: `#6b7280` (gray-500)
- **Secondary Gray**: `#9ca3af` (gray-400)
- **Dark Gray**: `#4b5563` (gray-600)
- **Light Gray**: `#d1d5db` (gray-300)

## Implementation

### In Code

```typescript
import { JOGA_COLORS, OPPONENT_COLORS } from '../utils/colors';

// Use JOGA colors for team data
const jogaColors = [
  JOGA_COLORS.voltYellow,  // #ceff00
  JOGA_COLORS.valorBlue,   // #6787aa
  JOGA_COLORS.pinkFoam,    // #FFC0CB
];

// Use gray shades for opponent data
const opponentColors = [
  OPPONENT_COLORS.primary,   // #6b7280
  OPPONENT_COLORS.secondary, // #9ca3af
];
```

### Helper Functions

```typescript
// Get all three JOGA team colors
getJogaTeamColors(); // Returns [voltYellow, valorBlue, pinkFoam]

// Get opponent colors (gray shades)
getOpponentColors(); // Returns [primary, secondary]

// Get default chart colors (JOGA primary, opponent gray)
getDefaultChartColors(); // Returns [voltYellow, primary]
```

## Chart Color Guidelines

### For Charts with JOGA Team Data

- **First series**: Use Volt Yellow, Valor Blue, or Pink Foam
- **Second series**: Use a different JOGA color if comparing JOGA metrics
- **Opponent series**: Always use gray shades

### Examples

**Team vs Opponent Comparison:**
- JOGA team: Volt Yellow (`#ceff00`)
- Opponent: Primary Gray (`#6b7280`)

**Multiple JOGA Metrics:**
- Metric 1: Volt Yellow (`#ceff00`)
- Metric 2: Valor Blue (`#6787aa`)
- Metric 3: Pink Foam (`#FFC0CB`)

**JOGA vs Opponent with Multiple Series:**
- JOGA Series 1: Volt Yellow (`#ceff00`)
- JOGA Series 2: Valor Blue (`#6787aa`)
- Opponent Series 1: Primary Gray (`#6b7280`)
- Opponent Series 2: Secondary Gray (`#9ca3af`)

## Button Styling

Buttons should use JOGA brand colors:

```typescript
// Primary button
backgroundColor: JOGA_COLORS.voltYellow
border: `2px solid ${JOGA_COLORS.voltYellow}`

// Secondary button
backgroundColor: JOGA_COLORS.valorBlue
border: `2px solid ${JOGA_COLORS.valorBlue}`

// Tertiary button
backgroundColor: JOGA_COLORS.pinkFoam
border: `2px solid ${JOGA_COLORS.pinkFoam}`
```

## Accessibility

When using these colors:

- **Volt Yellow**: Use black text (`#000000`) for contrast
- **Valor Blue**: Use white or light text for contrast
- **Pink Foam**: Use black or dark text for contrast
- **Gray shades**: Ensure sufficient contrast for readability

## Consistency

**Remember:**
- ✅ Three JOGA colors (Volt Yellow, Valor Blue, Pink Foam) = JOGA team data
- ✅ Gray shades = Opponent data
- ✅ Never use JOGA colors for opponent data
- ✅ Never use opponent colors (gray) for JOGA team data
