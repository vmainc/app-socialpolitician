# Representative Images Scraper

Scripts to scrape and upload House of Representatives member images from Wikipedia.

## Files Created

1. **`scripts/scrape_representative_images.js`**
   - Scrapes representative images from: https://en.wikipedia.org/wiki/List_of_current_United_States_representatives
   - Downloads images to `portraits/representatives/`
   - Creates `portraits/representatives/index.json` with metadata
   - Includes rate limiting and retry logic for Wikimedia API

2. **`scripts/upload_representative_photos.js`**
   - Uploads scraped images to PocketBase `politicians` collection
   - Matches representatives by name (with accent/HTML entity handling)
   - Filters for `office_type="representative"`

## Usage

### Step 1: Scrape Images

```bash
node scripts/scrape_representative_images.js
```

This will:
- Fetch the Wikipedia page
- Parse the representatives table
- Download ~435 representative portraits
- Save to `portraits/representatives/`
- Create `index.json` with names, districts, and image URLs

**Note:** This may take 10-15 minutes due to rate limiting (1 second between requests).

### Step 2: Upload to PocketBase

```bash
# Set environment variables (or use defaults)
export POCKETBASE_URL="http://127.0.0.1:8091"
export POCKETBASE_ADMIN_EMAIL="admin@example.com"
export POCKETBASE_ADMIN_PASSWORD="your-password"

node scripts/upload_representative_photos.js
```

This will:
- Authenticate with PocketBase
- Match each representative by name (handles accents, HTML entities)
- Upload photos to the `politicians` collection
- Report success/failure for each upload

## Features

- **Robust Name Matching**: Handles accents (á, é, í, ó, ú), HTML entities (&aacute;, &eacute;), and special characters
- **Rate Limiting**: Respects Wikimedia API limits with exponential backoff
- **Error Handling**: Gracefully handles missing representatives, failed downloads, and upload errors
- **Progress Reporting**: Shows detailed progress for each step

## Verification

After uploading, verify the results:

```bash
# Check how many representatives have photos
node -e "
import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8091');
await pb.admins.authWithPassword('admin@example.com', 'your-password');
const reps = await pb.collection('politicians').getFullList({ filter: 'office_type=\"representative\"' });
const withPhotos = reps.filter(r => r.photo);
console.log(\`Total representatives: \${reps.length}\`);
console.log(\`With photos: \${withPhotos.length}\`);
console.log(\`Without photos: \${reps.length - withPhotos.length}\`);
"
```
