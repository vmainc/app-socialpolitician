#!/bin/bash
# Quick deployment script for app.socialpolitician.com
# Run this on your VPS

set -e

echo "🚀 Deploying app.socialpolitician.com..."
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "❌ Please run as regular user (not root)"
   exit 1
fi

APP_DIR="/var/www/socialpolitician-app"
CURRENT_DIR=$(pwd)

# Step 1: Build frontend
echo "📦 Building frontend..."
npm run build

# Step 2: Verify no localhost
echo "🔍 Verifying build..."
if grep -r "localhost\|127.0.0.1" web/dist 2>/dev/null; then
  echo "❌ ERROR: Found localhost in build!"
  exit 1
fi
echo "✅ Build OK"

# Step 3: Restart services
echo "🔄 Restarting services..."
sudo systemctl restart socialpolitician-app-pocketbase.service || echo "⚠️  PocketBase service not found"
sudo systemctl restart socialpolitician-app-api.service || echo "⚠️  API service not found"
sudo systemctl reload nginx || echo "⚠️  Nginx reload failed"

# Step 4: Health check
echo "🏥 Health check..."
sleep 2
curl -f http://127.0.0.1:8091/api/health && echo " ✅ PocketBase OK" || echo "❌ PocketBase not responding"

# Step 5: Optional HTTPS check (SSL)
echo "🔒 HTTPS check..."
if curl -sf -o /dev/null https://app.socialpolitician.com; then
  echo "   ✅ https://app.socialpolitician.com OK"
else
  echo "   ⚠️  HTTPS check failed — run: sudo ./fix-ssl.sh"
fi

echo ""
echo "✅ Deployment complete!"
echo "🌐 Visit: https://app.socialpolitician.com"
