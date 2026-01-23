#!/bin/bash
# Scrape and upload governor portraits
# 
# This script downloads governor portraits from Wikipedia and uploads them to PocketBase

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Check for required environment variables
if [ -z "$POCKETBASE_URL" ] || [ -z "$POCKETBASE_ADMIN_EMAIL" ] || [ -z "$POCKETBASE_ADMIN_PASSWORD" ]; then
  echo "❌ ERROR: Required environment variables not set"
  echo ""
  echo "Usage:"
  echo "  POCKETBASE_URL=http://127.0.0.1:8091 \\"
  echo "  POCKETBASE_ADMIN_EMAIL=admin@vma.agency \\"
  echo "  POCKETBASE_ADMIN_PASSWORD=password \\"
  echo "  bash scripts/scrape_governor_portraits.sh"
  exit 1
fi

echo "🖼️  Governor Portrait Pipeline"
echo "=============================="
echo ""

# Step 1: Download portraits
echo "📥 Step 1: Downloading governor portraits from Wikipedia..."
echo ""
POCKETBASE_URL="$POCKETBASE_URL" \
POCKETBASE_ADMIN_EMAIL="$POCKETBASE_ADMIN_EMAIL" \
POCKETBASE_ADMIN_PASSWORD="$POCKETBASE_ADMIN_PASSWORD" \
node scripts/scrape_portraits.js --office-type=governor

echo ""
echo ""

# Step 2: Upload portraits
echo "📤 Step 2: Uploading governor portraits to PocketBase..."
echo ""
POCKETBASE_URL="$POCKETBASE_URL" \
POCKETBASE_ADMIN_EMAIL="$POCKETBASE_ADMIN_EMAIL" \
POCKETBASE_ADMIN_PASSWORD="$POCKETBASE_ADMIN_PASSWORD" \
node scripts/upload_portraits.js

echo ""
echo "✅ Governor portrait pipeline complete!"
echo ""
