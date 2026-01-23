#!/bin/bash
# Enrich governors with links and photos
# 
# This script:
# 1. Enriches governors with website and social links from Wikipedia
# 2. Downloads and uploads governor portraits

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
  echo "  bash scripts/enrich_governors.sh"
  exit 1
fi

echo "🎯 Governor Enrichment Pipeline"
echo "==============================="
echo ""

# Step 1: Enrich with links from Wikipedia
echo "📚 Step 1: Enriching governors with links from Wikipedia..."
echo ""
POCKETBASE_URL="$POCKETBASE_URL" \
POCKETBASE_ADMIN_EMAIL="$POCKETBASE_ADMIN_EMAIL" \
POCKETBASE_ADMIN_PASSWORD="$POCKETBASE_ADMIN_PASSWORD" \
npx tsx server/src/scripts/enrichPoliticiansFromWikipedia.ts --office-type=governor

echo ""
echo ""

# Step 2: Download portraits
echo "📥 Step 2: Downloading governor portraits from Wikipedia..."
echo ""
POCKETBASE_URL="$POCKETBASE_URL" \
POCKETBASE_ADMIN_EMAIL="$POCKETBASE_ADMIN_EMAIL" \
POCKETBASE_ADMIN_PASSWORD="$POCKETBASE_ADMIN_PASSWORD" \
node scripts/scrape_portraits.js --office-type=governor

echo ""
echo ""

# Step 3: Upload portraits
echo "📤 Step 3: Uploading governor portraits to PocketBase..."
echo ""
POCKETBASE_URL="$POCKETBASE_URL" \
POCKETBASE_ADMIN_EMAIL="$POCKETBASE_ADMIN_EMAIL" \
POCKETBASE_ADMIN_PASSWORD="$POCKETBASE_ADMIN_PASSWORD" \
node scripts/upload_portraits.js

echo ""
echo "✅ Governor enrichment pipeline complete!"
echo ""
