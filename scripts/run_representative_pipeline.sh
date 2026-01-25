#!/bin/bash
# Wait for scraper to complete, then upload images

echo "⏳ Waiting for scraper to complete..."
echo "   (This may take 10-15 minutes for 437 images)"

# Wait for index.json to be created (indicates scraper finished)
while [ ! -f "portraits/representatives/index.json" ]; do
  sleep 10
  COUNT=$(find portraits/representatives -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.webp" \) | wc -l | tr -d ' ')
  echo "   Progress: $COUNT images downloaded..."
done

echo ""
echo "✅ Scraper completed! Found index.json"
echo "📤 Starting upload to PocketBase..."
echo ""

# Run upload script
node scripts/upload_representative_photos.js
