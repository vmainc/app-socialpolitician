#!/bin/bash
# Complete deployment including governor photos
# Run this on VPS: cd /var/www/socialpolitician-app && bash scripts/deploy_with_governors.sh

set -e

APP_DIR="/var/www/socialpolitician-app"
cd "$APP_DIR" || exit 1

echo "🚀 Complete Deployment with Governor Photos"
echo "==========================================="
echo ""

# Check for required environment variables
if [ -z "$POCKETBASE_ADMIN_EMAIL" ] || [ -z "$POCKETBASE_ADMIN_PASSWORD" ]; then
  echo "❌ ERROR: Required environment variables not set"
  echo ""
  echo "Usage:"
  echo "  POCKETBASE_ADMIN_EMAIL=admin@vma.agency \\"
  echo "  POCKETBASE_ADMIN_PASSWORD=password \\"
  echo "  bash scripts/deploy_with_governors.sh"
  exit 1
fi

POCKETBASE_URL="${POCKETBASE_URL:-http://127.0.0.1:8091}"

# Step 1: Pull latest code
echo "📥 Step 1: Pulling latest code..."
git pull origin main
echo "✅ Code updated"
echo ""

# Step 2: Install dependencies (including sharp)
echo "📦 Step 2: Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Step 3: Build frontend
echo "🔨 Step 3: Building frontend..."
npm run build
echo "✅ Frontend built"
echo ""

# Step 4: Download and upload governor portraits
echo "🖼️  Step 4: Downloading and uploading governor portraits..."
echo ""
POCKETBASE_URL="$POCKETBASE_URL" \
POCKETBASE_ADMIN_EMAIL="$POCKETBASE_ADMIN_EMAIL" \
POCKETBASE_ADMIN_PASSWORD="$POCKETBASE_ADMIN_PASSWORD" \
bash scripts/enrich_governors.sh
echo ""

# Step 5: Reload nginx
echo "🔄 Step 5: Reloading nginx..."
sudo systemctl reload nginx
echo "✅ Nginx reloaded"
echo ""

# Step 6: Verify
echo "🧪 Step 6: Verification"
echo "======================"
echo ""

# Test PocketBase health
echo "1️⃣ Testing PocketBase health..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://app.socialpolitician.com/pb/api/health" 2>&1 || echo "000")

if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "   ✅ PocketBase health check OK"
else
    echo "   ⚠️  Health check issue (HTTP $HEALTH_RESPONSE)"
fi

# Test photo routing
echo ""
echo "2️⃣ Testing photo routing..."
PHOTO_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://app.socialpolitician.com/pb/api/files/pbc_3830222512/test/test.jpg" 2>&1 || echo "000")

if [ "$PHOTO_RESPONSE" = "200" ] || [ "$PHOTO_RESPONSE" = "401" ] || [ "$PHOTO_RESPONSE" = "403" ]; then
    echo "   ✅ Photos routing works (HTTP $PHOTO_RESPONSE)"
else
    echo "   ⚠️  Photos routing issue (HTTP $PHOTO_RESPONSE)"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Visit: https://app.socialpolitician.com/governors"
echo "   All 50 governors should now have photos"
echo ""
