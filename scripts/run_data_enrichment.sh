#!/bin/bash
# Master script to run the complete data enrichment pipeline
# 
# This script:
# 1. Verifies nginx configuration
# 2. Runs Wikipedia enrichment (social links, website, district)
# 3. Runs portrait download (batch mode)
# 4. Runs portrait upload
# 5. Prints final summary
#
# Usage:
#   POCKETBASE_URL=http://127.0.0.1:8091 \
#   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
#   POCKETBASE_ADMIN_PASSWORD=password \
#   bash scripts/run_data_enrichment.sh

set -e

echo "🚀 Data Enrichment Pipeline"
echo "==========================="
echo ""

# Check required env vars
if [ -z "$POCKETBASE_ADMIN_EMAIL" ] || [ -z "$POCKETBASE_ADMIN_PASSWORD" ]; then
    echo "❌ ERROR: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set"
    exit 1
fi

POCKETBASE_URL=${POCKETBASE_URL:-http://127.0.0.1:8091}
export POCKETBASE_URL
export POCKETBASE_ADMIN_EMAIL
export POCKETBASE_ADMIN_PASSWORD

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Verify nginx
echo "1️⃣ Verifying Nginx Configuration"
echo "--------------------------------"
if bash scripts/verify_nginx_pb_files.sh; then
    echo -e "${GREEN}✅ Nginx verification passed${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx verification had issues${NC}"
    echo "   You may want to run: sudo bash scripts/fix_nginx_pb_files.sh"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# Step 2: Wikipedia enrichment
echo "2️⃣ Running Wikipedia Enrichment"
echo "--------------------------------"
echo "   This will enrich: district, website_url, social media links"
echo ""
if npx tsx server/src/scripts/enrichPoliticiansFromWikipedia.ts; then
    echo -e "${GREEN}✅ Wikipedia enrichment complete${NC}"
else
    echo -e "${YELLOW}⚠️  Wikipedia enrichment had errors (check logs above)${NC}"
    read -p "Continue with portrait pipeline? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# Step 3: Portrait download (batch mode)
echo "3️⃣ Downloading Portraits from Wikipedia"
echo "--------------------------------------"
echo "   This will download portraits in batches"
echo "   You can stop and resume later - progress is saved"
echo ""
read -p "Start portrait download? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "   Running first batch (25 portraits)..."
    echo "   To run more batches, use: bash scripts/scrape_portraits_batch.sh"
    echo ""
    if node scripts/scrape_portraits.js --limit=25; then
        echo -e "${GREEN}✅ Portrait download batch complete${NC}"
    else
        echo -e "${YELLOW}⚠️  Portrait download had errors${NC}"
    fi
else
    echo "   Skipping portrait download"
fi
echo ""

# Step 4: Portrait upload
echo "4️⃣ Uploading Portraits to PocketBase"
echo "-------------------------------------"
echo "   This will upload downloaded portraits"
echo ""
read -p "Start portrait upload? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if node scripts/upload_portraits.js; then
        echo -e "${GREEN}✅ Portrait upload complete${NC}"
    else
        echo -e "${YELLOW}⚠️  Portrait upload had errors${NC}"
    fi
else
    echo "   Skipping portrait upload"
fi
echo ""

# Step 5: Final summary
echo "5️⃣ Final Summary"
echo "----------------"
echo ""

# Count updated records (from enrichment results)
if [ -f "tmp/enrich_results.json" ]; then
    UPDATED_COUNT=$(node -e "
        const results = require('./tmp/enrich_results.json');
        const updated = results.filter(r => r.success && r.updatedFields.length > 0).length;
        console.log(updated);
    " 2>/dev/null || echo "0")
    echo "   Wikipedia enrichment: $UPDATED_COUNT records updated"
else
    echo "   Wikipedia enrichment: Results file not found"
fi

# Count uploaded portraits (from index)
if [ -f "portraits/index.json" ]; then
    UPLOADED_COUNT=$(node -e "
        const index = require('./portraits/index.json');
        const uploaded = Object.values(index).filter(e => e.status === 'uploaded').length;
        console.log(uploaded);
    " 2>/dev/null || echo "0")
    echo "   Portraits uploaded: $UPLOADED_COUNT"
else
    echo "   Portraits uploaded: Index file not found"
fi

# Count remaining portraits to upload
if [ -d "portraits/to-label" ]; then
    REMAINING=$(find portraits/to-label -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.webp" \) | wc -l | tr -d ' ')
    echo "   Portraits remaining: $REMAINING"
else
    echo "   Portraits remaining: Unknown (to-label directory not found)"
fi

echo ""
echo "==========================="
echo -e "${GREEN}✅ Pipeline complete!${NC}"
echo ""
echo "Next steps:"
echo "  - Run more portrait batches: bash scripts/scrape_portraits_batch.sh"
echo "  - Review portraits in: portraits/to-label/"
echo "  - Upload more portraits: node scripts/upload_portraits.js"
echo "  - Check results: tmp/enrich_results.json"
echo ""
