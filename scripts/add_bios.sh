#!/bin/bash
# Add bios to all politicians from Wikipedia
# Run this on VPS after deployment

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
  echo "  bash scripts/add_bios.sh"
  exit 1
fi

echo "📚 Adding Bios from Wikipedia"
echo "============================"
echo ""

POCKETBASE_URL="$POCKETBASE_URL" \
POCKETBASE_ADMIN_EMAIL="$POCKETBASE_ADMIN_EMAIL" \
POCKETBASE_ADMIN_PASSWORD="$POCKETBASE_ADMIN_PASSWORD" \
npx tsx server/src/scripts/enrichPoliticiansFromWikipedia.ts

echo ""
echo "✅ Bio enrichment complete!"
echo ""
