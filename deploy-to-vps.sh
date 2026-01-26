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
if grep -r "localhost\|127.0.0.1" web/dist 2>/dev/null; then
  echo "❌ ERROR: Found localhost in build!"
  exit 1
fi
if grep -r "current_position!~" web/dist 2>/dev/null; then
  echo "❌ ERROR: Found old filter syntax (!~) in build!"
  exit 1
fi
echo "✅ Build OK - no localhost, no old filter syntax"

# Step 5: Restart services
echo "🔄 Restarting services..."
sudo systemctl restart socialpolitician-app-pocketbase.service 2>/dev/null || echo "⚠️  PocketBase service not found"
sudo systemctl restart socialpolitician-app-api.service 2>/dev/null || echo "⚠️  API service not found"
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
