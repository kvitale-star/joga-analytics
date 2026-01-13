# Joga Visualizer

A modern web application for coaches to visualize match data from Google Sheets. This app provides interactive charts and analytics for shots, possession, xG, conversion rates, and more.

## Features

- 📊 Interactive data visualizations (charts, graphs, stats)
- 📈 Multiple chart types (bar, line, area charts)
- 🎯 Automatic column detection from your Google Sheet
- 🔍 Match-by-match analysis or aggregate views
- 🤖 AI-powered chatbot for natural language data queries (powered by Google Gemini)
- 🎨 Modern, responsive UI built with React and Tailwind CSS
- 📱 Mobile-friendly design

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Google Sheets

1. Open `src/config.ts`
2. Replace `YOUR_SPREADSHEET_ID_HERE` with your Google Sheet ID
   - The Sheet ID is in your Google Sheets URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
3. Replace `YOUR_API_KEY_HERE` with your Google API Key
   - Get one from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Enable the "Google Sheets API" for your project

### 3. Make Your Sheet Public (Optional)

If you want to use the simple API key method:
1. Open your Google Sheet
2. Click "Share" → "Change to anyone with the link"
3. Set permission to "Viewer"

### 4. Configure AI Chatbot (Optional)

To enable the AI chatbot feature:

1. Get a free Google Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a `.env` file in the root directory (copy from `.env.example`)
3. Add your API key: `VITE_GEMINI_API_KEY=your_api_key_here`

The chatbot allows you to ask natural language questions about your match data, such as:
- "Show me possession stats from the last 5 games"
- "Compare shots and SPI across all teams"
- "What's the average xG for recent matches?"

### 5. Run the Application

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

## Troubleshooting

### "Access denied" Error
- Make sure your API key is correct
- Ensure the Google Sheets API is enabled in your Google Cloud project
- If using a private sheet, consider making it public or implementing OAuth

### "Spreadsheet not found" Error
- Verify the spreadsheet ID in `src/config.ts`
- Make sure the sheet exists and you have access to it

### Charts Not Showing
- Check that your column names match the expected format
- Look at the "Detected Columns" section in development mode
- Ensure your data contains numeric values for the statistics you want to visualize

## License

MIT


