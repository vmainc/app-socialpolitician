# Data Enrichment Pipeline Implementation

## Overview

This document describes the complete data enrichment pipeline for the Social Politician app. The pipeline fixes nginx file serving, enriches politician data from Wikipedia, and downloads/uploads portraits.

## Files Created/Modified

### Nginx Fixes
- ✅ `scripts/fix_nginx_pb_files.sh` - Fixes nginx config to properly proxy `/pb/api/files/` URLs
- ✅ `scripts/verify_nginx_pb_files.sh` - Verifies nginx configuration for PocketBase file serving

### Wikipedia Enrichment
- ✅ `server/src/scripts/enrichPoliticiansFromWikipedia.ts` - Enriches politicians with:
  - District (for representatives)
  - Website URL
  - Social media links (X, Facebook, Instagram, YouTube, TikTok, Truth Social, LinkedIn)

### Portrait Pipeline
- ✅ `scripts/scrape_portraits.js` - Downloads portraits from Wikipedia via MediaWiki API
- ✅ `scripts/upload_portraits.js` - Uploads portraits to PocketBase photo field
- ✅ `scripts/scrape_portraits_batch.sh` - Batch wrapper for large-scale downloads

### Master Runner
- ✅ `scripts/run_data_enrichment.sh` - Complete pipeline runner

### Documentation
- ✅ `PORTRAIT_STATUS.md` - Updated with new pipeline information
- ✅ `SYSTEM_STATE_FOR_CHATGPT.md` - Updated with recent fixes

## Environment Variables Required

```bash
export POCKETBASE_URL=http://127.0.0.1:8091
export POCKETBASE_ADMIN_EMAIL=admin@vma.agency
export POCKETBASE_ADMIN_PASSWORD=your-password
```

## Single Command to Run

```bash
cd /var/www/socialpolitician-app

POCKETBASE_URL=http://127.0.0.1:8091 \
POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
POCKETBASE_ADMIN_PASSWORD=your-password \
bash scripts/run_data_enrichment.sh
```

## What the Pipeline Does

1. **Nginx Verification** - Checks that `/pb/api/files/` URLs work through nginx
2. **Wikipedia Enrichment** - Fetches missing data (district, website, social links) from Wikipedia
3. **Portrait Download** - Downloads politician photos from Wikipedia (first batch of 25)
4. **Portrait Upload** - Uploads downloaded portraits to PocketBase

## Individual Script Usage

### Fix Nginx (if needed)
```bash
sudo bash scripts/fix_nginx_pb_files.sh
sudo bash scripts/verify_nginx_pb_files.sh
```

### Wikipedia Enrichment Only
```bash
npx tsx server/src/scripts/enrichPoliticiansFromWikipedia.ts
```

### Portrait Download Only
```bash
node scripts/scrape_portraits.js [--limit=25] [--use-labeled]
```

### Portrait Upload Only
```bash
node scripts/upload_portraits.js [--use-labeled] [--dry-run]
```

### Batch Portrait Download
```bash
BATCH_SIZE=25 BATCH_DELAY=60 bash scripts/scrape_portraits_batch.sh
```

## Progress Tracking

- **Enrichment Progress**: `tmp/enrich_progress.json`
- **Enrichment Results**: `tmp/enrich_results.json`
- **Portrait Index**: `portraits/index.json`

## Directory Structure

```
portraits/
├── to-label/      # Downloaded portraits (default)
├── labeled/       # Manually reviewed portraits
├── uploaded/      # Successfully uploaded portraits
└── index.json     # Progress tracking

tmp/
├── enrich_progress.json  # Enrichment progress
└── enrich_results.json   # Enrichment results
```

## Rate Limiting

All scripts handle rate limiting automatically:
- **Wikipedia API**: 1 request/second baseline, exponential backoff on 429/503
- **Batch Processing**: 60-second delays between batches (configurable)

## Resume Support

All scripts support resume:
- **Enrichment**: Tracks last processed ID in `tmp/enrich_progress.json`
- **Portraits**: Tracks downloaded files in `portraits/index.json`
- Can stop and resume at any time

## Acceptance Tests

After running the pipeline, verify:

1. ✅ `https://app.socialpolitician.com/pb/api/health` returns 200
2. ✅ `https://app.socialpolitician.com/pb/api/files/...` returns 401/403 (not 404)
3. ✅ Representatives have district populated
4. ✅ Politicians have website/social links
5. ✅ Photo count increases (check PocketBase admin UI)

## Troubleshooting

### Nginx File Serving Issues
```bash
sudo bash scripts/fix_nginx_pb_files.sh
sudo systemctl reload nginx
bash scripts/verify_nginx_pb_files.sh
```

### Wikipedia Rate Limiting
- Scripts automatically handle 429 errors with backoff
- If persistent, wait a few hours and resume

### Portrait Upload Failures
- Check file size (max 5MB per PocketBase schema)
- Verify record ID matches filename format: `{slug}_{recordId}.ext`
- Check PocketBase logs: `sudo journalctl -u socialpolitician-app-pocketbase.service -f`

## Next Steps

1. Run the complete pipeline: `bash scripts/run_data_enrichment.sh`
2. Monitor progress in `tmp/` and `portraits/` directories
3. Run additional portrait batches as needed
4. Review portraits in `portraits/to-label/` before uploading
