# Social Politician

A directory and search platform for U.S. Senators, Representatives, and Governors.

## Features

- **Searchable Directory**: Search and filter politicians by name, state, office type, and party
- **Politician Profiles**: Detailed profiles with photos, bios, and social links
- **Data Enrichment**: Automated enrichment from Wikipedia (links, photos, bios)
- **Portrait Pipeline**: Download and upload politician portraits

## Quick Start

### Development

```bash
npm install
npm run dev
```

### Production Deployment

```bash
# On VPS
cd /var/www/socialpolitician-app
bash scripts/complete_deployment.sh
```

## Active Scripts

### Data Enrichment
- `server/src/scripts/backfillBiosFromWikipedia.ts` - Backfill **headline** (hero) and **bio** (~500-word Biography accordion) from Wikipedia for politicians missing bio; use `--office-type=governor` (or senator/representative) to limit
- `server/src/scripts/copyBioToHeadline.ts` - One-time: copy existing `bio` → `headline` for records with empty headline (run after adding the headline field so the hero shows current content in full)
- `scripts/enrich_governors.sh` - Enrich governors with links and photos
- `scripts/scrape_governor_portraits.sh` - Download and upload governor portraits
- `scripts/run_data_enrichment.sh` - Complete data enrichment pipeline

### Portrait Management
- `scripts/scrape_portraits.js` - Download portraits from Wikipedia (saves to `portraits/to-label/`)
- `scripts/upload_portraits.js` - Upload portraits from `portraits/to-label/` or `portraits/labeled/` to PocketBase
- `scripts/upload_portraits_by_slug.js` - Attach photos from `portraits/uploaded/` to politician records by **slug** (use after re-import when record IDs changed; fixes e.g. Gavin Newsom missing image)

### Fix missing governor photos (e.g. Gavin Newsom, Spencer Cox)
If profile pages show no image after a re-import (record IDs changed) or a governor was never scraped:

1. **Attach existing uploaded photos by slug** (fixes Gavin Newsom and others already in `portraits/uploaded/`):
   ```bash
   POCKETBASE_URL=http://127.0.0.1:8091 \
   POCKETBASE_ADMIN_EMAIL=... POCKETBASE_ADMIN_PASSWORD=... \
   node scripts/upload_portraits_by_slug.js
   ```
2. **Fetch missing portraits** (e.g. Spencer Cox) from Wikipedia into `portraits/to-label/`:
   ```bash
   node scripts/scrape_portraits.js
   ```
3. **Upload from to-label to PocketBase** (and move files to `portraits/uploaded/`):
   ```bash
   node scripts/upload_portraits.js
   ```

### Politicians reset and 585 target (435 House, 100 Senate, 50 Governors)
- **Remove all politicians from PocketBase** (then re-import from clean data):
  ```bash
  POCKETBASE_URL=http://127.0.0.1:8091 \
  POCKETBASE_ADMIN_EMAIL=... POCKETBASE_ADMIN_PASSWORD=... \
  npx tsx server/src/scripts/deleteAllPoliticians.ts
  ```
- **Remove media sources from data** (already run once; removes Slate, CNN, etc. from `data/politicians_import_ready.json`):
  ```bash
  node scripts/removeMediaFromPoliticiansData.mjs
  ```
- Import uses `data/senators_import_ready.json`, `data/representatives_import_ready.json`, `data/governors_import_ready.json`, and `data/politicians_import_ready.json` (no media; `sources` field is never written to PocketBase).

### Deployment
- `scripts/complete_deployment.sh` - Full deployment (pull, build, reload)
- `deploy-to-vps.sh` - Deploy to VPS

### Utilities
- `scripts/fix_nginx_working.sh` - Fix Nginx for PocketBase file serving
- `scripts/apply_nginx_file_fix.sh` - Alternative Nginx fix
- `scripts/verify_nginx_pb_files.sh` - Verify Nginx configuration
- `scripts/check_photo_storage.sh` - Check photo storage

## Environment Variables

- `VITE_PB_BASE` - PocketBase URL (defaults to `/pb` in prod, `http://127.0.0.1:8091` in dev)
- `POCKETBASE_URL` - PocketBase URL for scripts (defaults to `http://127.0.0.1:8091`)
- `POCKETBASE_ADMIN_EMAIL` - Admin email for scripts
- `POCKETBASE_ADMIN_PASSWORD` - Admin password for scripts

## Documentation

- **`docs/TERMINAL_COMMANDS.md`** – **Which machine runs which commands** (local vs VPS; deploy, push, portraits, bios)
- `DATA_ENRICHMENT_IMPLEMENTATION.md` - Data enrichment pipeline details
- `PHOTO_STORAGE_GUIDE.md` - Photo storage and routing guide
- `PORTRAIT_STATUS.md` - Portrait pipeline status
- `SYSTEM_STATE_FOR_CHATGPT.md` - Current system state

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: PocketBase
- **Styling**: Tailwind CSS
- **Deployment**: Nginx reverse proxy
