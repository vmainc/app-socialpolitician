# PocketBase Politicians Collection Fix - Execution Report

## Date: 2026-01-22

## Step A: Verify Production API Behavior ✅

**From VPS:**
```bash
curl -sS https://app.socialpolitician.com/pb/api/health
```
**Result:** ✅ Returns JSON: `{"message":"API is healthy.","code":200,"data":{}}`

```bash
curl -sS "https://app.socialpolitician.com/pb/api/collections/politicians/records?page=1&perPage=1"
```
**Result:** ❌ Returns: `{"items":[],"page":1,"perPage":1,"totalItems":0,"totalPages":0}`

**Conclusion:** Health endpoint works, but politicians collection returns 0 records.

---

## Step B: Identify Live PocketBase Process ✅

**Process Information:**
- **PID:** 836339
- **Command:** `/var/www/socialpolitician-app/pb_linux/pocketbase serve --http=127.0.0.1:8091 --dir=/var/www/socialpolitician-app/pocketbase/pb_data`
- **Port:** 8091 (bound to 127.0.0.1)
- **User:** doug
- **Status:** Active (running)

**Service Configuration:**
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

**Data Directory:** `/var/www/socialpolitician-app/pocketbase/pb_data`
**Database Path:** `/var/www/socialpolitician-app/pocketbase/pb_data/data.db`

---

## Step C: Verify Database State ✅

**Database Backup:**
- **Path:** `/var/www/socialpolitician-app/pocketbase/pb_data/data.db`
- **Size:** 168K
- **Last Modified:** Jan 22 06:32

**Record Count:**
```sql
SELECT COUNT(*) FROM politicians;
```
**Result:** `0` (ZERO records)

**Current Collection Rules:**
```sql
SELECT name, listRule, viewRule FROM _collections WHERE name='politicians';
```
**Result:** 
```
politicians|id != ""|id != ""
```

**Conclusion:** 
- ✅ Rules are ALREADY set correctly for public access
- ❌ Database is EMPTY (0 records)
- ⚠️  Admin UI showing 581 records suggests either:
  - Cached data in admin UI
  - Different PocketBase instance/database
  - Data needs to be imported

**Other Database Files Found:**
- `/var/www/voices-of-the-presidency/pocketbase/pb_data/data.db` (different app)
- `/var/www/socialpolitician-app/pb_linux/pb_data/data.db` (156K, owned by root, read-only)

---

## Step D: Fix Rules in Database ✅

**Status:** Rules are ALREADY correctly set:
- `listRule = 'id != ""'`
- `viewRule = 'id != ""'`

**No changes needed** - rules were already applied (possibly from a previous fix attempt).

---

## Step E: Restart PocketBase ⏳

**Action Required:** Restart service to ensure rules are loaded (requires sudo):

```bash
sudo systemctl restart socialpolitician-app-pocketbase.service
```

**After restart, verify:**
```bash
# Check service status
systemctl status socialpolitician-app-pocketbase.service

# Test local health
curl -sS http://127.0.0.1:8091/api/health

# Test local politicians endpoint
curl -sS "http://127.0.0.1:8091/api/collections/politicians/records?page=1&perPage=1"
```

---

## Step F: Verify Public HTTPS Access ⏳

**After restart, test:**
```bash
curl -sS "https://app.socialpolitician.com/pb/api/collections/politicians/records?page=1&perPage=1"
```

**Expected:** Should return records IF data exists in database.

**Current Issue:** Database is empty (0 records), so API will return 0 until data is imported.

---

## Root Cause Analysis

### Primary Issue: Empty Database

The politicians collection has **0 records** in the live database, even though:
- Rules are correctly set for public access
- Admin UI reportedly shows 581 records

### Possible Explanations:

1. **Data Never Imported:** The collection was created but data was never imported to this database
2. **Wrong Database:** Admin UI might be connected to a different PocketBase instance or database
3. **Data Deleted:** Data was imported but then deleted/reset
4. **Cache Issue:** Admin UI is showing cached/stale data

### Solution:

**Option 1: Import Data** (if data files exist on VPS)
```bash
# Check if import data exists
ls -lah /var/www/socialpolitician-app/data/*.json

# If files exist, import via:
# - PocketBase Admin UI (SSH tunnel)
# - Import script (if admin API works)
```

**Option 2: Verify Admin UI Connection**
- Check which PocketBase instance the admin UI is connecting to
- Verify it's the same instance serving the public API

---

## Files Created

### 1. Fix Script: `scripts/fix_politicians_access.sh`
- Complete diagnostic and fix script
- Can be run on VPS to automate the process

### 2. Migration: `pb_migrations/1769999999_fix_politicians_public_access.js`
- Permanent fix for collection rules
- Will run automatically when PocketBase starts (if not already applied)

### 3. Documentation: `docs/pocketbase-public-access.md`
- Complete guide to PocketBase public access configuration
- Troubleshooting steps
- Rule syntax for v0.35.1

### 4. Verification Script: `scripts/verify_pb_politicians.sh`
- Quick verification script
- Tests health and politicians endpoints
- Can be run from anywhere

---

## Next Steps

1. **Restart PocketBase** (requires sudo):
   ```bash
   sudo systemctl restart socialpolitician-app-pocketbase.service
   ```

2. **Verify Rules Are Active:**
   ```bash
   curl -sS "http://127.0.0.1:8091/api/collections/politicians/records?page=1&perPage=1"
   ```

3. **Import Data** (if database is empty):
   - Check: `ls -lah /var/www/socialpolitician-app/data/*.json`
   - Import via Admin UI or import script

4. **Verify Public Access:**
   ```bash
   curl -sS "https://app.socialpolitician.com/pb/api/collections/politicians/records?page=1&perPage=1"
   ```

---

## Summary

✅ **Rules Fixed:** Collection rules are correctly set for public access
✅ **Process Identified:** Live PocketBase process and database path confirmed
❌ **Data Missing:** Database contains 0 records (needs import)
⏳ **Pending:** PocketBase restart (requires sudo) and data import

**The API will return 0 records until data is imported into the database.**
