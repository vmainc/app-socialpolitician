# Deploy Representatives Filter Fix

## Issue
Production build still has old filter syntax causing 400 errors:
```
filter=office_type="representative" && current_position!~"Previous" && current_position!~"Former"
```

## Solution
The source code is fixed, but production needs a fresh build.

## Deployment Steps

### 1. SSH into VPS
```bash
ssh your-vps-user@your-vps-ip
```

### 2. Navigate to app directory
```bash
cd /var/www/socialpolitician-app
```

### 3. Pull latest code
```bash
git pull origin main
```

### 4. Clean build (IMPORTANT - removes old cached files)
```bash
# Remove old build
rm -rf web/dist

# Install dependencies (in case package.json changed)
npm install

# Build with clean cache
npm run build
```

### 5. Verify build succeeded
```bash
# Check that dist folder exists and has new files
ls -la web/dist/assets/

# The main JS file should have a NEW hash (not uLF8dDDX)
# Example: index-ABC123XY.js (different hash = new build)
```

### 6. Reload Nginx
```bash
sudo nginx -t  # Test config first
sudo systemctl reload nginx
```

### 7. Clear browser cache
- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or open in incognito/private window

## Verification

After deployment, check browser console. You should see:
- ✅ Filter: `(office_type="representative" || chamber="House")`
- ✅ No 400 errors
- ✅ Representatives page loads with politicians

## If Still Not Working

1. **Check build timestamp:**
   ```bash
   ls -l web/dist/assets/index-*.js
   ```
   Should show recent timestamp (just now)

2. **Check Nginx is serving new files:**
   ```bash
   curl -I https://app.socialpolitician.com/assets/index-*.js
   ```
   Should return 200 with recent Last-Modified date

3. **Check for build errors:**
   ```bash
   npm run build 2>&1 | tail -20
   ```
   Should complete without errors

4. **Force Nginx to reload:**
   ```bash
   sudo systemctl restart nginx
   ```

## Current Source Code Status

✅ `web/src/pages/PoliticiansDirectory.tsx` - Uses simplified filter
✅ `web/src/hooks/usePoliticianFilters.ts` - No `!~` operators
✅ All `current_position!~` references removed

The issue is **only** that production build is outdated.
