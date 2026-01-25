#!/bin/bash
# Deploy representative images to production VPS
# This uploads the scraped images from portraits/representatives/ to PocketBase on VPS

set -e

echo "🚀 Deploying Representative Images to Production"
echo "================================================="
echo ""

APP_DIR="/var/www/socialpolitician-app"
cd "$APP_DIR" || exit 1

# Check for required environment variables
if [ -z "$POCKETBASE_ADMIN_EMAIL" ] || [ -z "$POCKETBASE_ADMIN_PASSWORD" ]; then
  echo "❌ ERROR: Required environment variables not set"
  echo ""
  echo "Usage:"
  echo "  POCKETBASE_ADMIN_EMAIL=admin@vma.agency \\"
  echo "  POCKETBASE_ADMIN_PASSWORD=your-password \\"
  echo "  bash scripts/deploy_representative_images.sh"
  exit 1
fi

POCKETBASE_URL="${POCKETBASE_URL:-http://127.0.0.1:8091}"

# Step 1: Pull latest code (to get the upload script)
echo "📥 Step 1: Pulling latest code..."
git pull origin main
echo "✅ Code updated"
echo ""

# Step 2: Check if images exist
if [ ! -f "portraits/representatives/index.json" ]; then
  echo "⚠️  Warning: portraits/representatives/index.json not found"
  echo "   Images may need to be scraped first"
  echo ""
fi

# Step 3: Upload images to PocketBase
echo "📤 Step 3: Uploading representative images to PocketBase..."
echo ""
POCKETBASE_URL="$POCKETBASE_URL" \
POCKETBASE_ADMIN_EMAIL="$POCKETBASE_ADMIN_EMAIL" \
POCKETBASE_ADMIN_PASSWORD="$POCKETBASE_ADMIN_PASSWORD" \
node scripts/upload_representative_photos.js
echo ""

# Step 4: Verify
echo "🧪 Step 4: Verification"
echo "======================="
echo ""

# Count representatives with photos
echo "📊 Checking photo status..."
POCKETBASE_URL="$POCKETBASE_URL" \
POCKETBASE_ADMIN_EMAIL="$POCKETBASE_ADMIN_EMAIL" \
POCKETBASE_ADMIN_PASSWORD="$POCKETBASE_ADMIN_PASSWORD" \
node -e "
import PocketBase from 'pocketbase';
const pb = new PocketBase(process.env.POCKETBASE_URL);
await pb.admins.authWithPassword(process.env.POCKETBASE_ADMIN_EMAIL, process.env.POCKETBASE_ADMIN_PASSWORD);

const reps = await pb.collection('politicians').getFullList({
  filter: 'office_type=\"representative\" && current_position!~\"Previous\" && current_position!~\"Former\"',
});

const withPhotos = reps.filter(r => r.photo);
console.log(\`   Total: \${reps.length}\`);
console.log(\`   With photos: \${withPhotos.length}\`);
console.log(\`   Coverage: \${Math.round((withPhotos.length / reps.length) * 100)}%\`);
" || echo "   ⚠️  Could not verify"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Representative images should now be live at:"
echo "   https://app.socialpolitician.com/representatives"
echo ""
