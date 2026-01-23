/**
 * Walkthrough Configuration
 * 
 * Edit this file to modify walkthrough content without code changes.
 * Each screen represents one step in the walkthrough overlay.
 * 
 * The description field supports Markdown syntax:
 * - Use **bold** for bold text
 * - Use *italic* for italic text
 * - Use `code` for inline code
 * - Use blank lines to create paragraphs
 * - Use - or * for bullet lists
 * - Use 1. for numbered lists
 * - Use # for headings (h1, h2, h3)
 * 
 * Example:
 * description: `First paragraph with **bold** text.
 * 
 * Second paragraph with *italic* text.
 * 
 * - Bullet point 1
 * - Bullet point 2
 * 
 * 1. Numbered item 1
 * 2. Numbered item 2`
 */

import { JOGA_COLORS } from '../utils/colors';

export interface WalkthroughScreen {
  id: string;
  title: string;
  description: string; // Markdown supported
  bullets?: string[]; // Deprecated - use markdown lists in description instead
  gifPath: string;
  headerColor: string;
}

export const walkthroughScreens: WalkthroughScreen[] = [
  {
    id: 'welcome',
    title: 'Welcome to JOGA Analytics!',
    description: `Welcome to **JOGA Analytics**, your comprehensive platform for analyzing soccer match data and performance metrics.

This interactive walkthrough will guide you through the key features and help you get the most out of your analytics dashboard. You'll learn how to:

- Explore team and club performance data
- View interactive charts and visualizations
- Use AI-powered insights to answer questions about your data
- Manage your data and customize your experience

Ready to get started? Click **Next** to begin the tour!`,
    bullets: [],
    gifPath: '/walkthrough/welcome.gif',
    headerColor: JOGA_COLORS.voltYellow,
  },
  {
    id: 'navigation',
    title: 'Navigation Sidebar',
    description: `The **Navigation Sidebar** is your gateway to all features in JOGA Analytics.

The sidebar is organized into three main sections:

### Reporting
- **Team Data** - View detailed statistics for individual teams
- **Club Data** - Compare performance across all teams
- **Game Data** - Browse match-by-match statistics in a table format

### Tools
- **Upload Game Data** - Add new match data to your system
- **Metric Glossary** - Look up definitions for all metrics
- **Data at a Glance** - Quick overview of your data
- **AI Chat** - Ask questions and get insights about your data

### Admin
- **Settings** - Update preferences, change password, and manage your account`,
    bullets: [],
    gifPath: '/walkthrough/navigation.gif',
    headerColor: JOGA_COLORS.pinkFoam,
  },
  {
    id: 'team-data',
    title: 'Team Data - Individual Team Statistics',
    description: `The **Team Data** view provides detailed analytics for individual teams with interactive charts and visualizations.

### Key Features

- **Filter by Team** - Select any team to view their performance metrics
- **Opponent Filtering** - Analyze performance against specific opponents
- **Chart Groups** - Organize charts by category (Shooting, Passing, Possession, etc.)
- **Interactive Charts** - Click and hover to explore data points in detail
- **Expandable Views** - Click any chart to view it in full-screen mode

Use the filters at the top to narrow down your analysis, then explore the charts to identify trends and patterns in team performance.`,
    bullets: [],
    gifPath: '/walkthrough/team-data.gif',
    headerColor: JOGA_COLORS.valorBlue,
  },
  {
    id: 'club-data',
    title: 'Club Data - Compare Across All Teams',
    description: `The **Club Data** view allows you to compare performance across all teams in your club to identify trends and patterns.

**Key Features:**
- Side-by-side team comparisons with aggregate statistics
- Filter by boys/girls programs to focus on specific groups
- View club-wide performance trends and patterns
- Identify which teams excel in different metrics

Use this view to get a high-level overview of how all, or a subset of teams are performing and spot opportunities for improvement across the club.`,
    bullets: [],
    gifPath: '/walkthrough/club-data.gif',
    headerColor: JOGA_COLORS.voltYellow,
  },
  {
    id: 'game-data',
    title: 'Game Data - Match-by-Match Details',
    description: `The **Game Data** view displays match-by-match statistics in a detailed table format, perfect for reviewing specific games and drilling down into individual match details.

### Key Features

- **Comprehensive Table View** - See all match data in a spreadsheet-like table format
- **Sortable Columns** - Click any column header to sort and find patterns
- **Advanced Filtering** - Filter by teams, opponents, and date ranges
- **Metric Selection** - Choose which metrics to display in the table
- **Detailed Game View** - See all metrics for each game in one place

Use the filters and column selection to customize your view, then sort and analyze the data to identify trends and patterns across your matches.`,
    bullets: [],
    gifPath: '/walkthrough/game-data.gif',
    headerColor: JOGA_COLORS.pinkFoam,
  },
  {
    id: 'ai-chat',
    title: 'AI Chat - Ask Questions About Your Data',
    description: `The **AI Chat** feature allows you to ask questions about your match data in plain English and receive AI-powered insights and analysis.

### Key Features

- **Natural Language Queries** - Ask questions in plain English, no technical knowledge required
- **Data Analysis** - Get insights about team performance, trends, and patterns
- **Quick Answers** - Receive instant responses about your match data
- **Visualizations** - The AI can generate charts and visualizations based on your questions
- **Contextual Understanding** - The AI understands your data structure and provides relevant analysis

Try asking questions like "Show me possession stats from the last 5 games" or "Which team has the best conversion rate?" to get started.`,
    bullets: [],
    gifPath: '/walkthrough/ai-chat.gif',
    headerColor: JOGA_COLORS.valorBlue,
  },
  {
    id: 'additional-tools',
    title: 'Additional Tools',
    description: `The **Tools** section provides utilities for managing your data and getting quick insights.

### Upload Game Data
- **Manual Data Entry** - Add match data for individual games 
- **Quick Submission** - Submit game data quickly and efficiently

### Data at a Glance
- **Quick Overview** - Get a high-level summary of available match data
- **Data Health Check** - Quickly identify what data you have available

Use these tools to manage your data and get quick insights without diving into detailed analysis.`,
    bullets: [],
    gifPath: '/walkthrough/additional-tools.gif',
    headerColor: JOGA_COLORS.pinkFoam,
  },
  {
    id: 'metric-glossary',
    title: 'Metric Glossary',
    description: `The **Metric Glossary** provides definitions and explanations for all metrics used throughout JOGA Analytics.

### Key Features

- **Comprehensive Definitions** - Find explanations for every metric in your system
- **Organized by Category** - Browse metrics grouped by type (Shooting, Passing, Possession, etc.)
- **Search Functionality** - Quickly find specific metrics using the search bar

Use the glossary to understand what each metric means and how it's calculated, helping you make more informed decisions based on your data.`,
    bullets: [],
    gifPath: '/walkthrough/metric-glossary.gif',
    headerColor: JOGA_COLORS.valorBlue,
  },
  {
    id: 'settings',
    title: 'Settings & Preferences',
    description: `The **Settings** page allows you to customize your experience and manage your account preferences.

### Key Features

- **Account Information** - View and manage your account details
- **User Preferences** - Set date format and other options
- **Password Management** - Change your password securely
- **Walkthrough Control** - Restart the this tutorial anytime
- **Admin Tools** - Access user and team management (admin users only)

Customize your experience to match your preferences and workflow, ensuring JOGA Analytics works the way you need it to.`,
    bullets: [],
    gifPath: '/walkthrough/settings.gif',
    headerColor: JOGA_COLORS.voltYellow,
  },
];
