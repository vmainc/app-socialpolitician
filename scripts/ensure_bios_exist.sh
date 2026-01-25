#!/bin/bash

# Ensure Bios Exist for All Politicians
# This script:
# 1. Checks if bio field exists in PocketBase schema
# 2. Adds it if missing (via migration)
# 3. Fetches bios for senators
# 4. Fetches bios for representatives
# 5. Verifies bios are present

set -e

echo "🚀 Ensuring Bios Exist for All Politicians"
echo "==========================================="
echo ""

# Configuration
POCKETBASE_URL="${POCKETBASE_URL:-http://127.0.0.1:8091}"
POCKETBASE_ADMIN_EMAIL="${POCKETBASE_ADMIN_EMAIL:-admin@vma.agency}"
POCKETBASE_ADMIN_PASSWORD="${POCKETBASE_ADMIN_PASSWORD:-VMAmadmia42O200!}"

export POCKETBASE_URL
export POCKETBASE_ADMIN_EMAIL
export POCKETBASE_ADMIN_PASSWORD

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "📋 Step 1: Check if bios exist"
echo "-------------------------------"
echo ""

if node scripts/check_bio_on_profile.js | grep -q "With bios: 0"; then
  echo "⚠️  No bios found. Proceeding to fetch..."
  echo ""
else
  echo "✅ Some bios already exist. Checking counts..."
  node scripts/check_bio_on_profile.js
  echo ""
  read -p "Continue to fetch missing bios? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 0
  fi
fi

echo ""
echo "📋 Step 2: Ensure bio field exists in schema"
echo "---------------------------------------------"
echo ""

# Check if migration file exists
if [ -f "pocketbase/pb_migrations/1769200000_add_bio_field.js" ]; then
  echo "ℹ️  Migration file exists. Bio field should be added automatically by PocketBase."
  echo "   If bios aren't saving, you may need to manually add the field in PocketBase admin UI."
  echo ""
else
  echo "⚠️  Migration file not found. Bio field may not exist."
  echo ""
fi

echo ""
echo "📋 Step 3: Fetch bios for Senators"
echo "-----------------------------------"
echo ""

if [ -f "scripts/fetch_senator_bios.js" ]; then
  echo "📖 Fetching senator bios from Wikipedia..."
  echo "   (This will take ~2-3 minutes for 100 senators)"
  echo ""
  
  if node scripts/fetch_senator_bios.js; then
    echo ""
    echo "✅ Senator bios fetched!"
  else
    echo ""
    echo "❌ Failed to fetch senator bios"
    exit 1
  fi
else
  echo "⚠️  fetch_senator_bios.js not found. Skipping senators."
fi

echo ""
echo "📋 Step 4: Fetch bios for Representatives"
echo "------------------------------------------"
echo ""

if [ -f "scripts/fetch_representative_bios.js" ]; then
  echo "📖 Fetching representative bios from Wikipedia..."
  echo "   (This will take ~10-15 minutes for 431 representatives)"
  echo ""
  
  if node scripts/fetch_representative_bios.js; then
    echo ""
    echo "✅ Representative bios fetched!"
  else
    echo ""
    echo "❌ Failed to fetch representative bios"
    exit 1
  fi
else
  echo "⚠️  fetch_representative_bios.js not found. Skipping representatives."
fi

echo ""
echo "📋 Step 5: Verify bios are present"
echo "-----------------------------------"
echo ""

node scripts/check_bio_on_profile.js

echo ""
echo "🎉 Done!"
echo "========"
echo ""
echo "✅ Bios should now be visible on profile pages"
echo ""
