# GitHub Wiki Setup Instructions

This directory contains wiki content ready to be uploaded to GitHub.

## Setting Up the GitHub Wiki

GitHub wikis are separate git repositories. Follow these steps to set up the wiki:

### Step 1: Enable Wiki in GitHub

1. Go to your GitHub repository
2. Click **Settings**
3. Scroll to **Features** section
4. Check **Wikis** checkbox
5. Click **Save**

### Step 2: Clone the Wiki Repository

```bash
# Replace with your repository URL
git clone https://github.com/YOUR_USERNAME/joga-analytics.wiki.git
cd joga-analytics.wiki
```

### Step 3: Copy Wiki Files

```bash
# From the main repository directory
cp -r wiki/* /path/to/joga-analytics.wiki/
```

### Step 4: Commit and Push

```bash
cd /path/to/joga-analytics.wiki
git add .
git commit -m "Initial wiki content"
git push origin master
```

## Wiki Structure

The wiki includes 16 pages:

### Core Pages
- **Home.md** - Main landing page with overview
- **Getting-Started.md** - First-time user guide
- **User-Guide.md** - Complete user guide

### View Guides
- **Team-Data-View.md** - Dashboard/Team analysis guide
- **Club-Data-View.md** - Multi-team comparison guide
- **Game-Data-View.md** - Match-by-match analysis guide

### Feature Guides
- **Upload-Game-Data.md** - Data entry guide
- **Match-Editor.md** - Editing matches (Admin)
- **AI-Chat-Assistant.md** - Using the AI features
- **Chart-Customization.md** - Customizing charts
- **Settings-and-Preferences.md** - Account and preferences

### Reference
- **Metric-Glossary.md** - Complete metric definitions
- **FAQ.md** - Frequently asked questions
- **Troubleshooting.md** - Solutions to common problems

### Navigation
- **_Sidebar.md** - Navigation sidebar

## Customizing the Wiki

### Adding New Pages

1. Create a new `.md` file in the `wiki/` directory
2. Add a link to it in `_Sidebar.md`
3. Add a link in `Home.md` if appropriate
4. Follow the same markdown format

### Updating Existing Pages

1. Edit the `.md` file
2. Commit changes to the wiki repository
3. Push to GitHub

### Wiki Formatting

GitHub wikis support:
- Standard Markdown
- Internal links: `[Page Name](Page-Name)`
- External links: `[Text](https://url.com)`
- Images: `![Alt](image-url)`
- Code blocks with syntax highlighting

## Maintenance

### Regular Updates
- Update pages when features change
- Add new pages for new features
- Keep FAQ and Troubleshooting current

### Version Control
- Wiki has its own git history
- Commit messages should describe changes
- Consider tagging major updates

## Notes

- Wiki pages use `.md` extension
- Page names become URLs (spaces become hyphens)
- `_Sidebar.md` controls the navigation sidebar
- `Home.md` is the default landing page
