# Portrait Scraping Status

## Current Status

✅ **20 portraits downloaded** from Wikipedia  
⏳ **Batch scraping completed** (hit rate limits, but got what we could)  
📁 **Location**: `/var/www/socialpolitician-app/portraits/to-label/`

## Downloaded Portraits

The following portraits have been downloaded and are ready for review:
- Jon Tester
- Sherrod Brown  
- Bob Casey Jr.
- Tom O'Halleran
- Beto O'Rourke
- Jim Justice
- Gavin Newsom
- Ned Lamont
- Brian Kemp
- Jeff Landry
- Janet Mills
- Michelle Lujan Grisham
- And more...

## Rate Limiting

Wikipedia is rate-limiting our requests (HTTP 429). The script:
- ✅ Handles rate limits gracefully
- ✅ Waits 10 seconds when rate limited
- ✅ Continues processing after delays
- ⚠️  Some portraits couldn't be downloaded due to rate limits

## Next Steps

### 1. Review & Label Portraits
```bash
ssh doug@69.169.103.23
ls -lh /var/www/socialpolitician-app/portraits/to-label/
```

Review each portrait:
- Verify it matches the politician
- Check image quality
- Move verified ones to `portraits/labeled/`

### 2. Upload to PocketBase
```bash
cd /var/www/socialpolitician-app
POCKETBASE_URL=http://127.0.0.1:8091 \
POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
POCKETBASE_ADMIN_PASSWORD='VMAmadmia42O200!' \
node scripts/upload_portraits.js
```

### 3. Clear Browser Cache
See `CLEAR_CACHE.md` for instructions:
- Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
- Or clear site data in DevTools

### 4. Continue Scraping (Optional)
To get more portraits, wait a few hours and run again:
```bash
cd /var/www/socialpolitician-app
bash scripts/scrape_portraits_batch.sh
```

## Cache-Busting Implemented

✅ Added timestamp query params to image URLs:
- `PoliticiansDirectory.tsx`: `?t=${Date.now()}`
- `PoliticianProfile.tsx`: `?t=${Date.now()}`

This ensures images are always fetched fresh.

## Files Created

- `scripts/scrape_portraits.js` - Main scraping script
- `scripts/upload_portraits.js` - Upload script
- `scripts/scrape_portraits_batch.sh` - Batch scraping with delays
- `portraits/to-label/` - Downloaded portraits (needs review)
- `portraits/labeled/` - Verified portraits (ready to upload)
- `portraits/uploaded/` - Successfully uploaded portraits
