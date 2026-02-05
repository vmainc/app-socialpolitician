#!/bin/bash
# Deploy latest changes to VPS
# Run this on your VPS: cd /var/www/socialpolitician-app && bash deploy-to-vps.sh

set -e

echo "🚀 Deploying to VPS..."
echo ""

APP_DIR="/var/www/socialpolitician-app"
cd "$APP_DIR" || { echo "❌ Error: Could not cd to $APP_DIR"; exit 1; }

# Step 1: Pull latest changes
echo "📥 Pulling latest changes from git..."
# Stash local changes to package-lock.json if they exist
if git diff --quiet package-lock.json; then
  echo "   No local changes to package-lock.json"
else
  echo "   Stashing local changes to package-lock.json..."
  git stash push -m "Stash package-lock.json before pull" package-lock.json || true
fi
git pull origin main || { echo "⚠️  Git pull failed - continuing anyway"; }

# Step 1.5: Run PocketBase migrations (if binary found)
# Migrations must run against the same pb_data the live PocketBase uses.
PB_DIR="$APP_DIR/pocketbase"
PB_BIN="$APP_DIR/pb_linux/pocketbase"
if [[ -f "$PB_BIN" && -x "$PB_BIN" && -d "$PB_DIR/pb_migrations" ]]; then
  echo "📦 Running PocketBase migrations..."
  # Try pocketbase/ first (pb_data in pocketbase/). If live app uses pb_linux/pb_data, run from pb_linux.
  if [[ -d "$APP_DIR/pb_linux/pb_data" ]]; then
    (cd "$APP_DIR/pb_linux" && ln -sf ../pocketbase/pb_migrations pb_migrations 2>/dev/null); true
    (cd "$APP_DIR/pb_linux" && "$PB_BIN" migrate up 2>/dev/null) && echo "   ✅ Migrations OK (pb_linux)" || \
    (cd "$PB_DIR" && "$PB_BIN" migrate up 2>/dev/null) && echo "   ✅ Migrations OK (pocketbase)" || true
  else
    (cd "$PB_DIR" && "$PB_BIN" migrate up 2>/dev/null) && echo "   ✅ Migrations OK" || true
  fi
fi

# Step 2: Install dependencies (if needed)
echo "📦 Installing dependencies..."
npm install

# Step 2.5: Clean old build (IMPORTANT - removes cached files)
echo "🧹 Cleaning old build..."
rm -rf web/dist
echo "   ✅ Old build removed"

# Step 3: Build frontend
echo "🔨 Building frontend..."
npm run build

# Step 4: Verify build
echo "🔍 Verifying build..."
# Check for actual localhost URLs (http://localhost or https://localhost), not just the word "localhost"
if grep -rE "(https?://localhost|https?://127\.0\.0\.1)" web/dist 2>/dev/null; then
  echo "❌ ERROR: Found localhost URL in build!"
  exit 1
fi
if grep -r "current_position!~" web/dist 2>/dev/null; then
  echo "❌ ERROR: Found old filter syntax (!~) in build!"
  exit 1
fi
echo "✅ Build OK - no localhost URLs, no old filter syntax"

# Step 4.5: Setup news proxy (enables Latest News feed on profiles)
echo "📰 Setting up news proxy..."
if [ -f "$APP_DIR/scripts/setup-news-proxy-on-vps.sh" ]; then
  bash "$APP_DIR/scripts/setup-news-proxy-on-vps.sh" || echo "⚠️  News proxy setup had warnings"
else
  echo "   Skipping (script not found)"
fi

# Step 5: Restart services
echo "🔄 Restarting services..."
sudo systemctl restart socialpolitician-app-pocketbase.service 2>/dev/null || echo "⚠️  PocketBase service not found"
sudo systemctl restart socialpolitician-app-api.service 2>/dev/null || echo "⚠️  API service not found"
sudo systemctl restart socialpolitician-news-proxy.service 2>/dev/null || echo "⚠️  News proxy service not found"
sudo systemctl reload nginx || echo "⚠️  Nginx reload failed"

# Step 6: Health check
echo "🏥 Health check..."
sleep 2
if curl -f http://127.0.0.1:8091/api/health >/dev/null 2>&1; then
  echo "   ✅ PocketBase OK"
else
  echo "   ⚠️  PocketBase not responding"
fi

# Step 7: Verify site
echo "🌐 Verifying site..."
if curl -sf -o /dev/null https://app.socialpolitician.com; then
  echo "   ✅ https://app.socialpolitician.com OK"
else
  echo "   ⚠️  Site check failed"
fi

echo ""
echo "✅ Deployment complete!"
echo "🌐 Visit: https://app.socialpolitician.com"
echo ""
echo "📊 Check senator count:"
echo "   Should show 100 current senators (excluding Previous/Former)"
