# System State Summary for ChatGPT Analysis

## Project Overview
**Social Politician App** - A web application displaying U.S. Senators, Representatives, and Governors with their profiles and social media feeds.

**Live URL:** https://app.socialpolitician.com  
**Tech Stack:** React + Vite (frontend), PocketBase (backend/database), Nginx (reverse proxy)

## Recent Fixes (Jan 2026)

### ✅ Nginx File Serving Fixed
- Created `scripts/fix_nginx_pb_files.sh` to fix `/pb/api/files/` routing
- Created `scripts/verify_nginx_pb_files.sh` for verification
- Static files regex now excludes `/pb/` paths
- `/pb/` location block verified to come before regex blocks

### ✅ Wikipedia Enrichment Pipeline
- Created `server/src/scripts/enrichPoliticiansFromWikipedia.ts`
- Enriches: district (for reps), website_url, social media links
- Uses MediaWiki API (not scraping)
- Rate limiting with exponential backoff
- Resume support via `tmp/enrich_progress.json`

### ✅ Portrait Pipeline Recreated
- `scripts/scrape_portraits.js` - Downloads from Wikipedia via MediaWiki API
- `scripts/upload_portraits.js` - Uploads to PocketBase photo field
- `scripts/scrape_portraits_batch.sh` - Batch wrapper with delays
- Progress tracking in `portraits/index.json`
- Resume support (skips already-downloaded files)

### ✅ Master Runner Script
- `scripts/run_data_enrichment.sh` - Runs complete pipeline:
  1. Nginx verification
  2. Wikipedia enrichment
  3. Portrait download
  4. Portrait upload
  5. Final summary

### How to Run
```bash
POCKETBASE_URL=http://127.0.0.1:8091 \
POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
POCKETBASE_ADMIN_PASSWORD=your-password \
bash scripts/run_data_enrichment.sh
```

---

## Current System State

### Database Statistics
- **Total Politicians:** 658 records
- **Senators:** 104 (office_type='senator')
- **Governors:** 50 (office_type='governor')
- **Representatives:** 433 (office_type='representative')
- **Records with Photos:** 18 (confirmed via file count)

### Data Quality Issues

#### Representatives
- ✅ **431 representatives imported** from Wikipedia (just completed)
- ✅ All have `current_position = 'U.S. Representative'`
- ✅ All have `office_type = 'representative'`
- ❌ **Missing photos** - Only 1 representative (Beto O'Rourke) has a photo
- ❌ **Missing districts** - District field appears empty for new imports
- ❌ **Missing fields** - Many missing social media links, official websites, etc.
- **Sample Data:**
  - Barry Moore, Shomari Figures, Mike Rogers (Alabama) - No photos, basic data only
  - Beto O'Rourke (DE) - Has photo, marked as "Previous Representative"

#### Senators
- ✅ **104 senators** in database
- ✅ Most have `office_type='senator'` and `current_position='U.S. Senator'` or `'Senator'`
- ❌ **Missing photos** - Only a few have photos (exact count unknown)
- ❌ **Missing fields** - Some may be missing social media links

#### Governors
- ✅ **50 governors** in database
- ✅ Most have `office_type='governor'` and `current_position='Governor'`
- ❌ **Missing photos** - Only a few have photos
- ❌ **Missing fields** - Some may be missing social media links

---

## Database Schema (Politicians Collection)

### Key Fields (Actual Schema)
```sql
CREATE TABLE `politicians` (
  `id` TEXT PRIMARY KEY,
  `name` TEXT NOT NULL,
  `slug` TEXT NOT NULL,
  `office_type` TEXT NOT NULL,
  `current_position` TEXT NOT NULL,
  `state` TEXT NOT NULL,
  `political_party` TEXT NOT NULL,
  `photo` TEXT NOT NULL,
  `district` TEXT NOT NULL,
  `wikipedia_url` TEXT NOT NULL,
  `website_url` TEXT NOT NULL,
  `x_url` TEXT NOT NULL,
  `facebook_url` TEXT NOT NULL,
  `instagram_url` TEXT NOT NULL,
  `youtube_url` TEXT NOT NULL,
  `truth_social_url` TEXT NOT NULL,
  `tiktok_url` TEXT NOT NULL,
  `linkedin_url` TEXT NOT NULL,
  `position_start_date` TEXT NOT NULL
)
```

**Note:** Fields like `summary`, `knowledge_base`, `system_prompt`, `wikipedia_title` may exist in PocketBase schema but not in SQLite table structure shown.

### Current Position Values Found
- "U.S. Senator"
- "Senator"
- "Previous Senator"
- "U.S. Representative"
- "Previous Representative"
- "Governor"
- "Previous Governor"

---

## Frontend Implementation

### Filtering Logic (PoliticiansDirectory.tsx)
```typescript
// For representatives, checks both:
filter: `office_type="representative" || current_position~"U.S. Representative"`

// For senators and governors:
filter: `office_type="${officeType}"`
```

### Image Display
- Uses `pb.files.getURL(record, record.photo)` with cache-busting: `?t=${Date.now()}`
- Falls back to placeholder avatar if photo missing or fails to load

---

## Known Issues

### 1. Missing Photos
- **Problem:** Only 18 politicians have photos uploaded out of 658 total (97% missing)
- **Impact:** 640 politicians show placeholder avatars
- **Location:** Files stored in `/var/www/socialpolitician-app/pocketbase/pb_data/storage/pbc_3830222512/`
- **Status:** Portrait scraping system exists but only partially completed
- **Photo Examples Found:**
  - Representatives: beto_orourke_gd4dgo5npf.jpg (1 photo)
  - Senators: jon_tester_3k3kqd3q1w.jpg, bob_casey_jr_hhq9ccfzz8.jpg (2 photos)
  - Governors: mike_braun_sw8ps32dbi.jpg (1 photo)
  - Plus ~14 other photos for various politicians

### 2. Nginx File Serving (Partially Fixed)
- **Problem:** Nginx regex location block intercepts `/pb/api/files/` requests
- **Impact:** Image requests return 404 even though files exist
- **Status:** Fix identified but requires nginx config change + reload
- **Fix Needed:** Modify static files regex to exclude `/pb/` paths

### 3. Missing Data Fields
- **Problem:** Many politicians missing:
  - Social media links (X, Facebook, Instagram, etc.)
  - Official websites
  - District information (for representatives)
  - Biographical summaries
  - Knowledge base content
- **Impact:** Incomplete profiles, missing social links

### 4. Representatives Data Quality
- **Problem:** Just imported 431 representatives, but:
  - Only basic fields populated (name, state, party, wikipedia_url)
  - Missing photos
  - Missing social media links
  - Missing district information
  - Missing biographical data
- **Status:** Basic import complete, enrichment needed

---

## API Endpoints

### Working Endpoints
- ✅ `GET /pb/api/health` - Health check
- ✅ `GET /pb/api/collections/politicians/records` - List politicians
- ✅ `GET /pb/api/collections/politicians/records?filter=office_type="senator"` - Filter by type
- ✅ `GET /pb/api/collections/politicians/records?filter=office_type="representative"` - Filter reps

### File Serving Issues
- ❌ `GET /pb/api/files/pbc_3830222512/{record_id}/{filename}` - Returns 404 through nginx
- ✅ `GET http://127.0.0.1:8091/api/files/...` - Works on localhost

---

## Recent Changes Made

1. **Fixed Representatives Filter** - Updated to check both `office_type` and `current_position`
2. **Imported 431 Representatives** - From Wikipedia using `importRepresentativesFromWikipedia.ts`
3. **Updated office_type Field** - Set `office_type='representative'` for all U.S. Representatives
4. **Fixed Deprecation Warnings** - Changed `pb.files.getUrl()` to `pb.files.getURL()`
5. **Added Favicon** - Created and deployed favicon.svg

---

## Files & Scripts Available

### Import Scripts
- `server/src/scripts/importRepresentativesFromWikipedia.ts` - ✅ Just used successfully
- `scripts/import_politicians_simple.js` - Import from JSON
- `scripts/update_office_type.js` - Update office_type based on current_position

### Portrait Scripts
- `scripts/scrape_portraits.js` - Scrape portraits from Wikipedia (deleted but may exist on VPS)
- `scripts/upload_portraits.js` - Upload portraits to PocketBase (deleted but may exist on VPS)

### Other Scripts
- `scripts/fix_politicians_access.sh` - Fix public access rules
- `scripts/verify_pb_politicians.sh` - Verify API access

---

## What's Missing / Needs Analysis

### Data Completeness
1. **Photos:** 638+ politicians missing photos (only ~20 have them)
2. **Social Media Links:** Unknown how many are missing
3. **Biographical Data:** Unknown completeness
4. **District Information:** Representatives may be missing district numbers
5. **Official Websites:** Unknown completeness

### Functionality
1. **Image Serving:** Nginx config needs fix for file serving
2. **Data Enrichment:** Need scripts to populate missing fields
3. **Portrait Scraping:** System exists but incomplete
4. **Social Media Scraping:** May need implementation

### Code Quality
1. **Error Handling:** May need improvement
2. **Loading States:** May need better UX
3. **Data Validation:** May need checks for missing required fields

---

## Questions for ChatGPT

1. **What data fields are most critical but currently missing?**
2. **What's the best approach to enrich 658 politician records with missing data?**
3. **How can we efficiently scrape/import photos for 600+ politicians?**
4. **What social media links are most important to collect?**
5. **How should we handle rate limiting when scraping external APIs?**
6. **What data validation should be in place?**
7. **What's the priority order for data enrichment tasks?**

---

## System Architecture

### Frontend
- **Location:** `/var/www/socialpolitician-app/web/`
- **Build Output:** `/var/www/socialpolitician-app/web/dist/`
- **Framework:** React + TypeScript + Vite
- **Routing:** React Router
- **State:** React hooks (useState, useEffect)

### Backend
- **Location:** `/var/www/socialpolitician-app/pocketbase/`
- **Database:** SQLite at `/var/www/socialpolitician-app/pocketbase/pb_data/data.db`
- **Storage:** `/var/www/socialpolitician-app/pocketbase/pb_data/storage/`
- **Service:** systemd service `socialpolitician-app-pocketbase.service`
- **Port:** 8091 (localhost only)

### Proxy
- **Nginx:** Reverse proxy on port 443
- **Config:** `/etc/nginx/sites-available/app.socialpolitician.com.conf`
- **Routes:** 
  - `/pb/` → `http://127.0.0.1:8091/`
  - `/api/` → `http://127.0.0.1:3001/` (if Node API exists)
  - `/` → SPA fallback

---

## Environment Details

- **OS:** Ubuntu 24.04.2 LTS
- **Node.js:** v20.20.0
- **PocketBase:** Latest (v0.35.1+)
- **Nginx:** 1.24.0
- **VPS IP:** 69.169.103.23
- **Domain:** app.socialpolitician.com

---

## Next Steps Needed

1. **Fix Nginx File Serving** - Update config to properly proxy file requests
2. **Enrich Representative Data** - Add districts, social links, bios
3. **Scrape/Upload Photos** - Get portraits for 600+ politicians
4. **Data Validation** - Ensure required fields are populated
5. **Social Media Links** - Scrape or manually add social profiles
6. **Biographical Data** - Add summaries and knowledge bases

---

**Generated:** $(date)  
**Purpose:** Provide ChatGPT with complete system context to identify missing pieces and suggest improvements
