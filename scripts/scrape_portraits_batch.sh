#!/bin/bash
# Batch wrapper for portrait scraping
# Runs in smaller batches with delays between batches

set -e

BATCH_SIZE=${BATCH_SIZE:-25}
BATCH_DELAY=${BATCH_DELAY:-60}  # seconds between batches
USE_LABELED=${USE_LABELED:-false}

echo "🖼️  Batch Portrait Scraping"
echo "============================"
echo ""
echo "Batch size: $BATCH_SIZE"
echo "Delay between batches: ${BATCH_DELAY}s"
echo ""

BATCH_NUM=1
OFFSET=0

while true; do
  echo "📦 Batch $BATCH_NUM (offset: $OFFSET)"
  echo "-----------------------------------"
  
  # Run scraping with limit
  if [ "$USE_LABELED" = "true" ]; then
    node scripts/scrape_portraits.js --use-labeled --limit=$BATCH_SIZE
  else
    node scripts/scrape_portraits.js --limit=$BATCH_SIZE
  fi
  
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -ne 0 ]; then
    echo "❌ Batch $BATCH_NUM failed with exit code $EXIT_CODE"
    exit $EXIT_CODE
  fi
  
  # Check if we got fewer results than batch size (end of data)
  # This is a simple heuristic - the script will skip already-downloaded files
  # So if we get fewer than batch_size, we might be done
  
  OFFSET=$((OFFSET + BATCH_SIZE))
  BATCH_NUM=$((BATCH_NUM + 1))
  
  echo ""
  echo "⏳ Waiting ${BATCH_DELAY}s before next batch..."
  sleep $BATCH_DELAY
  echo ""
done
