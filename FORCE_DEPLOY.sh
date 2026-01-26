#!/bin/bash
# Force complete clean rebuild and deployment
# Run this on your VPS: cd /var/www/socialpolitician-app && bash FORCE_DEPLOY.sh

set -e

echo "🚀 FORCE DEPLOY - Complete Clean Rebuild"
echo "=========================================="
echo ""

APP_DIR="/var/www/socialpolitician-app"
cd "$APP_DIR" || { echo "❌ Error: Could not cd to $APP_DIR"; exit 1; }

# Step 1: Force pull latest changes (discard local changes)
echo "📥 Force pulling latest changes from git..."
git fetch origin main
git reset --hard origin/main
echo "   ✅ Code updated"

# Step 2: Clean everything
echo "🧹 Cleaning everything..."
rm -rf node_modules
rm -rf web/dist
rm -rf web/node_modules 2>/dev/null || true
echo "   ✅ Cleaned"

# Step 3: Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "   ✅ Dependencies installed"

# Step 4: Build frontend (this will automatically clean dist first)
echo "🔨 Building frontend..."
npm run build
echo "   ✅ Build complete"

# Step 5: Verify build
echo "🔍 Verifying build..."
if grep -r "localhost\|127.0.0.1" web/dist 2>/dev/null; then
  echo "❌ ERROR: Found localhost in build!"
  exit 1
fi
if grep -r "current_position!~" web/dist 2>/dev/null; then
  echo "❌ ERROR: Found old filter syntax in build!"
  exit 1
fi
echo "✅ Build verification passed"

# Step 6: Check bundle hash
echo "📦 Checking bundle files..."
BUNDLE_FILE=$(find web/dist -name "index-*.js" | head -1)
if [ -n "$BUNDLE_FILE" ]; then
  BUNDLE_HASH=$(basename "$BUNDLE_FILE" | sed 's/index-\(.*\)\.js/\1/')
  echo "   Bundle hash: $BUNDLE_HASH"
  if [ "$BUNDLE_HASH" = "uLF8dDDX" ]; then
    echo "   ⚠️  WARNING: Bundle hash is still the old one!"
    echo "   This means the build didn't update properly."
  else
    echo "   ✅ New bundle hash (not uLF8dDDX)"
  fi
fi

# Step 7: Clear Nginx cache
echo "🗑️  Clearing Nginx cache..."
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true
echo "   ✅ Cache cleared"

# Step 8: Restart services
echo "🔄 Restarting services..."
sudo systemctl restart socialpolitician-app-pocketbase.service 2>/dev/null || echo "⚠️  PocketBase service not found"
sudo systemctl restart socialpolitician-app-api.service 2>/dev/null || echo "⚠️  API service not found"
sudo systemctl reload nginx || echo "⚠️  Nginx reload failed"
echo "   ✅ Services restarted"

# Step 9: Health check
echo "🏥 Health check..."
sleep 3
if curl -f http://127.0.0.1:8091/api/health >/dev/null 2>&1; then
  echo "   ✅ PocketBase OK"
else
  echo "   ⚠️  PocketBase not responding"
fi

echo ""
echo "✅ FORCE DEPLOYMENT COMPLETE!"
echo "=========================================="
echo "🌐 Visit: https://app.socialpolitician.com"
echo ""
echo "⚠️  IMPORTANT: Clear your browser cache or do a hard refresh:"
echo "   - Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)"
echo "   - Firefox: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)"
echo ""
echo "📊 After clearing cache, check:"
echo "   1. Browser console should show new bundle hash (not uLF8dDDX)"
echo "   2. Filter should be: (office_type=\"senator\" || chamber=\"Senator\")"
echo "   3. No 400 errors"
echo ""
