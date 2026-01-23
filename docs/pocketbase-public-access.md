# PocketBase Public Access Configuration

## Overview

This document explains how to configure PocketBase collection access rules for public read access on `app.socialpolitician.com`.

## Rule Syntax for PocketBase v0.35.1

**Important:** PocketBase v0.35.1 does NOT support `"true"` as a rule expression. You must use filter expressions that always evaluate to true.

### Valid Public Access Rules

```javascript
// Option 1: Always-true filter (recommended)
listRule = 'id != ""'
viewRule = 'id != ""'

// Option 2: Auth check that's always true
listRule = '@request.auth.id = "" || @request.auth.id != ""'
viewRule = '@request.auth.id = "" || @request.auth.id != ""'
```

### Invalid Rules

```javascript
// ❌ This does NOT work in v0.35.1
listRule = "true"
viewRule = "true"

// ❌ Empty string = admin-only (no public access)
listRule = ""
viewRule = ""
```

## Quick Validation

### From VPS (localhost)
```bash
# Health check
curl -sS http://127.0.0.1:8091/api/health

# Politicians collection (should return totalItems > 0)
curl -sS "http://127.0.0.1:8091/api/collections/politicians/records?page=1&perPage=1"
```

### From Public Internet (HTTPS)
```bash
# Health check
curl -sS https://app.socialpolitician.com/pb/api/health

# Politicians collection (should return totalItems > 0)
curl -sS "https://app.socialpolitician.com/pb/api/collections/politicians/records?page=1&perPage=1"
```

### Expected Response
```json
{
  "page": 1,
  "perPage": 1,
  "totalItems": 581,
  "totalPages": 581,
  "items": [...]
}
```

## Live Database Location

**Production Database Path:**
```
/var/www/socialpolitician-app/pocketbase/pb_data/data.db
```

**Service Configuration:**
- Service: `socialpolitician-app-pocketbase.service`
- Binary: `/var/www/socialpolitician-app/pb_linux/pocketbase`
- Data Directory: `/var/www/socialpolitician-app/pocketbase/pb_data`
- Port: `8091` (localhost only)

## Manual Rule Update (Emergency Fix)

If rules need to be updated directly in the database:

```bash
# 1. Backup database
cp /var/www/socialpolitician-app/pocketbase/pb_data/data.db \
   /var/www/socialpolitician-app/pocketbase/pb_data/data.db.bak.$(date +%F-%H%M%S)

# 2. Update rules
sqlite3 /var/www/socialpolitician-app/pocketbase/pb_data/data.db \
  "UPDATE _collections SET listRule='id != \"\"', viewRule='id != \"\"' WHERE name='politicians';"

# 3. Verify
sqlite3 /var/www/socialpolitician-app/pocketbase/pb_data/data.db \
  "SELECT name, listRule, viewRule FROM _collections WHERE name='politicians';"

# 4. Restart PocketBase
sudo systemctl restart socialpolitician-app-pocketbase.service

# 5. Test
curl -sS "http://127.0.0.1:8091/api/collections/politicians/records?page=1&perPage=1"
```

## Troubleshooting

### Issue: totalItems is 0 but admin UI shows records

**Possible causes:**
1. Wrong database file - PocketBase is using a different data.db
2. Rules not applied - check database directly
3. PocketBase not restarted after rule update
4. Collection name mismatch (case-sensitive)

**Fix:**
1. Identify the live PocketBase process: `ps aux | grep pocketbase`
2. Check service file for `--dir` flag: `systemctl cat socialpolitician-app-pocketbase.service`
3. Verify database path matches service configuration
4. Check rules in database: `sqlite3 <db_path> "SELECT name, listRule, viewRule FROM _collections WHERE name='politicians';"`
5. Restart service: `sudo systemctl restart socialpolitician-app-pocketbase.service`

### Issue: Response is HTML instead of JSON

**Cause:** Nginx proxy is broken - `/pb/` location block is not working

**Fix:**
1. Check nginx config: `/etc/nginx/sites-available/app.socialpolitician.com.conf`
2. Ensure `/pb/` location block comes BEFORE `location /` (SPA fallback)
3. Reload nginx: `sudo nginx -t && sudo systemctl reload nginx`

## Migration Files

Migrations are stored in:
- Local: `pb_migrations/`
- Production: `/var/www/socialpolitician-app/pocketbase/pb_migrations/`

Migrations run automatically when PocketBase starts if:
- The migration file is in the migrations directory
- The migration hasn't been applied yet (tracked in database)

## Related Files

- Service file: `/etc/systemd/system/socialpolitician-app-pocketbase.service`
- Nginx config: `/etc/nginx/sites-available/app.socialpolitician.com.conf`
- Verification script: `scripts/verify_pb_politicians.sh`
