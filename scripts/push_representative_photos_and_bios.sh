#!/bin/bash

# Push Representative Photos and Bios to Production
# This script uploads photos and fetches bios for all representatives

set -e  # Exit on error

echo "🚀 Pushing Representative Photos and Bios to Production"
echo "========================================================="
echo ""

# Configuration
POCKETBASE_URL="${POCKETBASE_URL:-http://127.0.0.1:8091}"
POCKETBASE_ADMIN_EMAIL="${POCKETBASE_ADMIN_EMAIL:-admin@vma.agency}"
POCKETBASE_ADMIN_PASSWORD="${POCKETBASE_ADMIN_PASSWORD:-VMAmadmia42O200!}"

# Export for Node.js scripts
export POCKETBASE_URL
export POCKETBASE_ADMIN_EMAIL
export POCKETBASE_ADMIN_PASSWORD

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "📋 Step 1: Upload Representative Photos"
echo "----------------------------------------"
echo ""

# Check if photos directory exists
if [ ! -d "portraits/representatives" ]; then
  echo "⚠️  Warning: portraits/representatives/ directory not found"
  echo "   Photos may not have been scraped yet."
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted"
    exit 1
  fi
fi

# Check if index.json exists
if [ ! -f "portraits/representatives/index.json" ]; then
  echo "⚠️  Warning: portraits/representatives/index.json not found"
  echo "   Photos may not have been scraped yet."
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted"
    exit 1
  fi
fi

# Run photo upload script
echo "📤 Uploading photos..."
echo ""

if node scripts/upload_representative_photos.js; then
  echo ""
  echo "✅ Photos uploaded successfully!"
  echo ""
else
  echo ""
  echo "❌ Photo upload failed"
  exit 1
fi

echo ""
echo "📋 Step 2: Fetch and Push Representative Bios"
echo "-----------------------------------------------"
echo ""
echo "⏳ This will take approximately 10-15 minutes (rate limited)"
echo "   Processing 431 representatives..."
echo ""

# Run bio fetching script
if node scripts/fetch_representative_bios.js; then
  echo ""
  echo "✅ Bios fetched and pushed successfully!"
  echo ""
else
  echo ""
  echo "❌ Bio fetching failed"
  exit 1
fi

echo ""
echo "🎉 All done!"
echo "============"
echo ""
echo "✅ Representative photos uploaded"
echo "✅ Representative bios fetched and updated"
echo ""
echo "📊 Check the output above for any warnings or failures."
echo ""
