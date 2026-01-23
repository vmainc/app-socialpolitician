# Portrait Pipeline Status

## Overview

The portrait pipeline downloads politician photos from Wikipedia and uploads them to PocketBase. It's designed to handle 600+ records safely with rate limiting and resume support.

## Directory Structure

```
portraits/
├── to-label/      # Downloaded portraits (default location)
├── labeled/       # Manually reviewed/approved portraits
├── uploaded/      # Successfully uploaded to PocketBase
└── index.json     # Progress tracking (recordId → metadata)
```

## Quick Start

### Run Complete Pipeline
```bash
cd /var/www/socialpolitician-app
POCKETBASE_URL=http://127.0.0.1:8091 \
POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
POCKETBASE_ADMIN_PASSWORD='your-password' \
bash scripts/run_data_enrichment.sh
```

This runs:
1. Nginx verification
2. Wikipedia enrichment (social links, website, district)
3. Portrait download (first batch)
4. Portrait upload

### Manual Steps

#### 1. Download Portraits
```bash
node scripts/scrape_portraits.js [--use-labeled] [--limit=N]
```

Options:
- `--use-labeled`: Download to `portraits/labeled/` instead of `portraits/to-label/`
- `--limit=N`: Limit to N records (useful for testing)

#### 2. Review Portraits (Optional)
Manually review portraits in `portraits/to-label/`:
- Verify image matches politician
- Check image quality
- Move approved ones to `portraits/labeled/`

#### 3. Upload Portraits
```bash
node scripts/upload_portraits.js [--use-labeled] [--dry-run]
```

Options:
- `--use-labeled`: Upload from `portraits/labeled/` instead of `portraits/to-label/`
- `--dry-run`: Preview what would be uploaded without actually uploading

#### 4. Batch Processing
For large-scale downloads, use the batch wrapper:
```bash
BATCH_SIZE=25 BATCH_DELAY=60 bash scripts/scrape_portraits_batch.sh
```

This runs in batches of 25 with 60-second delays between batches.

## How It Works

### Download Process
1. Fetches politicians without photos from PocketBase
2. Extracts Wikipedia title from `wikipedia_url` field
3. Uses MediaWiki API to get page image URL
4. Downloads image to `portraits/to-label/{slug}_{recordId}.{ext}`
5. Updates `portraits/index.json` with metadata

### Upload Process
1. Scans `portraits/to-label/` (or `portraits/labeled/`) for image files
2. Extracts record ID from filename (`{slug}_{recordId}.ext`)
3. Uploads to PocketBase `photo` field using multipart form data
4. Moves file to `portraits/uploaded/` on success
5. Updates index with upload status

### Resume Support
- Progress is saved in `portraits/index.json`
- Already-downloaded files are skipped
- Can stop and resume at any time
- Index tracks: filepath, status, timestamps, Wikipedia URLs

## Rate Limiting

Wikipedia API rate limiting is handled automatically:
- **Baseline**: 1 request per second
- **429/503 errors**: Exponential backoff with jitter
- **Consecutive errors**: Max 5 before aborting record
- **Batch delays**: 60 seconds between batches (configurable)

## File Naming

Portraits are named deterministically:
```
{slug}_{recordId}.{ext}
```

Example: `joe_biden_abc123xyz456.jpg`

This ensures:
- No filename conflicts
- Easy record ID extraction
- Deterministic downloads (skip if exists)

## Status Tracking

The `portraits/index.json` file tracks:
```json
{
  "recordId": {
    "recordId": "abc123xyz456",
    "slug": "joe_biden",
    "name": "Joe Biden",
    "filepath": "portraits/to-label/joe_biden_abc123xyz456.jpg",
    "wikipedia_url": "https://en.wikipedia.org/wiki/Joe_Biden",
    "wikipedia_title": "Joe Biden",
    "image_url": "https://upload.wikimedia.org/...",
    "status": "to-label" | "labeled" | "uploaded",
    "downloaded_at": "2026-01-23T12:00:00Z",
    "uploaded_at": "2026-01-23T12:30:00Z"
  }
}
```

## Troubleshooting

### Portraits Not Downloading
- Check Wikipedia URL exists in PocketBase record
- Verify MediaWiki API is accessible
- Check rate limiting (429 errors)
- Review `portraits/index.json` for errors

### Upload Failures
- Verify PocketBase authentication
- Check file size (max 5MB per PocketBase schema)
- Ensure record ID matches filename
- Check PocketBase logs for errors

### Nginx File Serving Issues
If images return 404 through nginx:
```bash
sudo bash scripts/fix_nginx_pb_files.sh
sudo bash scripts/verify_nginx_pb_files.sh
```

## Related Scripts

- `scripts/run_data_enrichment.sh` - Complete pipeline runner
- `scripts/scrape_portraits.js` - Portrait downloader
- `scripts/upload_portraits.js` - Portrait uploader
- `scripts/scrape_portraits_batch.sh` - Batch wrapper
- `server/src/scripts/enrichPoliticiansFromWikipedia.ts` - Wikipedia enrichment
