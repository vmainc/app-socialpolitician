# Clear Cache Instructions

## Browser Cache Clearing

To see updated portraits in your browser, clear the cache:

### Method 1: Hard Refresh (Recommended)
- **Chrome/Edge**: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- **Safari**: `Cmd+Option+R`

### Method 2: Clear Site Data
1. Open DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Clear site data** or **Clear storage**
4. Check "Cached images and files"
5. Click **Clear**

### Method 3: Disable Cache (DevTools)
1. Open DevTools (F12)
2. Go to **Network** tab
3. Check **"Disable cache"** checkbox
4. Keep DevTools open while browsing

## Server-Side Cache

### Nginx Cache
Nginx is already configured with no-cache headers for `/pb/`:
```nginx
add_header Cache-Control "no-store, no-cache, must-revalidate";
```

To reload nginx (if needed):
```bash
sudo systemctl reload nginx
```

### PocketBase File Cache
PocketBase file URLs include versioning, but you can force refresh by:
- Adding timestamp query param (already implemented in code)
- Restarting PocketBase service

## Code Changes Made

Added cache-busting timestamps to image URLs:
- `PoliticiansDirectory.tsx`: `${pb.files.getUrl(p, p.photo)}?t=${Date.now()}`
- `PoliticianProfile.tsx`: `${pb.files.getUrl(politician, politician.photo)}?t=${Date.now()}`

This ensures images are always fetched fresh on page load.

## Verify Cache is Cleared

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Check **"Disable cache"**
4. Reload page (F5)
5. Look for image requests - they should have `?t=` timestamp parameter
6. Check response headers - should show `Cache-Control: no-store, no-cache, must-revalidate`
