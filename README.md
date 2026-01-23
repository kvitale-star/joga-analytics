# JOGA Analytics

A modern web application for coaches to visualize match data from Google Sheets. This app provides interactive charts and analytics for shots, possession, xG, conversion rates, and more.

## Features

- 📊 Interactive data visualizations (charts, graphs, stats)
- 📈 Multiple chart types (bar, line, area charts)
- 🎯 Automatic column detection from your Google Sheet
- 🔍 Match-by-match analysis or aggregate views
- 🤖 AI-powered chatbot for natural language data queries (powered by Google Gemini)
- 🎨 Modern, responsive UI built with React and Tailwind CSS
- 📱 Mobile-friendly design
- 👥 User management with role-based access (admin, coach, viewer)
- 🏆 Team management across multiple seasons
- ⚙️ Chart customization (Phase 0.5 - ✅ Complete) - Toggle metrics, opponent data, and save preferences

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Backend Environment

All API keys and secrets are configured in the **backend** environment only (never in the frontend).

Create a `.env` file in the `backend/` directory with:

```bash
# Google Sheets Configuration
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_API_KEY=your_api_key_here

# AI Chatbot (Optional)
GEMINI_API_KEY=your_gemini_api_key_here

# Session Security
SESSION_SECRET=your_random_secret_here
```

**Getting the keys:**
- **Google Sheet ID**: Found in your Google Sheets URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
- **Google API Key**: Get from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (enable "Google Sheets API")
- **Gemini API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

### 3. Make Your Sheet Public

For the API key method to work:
1. Open your Google Sheet
2. Click "Share" → "Change to anyone with the link"
3. Set permission to "Viewer"

### 4. Run the Application

```bash
npm run dev
```

The app will open at `http://localhost:3000`

## Data Format

Your Google Sheet should be organized as follows:
- **Rows**: Each row represents a match
- **Columns**: Each column represents a statistic (e.g., "Shots For", "Shots Against", "Possession", "xG", etc.)

The app will automatically detect common column names like:
- `shotsFor`, `Shots For`, `shots_for`
- `shotsAgainst`, `Shots Against`, `shots_against`
- `possession`, `Possession`
- `xG`, `xg`, `Expected Goals`
- `xGA`, `xG Against`
- `conversionRate`, `Conversion Rate`
- `opponent`, `Opponent`, `Date`, `date`

## Customization

### Adding New Visualizations

1. Create a new component in `src/components/`
2. Import and use it in `src/App.tsx`
3. Add logic to detect the relevant column keys

### Changing Chart Types

The app uses [Recharts](https://recharts.org/) for visualizations. You can modify the chart components to use different chart types or customize styling.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
joga-visualizer/
├── backend/          # Express API server (TypeScript, SQLite, Kysely)
│   ├── src/
│   │   ├── db/      # Database schema, migrations
│   │   ├── routes/  # API endpoints
│   │   ├── services/# Business logic
│   │   └── scripts/ # Utility scripts
│   └── README.md    # Backend documentation
├── src/             # React frontend (TypeScript, Vite, Tailwind)
│   ├── components/  # React components
│   ├── services/    # API clients
│   └── utils/       # Utility functions
├── docs/            # Project documentation
└── scripts/         # Development scripts
```

## Documentation

- **[Backend README](./backend/README.md)** - Backend API documentation
- **[Outstanding Items](./docs/OUTSTANDING_ITEMS.md)** - Planned features and phases
- **[Chart Customization Plan](./docs/PHASE_0.5_CHART_CUSTOMIZATION_PLAN.md)** - Chart customization implementation (✅ Complete - All 18 charts)
- **[View State Implementation](./docs/VIEW_STATE_IMPLEMENTATION.md)** - View-scoped URL state (✅ Implemented)
- **[View State Recommendations](./docs/VIEW_STATE_MANAGEMENT_RECOMMENDATIONS.md)** - Original analysis and recommendations
- **[Deployment Guide](./docs/RAILWAY_DEPLOYMENT_QUICKSTART.md)** - Railway deployment
- **[Team Management](./docs/TEAM_MANAGEMENT.md)** - Team management features
- **[Security Plan](./docs/SECURITY_REMEDIATION_PLAN.md)** - Security improvements

## Troubleshooting

### "Access denied" Error
- Make sure your API key is correct in `backend/.env`
- Ensure the Google Sheets API is enabled in your Google Cloud project
- Verify `GOOGLE_SHEETS_SPREADSHEET_ID` and `GOOGLE_SHEETS_API_KEY` are set

### "Spreadsheet not found" Error
- Verify the spreadsheet ID in `backend/.env` (`GOOGLE_SHEETS_SPREADSHEET_ID`)
- Make sure the sheet exists and you have access to it
- Ensure the sheet is public (for API key authentication)

### Charts Not Showing
- Check that your column names match the expected format
- Look at the "Detected Columns" section in development mode
- Ensure your data contains numeric values for the statistics you want to visualize

### Backend Connection Issues
- Verify backend is running on `http://localhost:3001`
- Check `FRONTEND_URL` in `backend/.env` matches your frontend URL
- Ensure CORS is configured correctly

## License

MIT


