# Image Support Guide

This guide explains how to include images in your Google Sheet and have them displayed in the app.

## Important Limitation

**Google Sheets API cannot directly retrieve images embedded in cells.** However, the app supports images stored as **URLs** in cells.

## How to Add Images

### Option 1: Direct Image URLs (Recommended)

Store image URLs directly in your sheet cells:

1. Upload your image to an image hosting service:
   - **Imgur** (https://imgur.com) - Free, easy
   - **Google Drive** (see Option 2 below)
   - **ImgBB** (https://imgbb.com)
   - Any public image hosting service

2. Copy the direct image URL (ends with `.jpg`, `.png`, etc.)

3. Paste the URL into your Google Sheet cell

**Example:**
```
https://i.imgur.com/abc123.jpg
https://example.com/images/match-photo.png
```

### Option 2: Google Drive Images

If you store images in Google Drive:

1. Upload image to Google Drive
2. Right-click → "Get link" → Set to "Anyone with the link"
3. Copy the sharing link
4. Paste into your Google Sheet

The app will automatically convert Google Drive sharing links to direct image URLs.

**Supported Google Drive URL formats:**
- `https://drive.google.com/file/d/FILE_ID/view`
- `https://drive.google.com/open?id=FILE_ID`
- Just the file ID: `FILE_ID`

## How Images Are Displayed

### In Chat Interface

When the AI references images or when image URLs are detected in responses:
- Images appear in a responsive gallery
- Click any image to view full-size in a modal
- Images are automatically detected from:
  - Markdown image syntax: `![alt text](image-url)`
  - Plain URLs in the response text

### In Dashboard

Currently, images are primarily displayed in the chat interface. Dashboard support can be added if needed.

## Supported Image Formats

- `.jpg` / `.jpeg`
- `.png`
- `.gif`
- `.webp`
- `.svg`
- `.bmp`

## Example Use Cases

### Match Photos
Create a column called "Match Photo" or "Image" and add image URLs:
```
Match Photo
https://i.imgur.com/match1.jpg
https://i.imgur.com/match2.jpg
```

### Team Logos
Store team logo URLs in a "Logo" column:
```
Logo
https://drive.google.com/file/d/abc123/view
```

### Tactical Diagrams
Include tactical diagram URLs:
```
Tactical Diagram
https://imgur.com/tactics.png
```

## AI Awareness

The AI is aware of image columns in your data. When you ask questions like:
- "Show me images from the last match"
- "Display photos from games against Team X"
- "What images are associated with this match?"

The AI will reference and display images from your sheet.

## Troubleshooting

### Images Not Displaying

1. **Check URL format**: Must be a direct image URL or Google Drive sharing link
2. **Check permissions**: Google Drive images must be set to "Anyone with the link"
3. **Check CORS**: Some hosting services block cross-origin requests
4. **Check console**: Open browser DevTools to see any loading errors

### Google Drive Images Not Working

1. Ensure the file is set to "Anyone with the link can view"
2. Try using the direct image URL format: `https://drive.google.com/uc?export=view&id=FILE_ID`
3. Check that the file ID is correct

### Best Practices

1. **Use reliable hosting**: Imgur and Google Drive are recommended
2. **Optimize images**: Large images load slowly
3. **Use descriptive column names**: "Match Photo", "Team Logo", etc.
4. **Keep URLs in separate columns**: Don't mix URLs with other data

## Technical Details

The app automatically:
- Detects image URLs in data columns
- Converts Google Drive links to direct image URLs
- Displays images in a responsive gallery
- Provides full-size viewing in a modal

Image detection works by:
1. Checking file extensions (.jpg, .png, etc.)
2. Checking known image hosting domains
3. Attempting Google Drive URL conversion

