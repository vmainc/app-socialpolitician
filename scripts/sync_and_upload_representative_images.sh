#!/bin/bash
# Sync representative images to VPS and upload them
# This script should be run on the VPS after images are available

set -e

echo "🔄 Syncing and Uploading Representative Images"
echo "=============================================="
echo ""

APP_DIR="/var/www/socialpolitician-app"
cd "$APP_DIR" || exit 1

# Check for required environment variables
if [ -z "$POCKETBASE_ADMIN_EMAIL" ] || [ -z "$POCKETBASE_ADMIN_PASSWORD" ]; then
  echo "❌ ERROR: Required environment variables not set"
  echo ""
  echo "Usage:"
  echo "  POCKETBASE_ADMIN_EMAIL=admin@vma.agency \\"
  echo "  POCKETBASE_ADMIN_PASSWORD=YOUR_ACTUAL_PASSWORD \\"
  echo "  bash scripts/sync_and_upload_representative_images.sh"
  echo ""
  echo "⚠️  Note: Replace YOUR_ACTUAL_PASSWORD with your real PocketBase admin password"
  exit 1
fi

POCKETBASE_URL="${POCKETBASE_URL:-http://127.0.0.1:8091}"

# Check if images directory exists
if [ ! -d "portraits/representatives" ]; then
  echo "⚠️  Warning: portraits/representatives directory not found"
  echo "   Images may need to be transferred from local machine"
  echo "   Or run the scraper on the VPS first"
  echo ""
fi

# Check if index.json exists
if [ ! -f "portraits/representatives/index.json" ]; then
  echo "❌ Error: portraits/representatives/index.json not found"
  echo "   Cannot proceed without the index file"
  exit 1
fi

echo "📊 Found index.json with representative data"
echo ""

# Upload images to PocketBase
echo "📤 Uploading representative images to PocketBase..."
echo ""
POCKETBASE_URL="$POCKETBASE_URL" \
POCKETBASE_ADMIN_EMAIL="$POCKETBASE_ADMIN_EMAIL" \
POCKETBASE_ADMIN_PASSWORD="$POCKETBASE_ADMIN_PASSWORD" \
node scripts/upload_representative_photos.js

echo ""
echo "✅ Upload complete!"
echo ""
