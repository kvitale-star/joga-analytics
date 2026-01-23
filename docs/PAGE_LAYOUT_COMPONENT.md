# PageLayout Component

**Last Updated:** January 2025  
**Purpose:** Unified page layout component for consistent structure across all views

---

## Overview

The `PageLayout` component provides a standardized structure for all pages in JOGA Analytics, ensuring visual consistency and reducing code duplication. It was introduced to unify the design system across Glossary, Data at a Glance, Upload Game Data, and AI Chat views.

## Component Location

`src/components/PageLayout.tsx`

## Usage

```tsx
import { PageLayout } from './PageLayout';

<PageLayout
  title="Page Title"
  subtitle="Optional subtitle"
  headerActions={<button>Action</button>}
  maxWidth="6xl"
  footer={<div>Footer content</div>}
>
  {/* Page content */}
</PageLayout>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | **required** | Page title displayed in header |
| `subtitle` | `string` | `undefined` | Optional subtitle below title |
| `headerActions` | `ReactNode` | `undefined` | Actions/buttons to display in header (before UserMenu) |
| `children` | `ReactNode` | **required** | Main page content |
| `maxWidth` | `'4xl' \| '6xl' \| '7xl' \| 'full'` | `'6xl'` | Maximum width of content container |
| `className` | `string` | `''` | Additional classes for root container |
| `contentClassName` | `string` | `''` | Additional classes for content area |
| `footer` | `ReactNode` | `undefined` | Optional footer content (e.g., input area for Chat) |

## Features

### Standard Header
- White background with shadow and border
- Title (text-2xl, bold)
- Optional subtitle (text-sm, gray-600)
- Header actions on the right (before UserMenu)
- UserMenu always included

### Content Area
- Scrollable content area with padding
- Centered container with configurable max-width
- Responsive design

### Optional Footer
- White background with top border
- Useful for fixed input areas (e.g., AI Chat)

## Examples

### Basic Page
```tsx
<PageLayout
  title="Data at a Glance"
  subtitle="Overview of your match data"
>
  <div>Content here</div>
</PageLayout>
```

### Page with Header Actions
```tsx
<PageLayout
  title="Glossary"
  subtitle="Definitions and explanations for all metrics"
  headerActions={
    <button onClick={handleSync}>Sync</button>
  }
>
  <div>Content here</div>
</PageLayout>
```

### Page with Footer
```tsx
<PageLayout
  title="JOGA Analytics AI"
  subtitle="AI-Powered Match Data Analysis"
  footer={
    <div className="px-6 py-4">
      <input type="text" />
      <button>Send</button>
    </div>
  }
>
  <div>Messages here</div>
</PageLayout>
```

### Form Page (Narrower Width)
```tsx
<PageLayout
  title="Upload Game Data"
  subtitle="Enter data for a single game"
  maxWidth="4xl"
>
  <form>Form fields here</form>
</PageLayout>
```

## Pages Using PageLayout

- ✅ **Glossary** - Uses header actions for Sync button
- ✅ **Data at a Glance** - Standard layout
- ✅ **Upload Game Data** - Uses `maxWidth="4xl"` for form
- ✅ **AI Chat** - Uses footer for input area

## Design System Integration

The PageLayout component enforces:
- Consistent header structure across all pages
- Standardized typography hierarchy
- Unified spacing and padding
- JOGA brand color integration (via header actions)
- Responsive container widths

## Migration Notes

Pages migrated from custom layouts to PageLayout:
- **Glossary**: Added standard header, moved Sync button to headerActions
- **Data at a Glance**: Replaced custom header with PageLayout
- **Upload Game Data**: Replaced custom header with PageLayout
- **AI Chat**: Replaced custom header, moved input to footer prop

## Future Considerations

- Consider adding breadcrumb support
- Add optional sidebar prop for pages that need it
- Consider adding loading state support
- Add optional back button in header
