#!/bin/bash

# Sync Representative Photos from Local to VPS
# This script transfers the portraits/representatives/ directory to the VPS

set -e

echo "📤 Syncing Representative Photos to VPS"
echo "========================================"
echo ""

# Configuration
VPS_HOST="${VPS_HOST:-doug@69.169.103.23}"
VPS_PATH="${VPS_PATH:-/var/www/socialpolitician-app}"
LOCAL_PORTRAITS_DIR="portraits/representatives"

# Check if local directory exists
if [ ! -d "$LOCAL_PORTRAITS_DIR" ]; then
  echo "❌ Error: $LOCAL_PORTRAITS_DIR not found locally"
  echo "   Run the scraper first: node scripts/scrape_representative_images.js"
  exit 1
fi

# Check if index.json exists
if [ ! -f "$LOCAL_PORTRAITS_DIR/index.json" ]; then
  echo "❌ Error: $LOCAL_PORTRAITS_DIR/index.json not found"
  echo "   Run the scraper first: node scripts/scrape_representative_images.js"
  exit 1
fi

echo "📊 Local photos found:"
echo "   Directory: $LOCAL_PORTRAITS_DIR"
IMAGE_COUNT=$(find "$LOCAL_PORTRAITS_DIR" -type f -name "*.jpg" -o -name "*.png" | wc -l | tr -d ' ')
echo "   Images: $IMAGE_COUNT"
echo "   Index: $(wc -l < "$LOCAL_PORTRAITS_DIR/index.json" | tr -d ' ') entries"
echo ""

echo "🚀 Syncing to VPS..."
echo "   Host: $VPS_HOST"
echo "   Path: $VPS_PATH/portraits/representatives/"
echo ""

# Create directory on VPS if it doesn't exist
ssh "$VPS_HOST" "mkdir -p $VPS_PATH/portraits/representatives"

# Sync files using rsync
rsync -avz --progress \
  "$LOCAL_PORTRAITS_DIR/" \
  "$VPS_HOST:$VPS_PATH/portraits/representatives/"

echo ""
echo "✅ Photos synced successfully!"
echo ""
echo "📋 Next steps on VPS:"
echo "   cd $VPS_PATH"
echo "   POCKETBASE_URL=http://127.0.0.1:8091 \\"
echo "   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \\"
echo "   POCKETBASE_ADMIN_PASSWORD=VMAmadmia42O200! \\"
echo "   node scripts/upload_representative_photos.js"
echo ""
