# Deploy Filter Fixes - VPS Instructions

## Problem
Production is serving old JavaScript bundle with negated contains filters that cause 400 errors.

## Solution
All code is fixed and pushed to git. The VPS needs to pull and rebuild.

## Steps to Deploy

```bash
# SSH to your VPS
ssh your-vps

# Navigate to app directory
cd /var/www/socialpolitician-app

# Pull latest code
git pull origin main

# Verify you're on the latest commit
git log --oneline -1
# Should show: 86c38e6 Remove negated contains from PocketBase filters

# Rebuild frontend
npm run build

# Verify build succeeded
ls -lh web/dist/assets/
# Should show new bundle files (NOT index-D4T5Y6K3.js)

# Restart services
sudo systemctl reload nginx

# Clear Nginx cache
sudo rm -rf /var/cache/nginx/*

# Verify the new bundle
grep -o "office_type=\"senator\"" web/dist/assets/*.js | head -1
# Should show: office_type="senator" (without negated contains)
```

## Expected Result

After rebuild, the new bundle should:
- ✅ Use simple filters: `office_type="senator"` (no negated contains)
- ✅ Filter Previous/Former on client-side
- ✅ No more 400 errors

## Browser Cache

After deployment, users need to hard refresh:
- **Chrome/Edge**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- **Firefox**: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)

## Verification

Check browser console - should see:
```
🔍 PB filter: (office_type="senator" || current_position~"U.S. Senator")
```

NOT:
```
❌ (office_type="senator" || current_position~"U.S. Senator") && !(current_position~"Previous")
```
