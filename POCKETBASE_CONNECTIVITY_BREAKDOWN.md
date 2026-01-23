# PocketBase Connectivity Issue - Complete Breakdown

## Problem Summary

The app `app.socialpolitician.com` cannot fetch politician records from PocketBase, even though:
- ✅ SSL/HTTPS is working
- ✅ Nginx is correctly proxying `/pb/` to PocketBase
- ✅ PocketBase is running on port 8091
- ✅ Health endpoint works: `https://app.socialpolitician.com/pb/api/health` returns JSON
- ✅ Collection has 581 records (verified via admin UI)
- ❌ API returns 0 records: `{"items":[],"totalItems":0}`

## Root Cause

**PocketBase collection access rules were blocking public access.**

The `politicians` collection had:
- `listRule: ""` (empty string = admin-only, no public access)
- `viewRule: ""` (empty string = admin-only, no public access)

In PocketBase:
- Empty string (`""`) = **No public access** (admin/superuser only)
- `"true"` = Public access (but this syntax doesn't work in PocketBase v0.35.1)
- `"id != \"\""` = Public access (works - always evaluates to true)
- `"@request.auth.id = \"\" || @request.auth.id != \"\""` = Public access (works - always true)

## Architecture

```
Browser (HTTPS) 
  → Nginx (443) 
    → /pb/ location block 
      → PocketBase (127.0.0.1:8091)
```

**Production Setup:**
- Domain: `app.socialpolitician.com`
- VPS IP: `69.169.103.23`
- Nginx config: `/etc/nginx/sites-available/app.socialpolitician.com.conf`
- PocketBase port: `8091`
- PocketBase data: `/var/www/socialpolitician-app/pocketbase/pb_data/`
- PocketBase binary: `/var/www/socialpolitician-app/pb_linux/pocketbase`
- Service: `socialpolitician-app-pocketbase.service`

**App Configuration:**
- Production mode: `PB_BASE = "/pb"` (relative URL, same-origin)
- Dev mode: `PB_BASE = "http://127.0.0.1:8091"` (direct connection)
- Vite dev proxy: `/pb` → `http://127.0.0.1:8091`

## What We Tried (What Didn't Work)

1. **Admin UI Rule Updates** - Rules appeared to save but didn't take effect
   - Tried: `true` (invalid syntax error)
   - Tried: `id != ""` (saved but didn't work)
   - Tried: `@request.auth.id = "" || @request.auth.id != ""` (saved but didn't work)
   - Issue: UI might not be saving properly, or PocketBase needs restart

2. **Admin API Script** - Authentication failed
   - Script: `server/src/scripts/updatePoliticiansCollectionRules.ts`
   - Error: `Failed to authenticate` (status 400)
   - Possible causes: Admin API disabled, wrong credentials, or API auth method different

3. **Migration Files** - Created but may not have run
   - Created: `1769085000_set_politicians_public_rules.js`
   - Issue: Migration might not execute if collection already exists

## What Worked

**Direct Database Update:**
```bash
sqlite3 /var/www/socialpolitician-app/pocketbase/pb_data/data.db \
  "UPDATE _collections SET listRule = 'id != \"\"', viewRule = 'id != \"\"' WHERE name = 'politicians';"
```

**Verification:**
```bash
sqlite3 /var/www/socialpolitician-app/pocketbase/pb_data/data.db \
  "SELECT name, listRule, viewRule FROM _collections WHERE name = 'politicians';"
# Returns: politicians|id != ""|id != ""
```

**After database update, restart PocketBase:**
```bash
sudo systemctl restart socialpolitician-app-pocketbase.service
```

## Current State

✅ **Rules set in database:** `id != ""` for both listRule and viewRule
✅ **Data exists:** 581 records in collection (verified via admin UI)
✅ **Nginx routing:** Correctly proxying `/pb/` to PocketBase
✅ **Health endpoint:** Working (`/pb/api/health` returns JSON)
⏳ **Pending:** PocketBase restart to reload rules from database

## Key Files & Locations

**App Code:**
- Runtime config: `web/src/config/runtime.ts`
- PocketBase client: `web/src/lib/pocketbase.ts`
- Politicians directory: `web/src/pages/PoliticiansDirectory.tsx`
- Vite config: `vite.config.ts`

**Server:**
- PocketBase data: `/var/www/socialpolitician-app/pocketbase/pb_data/`
- PocketBase binary: `/var/www/socialpolitician-app/pb_linux/pocketbase`
- Service file: `/etc/systemd/system/socialpolitician-app-pocketbase.service`
- Nginx config: `/etc/nginx/sites-available/app.socialpolitician.com.conf`
- Import data: `/var/www/socialpolitician-app/data/*.json`

**Database:**
- SQLite database: `/var/www/socialpolitician-app/pocketbase/pb_data/data.db`
- Collection ID: `pbc_3830222512`
- Collection name: `politicians`

## Nginx Configuration (Working)

```nginx
location /pb/ {
    proxy_pass http://127.0.0.1:8091/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    add_header Cache-Control "no-store, no-cache, must-revalidate";
}
```

**Critical:** `/pb/` location block MUST come **before** the SPA fallback (`location /`)

## PocketBase Service Configuration

```ini
[Unit]
Description=PocketBase for app.socialpolitician.com (V2)
After=network.target

[Service]
Type=simple
User=doug
WorkingDirectory=/var/www/socialpolitician-app
ExecStart=/var/www/socialpolitician-app/pb_linux/pocketbase serve --http=127.0.0.1:8091 --dir=/var/www/socialpolitician-app/pocketbase/pb_data
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Commands That Work

**Check rules in database:**
```bash
sqlite3 /var/www/socialpolitician-app/pocketbase/pb_data/data.db \
  "SELECT name, listRule, viewRule FROM _collections WHERE name = 'politicians';"
```

**Update rules directly:**
```bash
sqlite3 /var/www/socialpolitician-app/pocketbase/pb_data/data.db \
  "UPDATE _collections SET listRule = 'id != \"\"', viewRule = 'id != \"\"' WHERE name = 'politicians';"
```

**Restart PocketBase:**
```bash
sudo systemctl restart socialpolitician-app-pocketbase.service
```

**Test API:**
```bash
curl 'http://127.0.0.1:8091/api/collections/politicians/records?page=1&perPage=1'
```

## What Needs to Happen

1. **Restart PocketBase** to reload rules from database
2. **Verify API returns records** (should show 581 totalItems)
3. **Refresh browser** - cards should appear

## Diagnostic Logging Added

**Runtime config (`web/src/config/runtime.ts`):**
- Logs `PB_BASE` on startup
- Auto-tests health endpoint in production
- Shows diagnostic output in console

**PocketBase client (`web/src/lib/pocketbase.ts`):**
- Logs initialization with base URL
- Logs actual PocketBase client baseUrl

**PoliticiansDirectory (`web/src/pages/PoliticiansDirectory.tsx`):**
- Logs loading attempts
- Tests unfiltered query to verify rules
- Shows detailed error information

## Browser Console Output (Expected After Fix)

```
Runtime Config: {MODE: 'production', API_BASE: '/api', PB_BASE: '/pb'}
PocketBase initialized with base URL: /pb
PocketBase client baseUrl: /pb
✅ PocketBase health check: {message: 'API is healthy.', code: 200, data: {}}
🔍 Loading senators...
📊 Total accessible records (no filter): 581
✅ Loaded 100 senators
```

## Important Notes

1. **PocketBase version:** v0.35.1 (based on admin UI footer)
2. **Rule syntax:** `"true"` doesn't work - must use filter expressions
3. **Database updates:** Direct SQLite updates work, but require PocketBase restart
4. **Admin API:** Authentication failing - may be disabled or using different method
5. **Admin UI:** Can view/edit rules but may not save properly
6. **Migrations:** May not run if collection already exists

## Verification Checklist

- [ ] Rules set in database: `id != ""`
- [ ] PocketBase restarted after rule update
- [ ] API returns records: `curl http://127.0.0.1:8091/api/collections/politicians/records?page=1&perPage=1`
- [ ] Browser console shows: `📊 Total accessible records (no filter): 581`
- [ ] Cards appear on `/senators`, `/representatives`, `/governors` pages

## Next Steps (If Still Not Working)

1. Check PocketBase logs: `sudo journalctl -u socialpolitician-app-pocketbase.service -n 50`
2. Verify rules persisted: Check database again
3. Try alternative rule syntax: `@request.auth.id = "" || @request.auth.id != ""`
4. Check for field-level permissions blocking access
5. Verify collection name matches exactly: `politicians` (case-sensitive)
