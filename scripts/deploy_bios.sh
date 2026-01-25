#!/bin/bash

# Deploy Frontend to Make Bios Live
# This script rebuilds and deploys the frontend so bios appear on the site

set -e

echo "🚀 Deploying Bios to Production"
echo "================================"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "📋 Step 1: Pull latest code"
echo "----------------------------"
git pull origin main || echo "⚠️  Git pull failed or already up to date"
echo ""

echo "📋 Step 2: Install dependencies"
echo "-------------------------------"
npm install
echo ""

echo "📋 Step 3: Build frontend"
echo "--------------------------"
npm run build
echo ""

echo "📋 Step 4: Reload Nginx"
echo "----------------------"
if command -v sudo &> /dev/null; then
  sudo systemctl reload nginx
  echo "✅ Nginx reloaded"
else
  echo "⚠️  Sudo not available - you may need to reload Nginx manually:"
  echo "   sudo systemctl reload nginx"
fi
echo ""

echo "🎉 Deployment complete!"
echo "======================"
echo ""
echo "✅ Frontend rebuilt"
echo "✅ Bios should now be visible on profile pages"
echo ""
echo "📝 Note: If bios don't appear, try:"
echo "   - Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)"
echo "   - Clear browser cache"
echo "   - Check a specific representative profile"
echo ""
