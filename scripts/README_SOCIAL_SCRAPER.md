# Social Media Link Scraper

This script (`pb_social_hybrid.mjs`) scrapes social media links from official websites and Wikipedia pages, then updates PocketBase with the found links.

## Features

- **Official Site Scraping (Playwright)**: Crawls official websites to find social links in headers/footers and contact pages
- **Wikipedia Fallback**: Uses Wikipedia "External links" section if official site doesn't have all links
- **Smart Link Scoring**: Prefers profile URLs over share links, validates domain matches
- **Non-Destructive**: Only fills missing fields, never overwrites existing links
- **Blocked Domains**: Hard-blocks `.gov` domains from official site scraping

## Installation

```bash
npm i cheerio
npm i -D playwright
npx playwright install chromium
```

## Usage

### Local PocketBase

```bash
PB_BASE_URL="http://127.0.0.1:8091" \
PB_ADMIN_EMAIL="admin@vma.agency" \
POCKETBASE_ADMIN_PASSWORD="your-password" \
MAX_RECORDS=50 \
node scripts/pb_social_hybrid.mjs
```

### Production (VPS)

```bash
cd /var/www/socialpolitician-app
git pull origin main

PB_BASE_URL="http://127.0.0.1:8091" \
PB_ADMIN_EMAIL="admin@vma.agency" \
POCKETBASE_ADMIN_PASSWORD="VMAmadmia42O200!" \
MAX_RECORDS=100 \
node scripts/pb_social_hybrid.mjs
```

## Environment Variables

- `PB_BASE_URL`: PocketBase URL (default: `http://127.0.0.1:8091`)
- `PB_ADMIN_EMAIL`: Admin email for authentication
- `POCKETBASE_ADMIN_PASSWORD`: Admin password (note: variable name typo in script, should be `PB_ADMIN_PASSWORD`)
- `MAX_RECORDS`: Maximum number of politicians to process (default: 99999)
- `MAX_SITE_PAGES`: Maximum pages to crawl per official site (default: 15)
- `NAV_TIMEOUT_MS`: Playwright navigation timeout (default: 15000ms)

## How It Works

1. **Fetches politicians** with `website_url` or `wikipedia_url`
2. **Official Site Pass (A)**:
   - Crawls homepage, contact, about, social pages
   - Extracts all links and scores them
   - Only stays on the official domain (blocks .gov)
3. **Wikipedia Pass (B)**:
   - Only used for platforms still missing after A
   - Scrapes Wikipedia page for external links
4. **Updates PocketBase**:
   - Only updates missing fields (doesn't overwrite existing)
   - Updates: `facebook_url`, `x_url`, `instagram_url`, `youtube_url`, `tiktok_url`, `linkedin_url`, `truth_social_url`

## Link Scoring

Links are scored based on:
- ✅ Profile-like URLs (e.g., `twitter.com/username`)
- ❌ Share links (e.g., `twitter.com/share`)
- ✅ Shorter URLs (cleaner)
- ✅ Official domain bonus

## Output

The script outputs progress for each politician:
```
[1] John Smith
  official: https://johnsmith.com
  wiki:     https://en.wikipedia.org/wiki/John_Smith
  A socials: {"x_url":"https://x.com/johnsmith","facebook_url":"https://facebook.com/johnsmith"}
  B socials: {"instagram_url":"https://instagram.com/johnsmith"}
  updated: {"instagram_url":"https://instagram.com/johnsmith"}
```

## Notes

- The script respects rate limits and handles errors gracefully
- Playwright runs in headless mode
- Wikipedia scraping uses cheerio (no JS rendering needed)
- Only processes politicians with at least one URL (website or Wikipedia)
