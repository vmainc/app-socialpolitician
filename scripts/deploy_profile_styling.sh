#!/bin/bash
# Deploy profile page styling updates to VPS

set -e

echo "🚀 Deploying Profile Page Styling Updates"
echo "=========================================="

# Navigate to project directory
cd /var/www/socialpolitician-app || exit 1

# Pull latest changes
echo ""
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies (if package.json changed)
echo ""
echo "📦 Checking dependencies..."
npm install

# Build frontend
echo ""
echo "🔨 Building frontend..."
npm run build

# Reload nginx
echo ""
echo "🔄 Reloading nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Deployment complete!"
echo ""
echo "The profile page should now match the directory page styling."
