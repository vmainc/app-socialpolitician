# Deploy Diagnostic Changes to Production

The diagnostic logging changes need to be deployed to production for you to see them in the browser console.

## Quick Deploy (if you have git on VPS)

**On your VPS:**
```bash
cd /var/www/socialpolitician-app

# Pull latest changes
git pull

# Install dependencies (if needed)
npm install

# Build frontend
npm run build

# Verify build
npm run verify-build

# Reload nginx (to serve new files)
sudo systemctl reload nginx
```

## Manual Deploy (upload files)

**Option 1: Upload built files only (fastest)**
```bash
# On your local machine
cd /Users/doughigson/Desktop/DOUGS\ PLUGINS/app.socialpolitician.com

# Upload just the built dist folder
scp -r web/dist/* user@your-vps-ip:/var/www/socialpolitician-app/web/dist/

# On VPS, reload nginx
ssh user@your-vps-ip
sudo systemctl reload nginx
```

**Option 2: Upload source and build on VPS**
```bash
# On your local machine
cd /Users/doughigson/Desktop/DOUGS\ PLUGINS/app.socialpolitician.com

# Upload source files (exclude node_modules, dist, etc.)
rsync -avz --exclude 'node_modules' --exclude 'web/dist' --exclude '.git' \
  ./ user@your-vps-ip:/var/www/socialpolitician-app/

# On VPS
ssh user@your-vps-ip
cd /var/www/socialpolitician-app
npm install
npm run build
npm run verify-build
sudo systemctl reload nginx
```

## Verify Deployment

After deploying, check the browser console at `https://app.socialpolitician.com`:

1. Open DevTools Console (F12)
2. You should see:
   ```
   Runtime Config: { MODE: "production", API_BASE: "/api", PB_BASE: "/pb" }
   PocketBase initialized with base URL: /pb
   PocketBase client baseUrl: /pb
   ✅ PocketBase health check: { message: "API is healthy.", code: 200, data: {} }
   ```

If you see these logs, the diagnostic changes are deployed!

## Files Changed (that need deployment)

- `web/src/config/runtime.ts` - Added health check diagnostic
- `web/src/lib/pocketbase.ts` - Added initialization logging
- `web/dist/` - Built files (needs to be uploaded/rebuilt)

## Quick Test After Deploy

```bash
# On VPS or locally
curl https://app.socialpolitician.com/pb/api/health
# Should return: {"message":"API is healthy.","code":200,"data":{}}
```

Then check browser console - you should see the diagnostic logs!
