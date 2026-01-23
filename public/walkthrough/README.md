# Walkthrough Images

This directory contains images (GIF or PNG) used in the walkthrough overlay.

## Required Images

Place the following image files in this directory:

1. **welcome.gif** (or welcome.png) - Welcome screen
2. **navigation.gif** (or navigation.png) - Navigation sidebar demonstration
3. **team-data.gif** (or team-data.png) - Team Data view: selecting team, chart group, viewing charts
4. **club-data.gif** (or club-data.png) - Club Data view: comparing teams
5. **game-data.gif** (or game-data.png) - Game Data view: table navigation and filtering
6. **ai-chat.gif** (or ai-chat.png) - AI Chat: asking questions and getting responses
7. **additional-tools.gif** (or additional-tools.png) - Upload Game Data and Data at a Glance tools
8. **metric-glossary.gif** (or metric-glossary.png) - Metric Glossary view
9. **settings.gif** (or settings.png) - Settings page: managing preferences

## Specifications

- **Dimensions:** 640px × 480px (4:3 aspect ratio)
- **Format:** GIF (animated) or PNG (static)
- **File size:** Keep under 2MB per image for optimal loading
- **Content:** Each image should demonstrate the basic functionality of its topic

## Image Fallback Behavior

The walkthrough supports automatic fallback from GIF to PNG:
- If `welcome.gif` exists, it will be used
- If `welcome.gif` doesn't exist but `welcome.png` does, the PNG will be used
- If neither exists, the JOGA logo placeholder (`/joga-logo-bw.png`) will be displayed

This allows the walkthrough to function with either animated GIFs or static PNGs, depending on your preference.
