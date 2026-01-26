# 🚨 URGENT: Deploy Representatives Fix

## The Problem
Production is still using OLD code with filter:
```
office_type="representative" && current_position!~"Previous" && current_position!~"Former"
```

This causes 400 errors because `!~` operators don't work in PocketBase.

## The Solution
Source code is FIXED. You just need to rebuild and deploy.

## Step-by-Step Deployment

### 1. SSH into your VPS
```bash
ssh your-user@your-vps-ip
```

### 2. Navigate to app directory
```bash
cd /var/www/socialpolitician-app
```

### 3. Check current build file
```bash
ls -lh web/dist/assets/index-*.js
```
**Note the filename** - it's probably `index-uLF8dDDX.js` (the OLD one)

### 4. Pull latest code
```bash
git status
git pull origin main
```

### 5. DELETE old build (CRITICAL!)
```bash
rm -rf web/dist
echo "✅ Old build deleted"
```

### 6. Install dependencies
```bash
npm install
```

### 7. Build frontend
```bash
npm run build
```

### 8. Verify new build was created
```bash
ls -lh web/dist/assets/index-*.js
```
**The filename should be DIFFERENT now** (not `uLF8dDDX`)

### 9. Verify no localhost in build
```bash
npm run verify-build
```
Should say: `✓ OK: No localhost found in build`

### 10. Reload Nginx
```bash
sudo systemctl reload nginx
```

### 11. Clear browser cache
- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or open in incognito/private window

## Verification

After deployment, check browser console. You should see:

✅ **NEW filter:**
```
🔍 Using filter: (office_type="representative" || chamber="Representative")
```

❌ **NOT the old filter:**
```
filter=office_type="representative" && current_position!~"Previous" && current_position!~"Former"
```

## If It's Still Not Working

### Check 1: Is the build file actually new?
```bash
cd /var/www/socialpolitician-app
ls -lh web/dist/assets/index-*.js
stat web/dist/assets/index-*.js
```
The timestamp should be **just now** (when you ran `npm run build`)

### Check 2: Is Nginx serving the new file?
```bash
curl -I https://app.socialpolitician.com/assets/index-*.js | grep -i "last-modified"
```
Should show recent timestamp

### Check 3: Check Nginx config
```bash
sudo nginx -t
sudo cat /etc/nginx/sites-available/socialpolitician-app
```
Make sure it's pointing to `/var/www/socialpolitician-app/web/dist`

### Check 4: Force Nginx restart
```bash
sudo systemctl restart nginx
```

### Check 5: Check for build errors
```bash
cd /var/www/socialpolitician-app
npm run build 2>&1 | tail -30
```
Should complete without errors

## Quick One-Liner (if you're confident)

```bash
cd /var/www/socialpolitician-app && \
git pull origin main && \
rm -rf web/dist && \
npm install && \
npm run build && \
npm run verify-build && \
sudo systemctl reload nginx && \
echo "✅ Deployment complete! Clear browser cache and test."
```

## What Should Happen

After successful deployment:
1. ✅ Representatives page loads without 400 errors
2. ✅ Browser console shows new filter (no `!~` operators)
3. ✅ Representatives appear on the page
4. ✅ Senators page works
5. ✅ Governors page works (already working)

## Current Source Code Status

✅ `web/src/pages/PoliticiansDirectory.tsx` - Fixed
✅ `web/src/hooks/usePoliticianFilters.ts` - Fixed  
✅ `web/src/lib/pb.ts` - Fixed
✅ `web/src/types/politician.ts` - Fixed

**All source code is correct. The issue is ONLY that production build is outdated.**
