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
- `scripts/enrich_governors.sh` - Enrich governors with links and photos
- `scripts/scrape_governor_portraits.sh` - Download and upload governor portraits
- `scripts/run_data_enrichment.sh` - Complete data enrichment pipeline

### Portrait Management
- `scripts/scrape_portraits.js` - Download portraits from Wikipedia
- `scripts/upload_portraits.js` - Upload portraits to PocketBase

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

- `DATA_ENRICHMENT_IMPLEMENTATION.md` - Data enrichment pipeline details
- `PHOTO_STORAGE_GUIDE.md` - Photo storage and routing guide
- `PORTRAIT_STATUS.md` - Portrait pipeline status
- `SYSTEM_STATE_FOR_CHATGPT.md` - Current system state

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: PocketBase
- **Styling**: Tailwind CSS
- **Deployment**: Nginx reverse proxy
