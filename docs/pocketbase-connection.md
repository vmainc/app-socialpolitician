# PocketBase Connection Guide

This document describes how PocketBase connectivity works for `app.socialpolitician.com` and how to verify/fix it.

## Architecture Overview

```
Browser (HTTPS) → Nginx (443) → PocketBase (127.0.0.1:8091)
```

- **Production**: Browser uses same-origin proxy `/pb` (no CORS issues)
- **Development**: Vite dev server proxies `/pb` → `http://127.0.0.1:8091`

## Expected Endpoints

### Health Check
```
GET https://app.socialpolitician.com/pb/api/health
```
**Expected Response:**
```json
{"message":"API is healthy.","code":200,"data":{}}
```

### Politicians Collection
```
GET https://app.socialpolitician.com/pb/api/collections/politicians/records?page=1&perPage=1
```
**Expected Response:**
```json
{
  "items": [...],
  "page": 1,
  "perPage": 1,
  "totalItems": 581,
  "totalPages": 581
}
```

## Runtime Configuration

The app uses runtime configuration to determine the PocketBase base URL:

**File:** `web/src/config/runtime.ts`

```typescript
const isProd = import.meta.env.MODE === "production";
export const PB_BASE = isProd ? "/pb" : (import.meta.env.VITE_PB_BASE ?? "http://127.0.0.1:8091");
```

- **Production mode**: `PB_BASE = "/pb"` (relative URL, same-origin)
- **Development mode**: `PB_BASE = "http://127.0.0.1:8091"` (direct connection)

## Nginx Configuration

The nginx server block for `app.socialpolitician.com` must include a `/pb/` location block **BEFORE** the SPA fallback:

```nginx
server {
    listen 443 ssl http2;
    server_name app.socialpolitician.com;

    root /var/www/socialpolitician-app/web/dist;
    index index.html;

    # PocketBase API proxy - MUST come before SPA fallback
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

    # SPA fallback - MUST come after /pb/
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Critical Points

1. **Location Order**: `/pb/` must come **before** `/` (SPA fallback)
2. **Trailing Slash**: `location /pb/` with `proxy_pass .../` maps `/pb/api/...` → `/api/...`
3. **Proxy Headers**: `Host` and `X-Forwarded-Proto` are required for PocketBase to generate correct URLs

## PocketBase Service

PocketBase should run as a systemd service on port 8091:

**Service File:** `/etc/systemd/system/socialpolitician-app-pocketbase.service`

```ini
[Unit]
Description=PocketBase for app.socialpolitician.com
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/socialpolitician-app/pocketbase
ExecStart=/var/www/socialpolitician-app/pocketbase/pb serve --http=127.0.0.1:8091
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Commands:**
```bash
# Start service
sudo systemctl start socialpolitician-app-pocketbase.service

# Enable on boot
sudo systemctl enable socialpolitician-app-pocketbase.service

# Check status
sudo systemctl status socialpolitician-app-pocketbase.service

# View logs
sudo journalctl -u socialpolitician-app-pocketbase.service -f
```

## How to Test

### 1. Quick Test (from anywhere)
```bash
# Health check
curl https://app.socialpolitician.com/pb/api/health

# Politicians collection
curl "https://app.socialpolitician.com/pb/api/collections/politicians/records?page=1&perPage=1"
```

### 2. Comprehensive Verification (on VPS)
```bash
# Test PocketBase connectivity
./scripts/verify_pb.sh

# Test nginx routing
sudo ./scripts/verify_nginx_routes.sh
```

### 3. Browser Console Check
Open browser DevTools Console on `https://app.socialpolitician.com` and look for:
- `Runtime Config: { MODE: "production", API_BASE: "/api", PB_BASE: "/pb" }`
- `✅ PocketBase health check: { message: "API is healthy.", ... }`
- `PocketBase initialized with base URL: /pb`

If you see errors, check the Network tab to see the actual requests being made.

## Common Issues

### Issue: Browser gets HTML instead of JSON

**Symptom:** `curl https://app.socialpolitician.com/pb/api/health` returns `index.html`

**Cause:** Nginx location order is wrong - `/` (SPA fallback) is matching before `/pb/`

**Fix:** Ensure `/pb/` location block comes **before** `/` in nginx config, then:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Issue: CORS errors in browser

**Symptom:** Browser console shows CORS errors when accessing `/pb/...`

**Cause:** App is using absolute URL (e.g., `http://127.0.0.1:8091`) instead of relative `/pb`

**Fix:** 
1. Verify build is in production mode: `npm run build` (not `npm run dev`)
2. Check `web/src/config/runtime.ts` - `PB_BASE` should be `"/pb"` in production
3. Verify no localhost URLs in build: `grep -r "localhost\|127.0.0.1" web/dist`

### Issue: 502 Bad Gateway

**Symptom:** `curl https://app.socialpolitician.com/pb/api/health` returns 502

**Cause:** PocketBase is not running on port 8091

**Fix:**
```bash
# Check if PocketBase is running
curl http://127.0.0.1:8091/api/health

# If not running, start the service
sudo systemctl start socialpolitician-app-pocketbase.service

# Check service status
sudo systemctl status socialpolitician-app-pocketbase.service
```

### Issue: Empty collection (0 records)

**Symptom:** Endpoint works but returns `{"items":[],"totalItems":0}`

**Cause:** Data hasn't been imported yet

**Fix:** Import politicians data (see `IMPORT_POLITICIANS.md`)

### Issue: Mixed content warnings

**Symptom:** Browser console shows "Mixed Content" errors

**Cause:** HTTPS page trying to load HTTP resources

**Fix:** Ensure `PB_BASE` is relative (`"/pb"`) not absolute (`"http://..."`) in production

## Verification Checklist

- [ ] `curl http://127.0.0.1:8091/api/health` returns JSON (PocketBase running locally)
- [ ] `curl https://app.socialpolitician.com/pb/api/health` returns JSON (nginx proxy works)
- [ ] `curl https://app.socialpolitician.com/pb/api/collections/politicians/records?page=1&perPage=1` returns JSON (collection accessible)
- [ ] Browser console shows `PB_BASE: "/pb"` (not localhost)
- [ ] Browser console shows successful health check
- [ ] No CORS errors in browser console
- [ ] No mixed content warnings
- [ ] Politicians collection has records (if data imported)

## Related Files

- `web/src/config/runtime.ts` - Runtime configuration
- `web/src/lib/pocketbase.ts` - PocketBase client initialization
- `vite.config.ts` - Dev server proxy configuration
- `scripts/verify_pb.sh` - Connectivity verification script
- `scripts/verify_nginx_routes.sh` - Nginx routing verification script
- `/etc/nginx/sites-available/app.socialpolitician.com.conf` - Nginx config (on VPS)
- `/etc/systemd/system/socialpolitician-app-pocketbase.service` - PocketBase service (on VPS)

## Notes

- PocketBase SDK handles relative URLs correctly - no need for full URLs in production
- The `/pb/` prefix is stripped by nginx (`proxy_pass .../`) so PocketBase receives `/api/...`
- Both `app.socialpolitician.com` and `presidents.socialpolitician.com` can run on the same server using different ports (8091 vs 8090)
