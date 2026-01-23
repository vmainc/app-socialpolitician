#!/bin/bash
# Complete deployment - fix Nginx, rebuild frontend, verify

set -e

APP_DIR="/var/www/socialpolitician-app"
cd "$APP_DIR" || exit 1

echo "🚀 Complete Deployment"
echo "======================"
echo ""

# Step 1: Pull latest code
echo "📥 Pulling latest code..."
git pull origin main
echo ""

# Step 2: Rebuild frontend (with senator filter fix)
echo "🔨 Building frontend..."
npm run build
echo "✅ Frontend built"
echo ""

# Step 3: Reload nginx
echo "🔄 Reloading nginx..."
sudo systemctl reload nginx
echo "✅ Nginx reloaded"
echo ""

# Step 4: Verify
echo "🧪 Verification"
echo "==============="
echo ""

# Test photos
echo "1️⃣ Testing photo routing..."
PHOTO_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://app.socialpolitician.com/pb/api/files/pbc_3830222512/hds7dmw5jo4m045/bob_casey_jr_hhq9ccfzz8.jpg" 2>&1 || echo "000")

if [ "$PHOTO_RESPONSE" = "200" ] || [ "$PHOTO_RESPONSE" = "401" ] || [ "$PHOTO_RESPONSE" = "403" ]; then
    echo "   ✅ Photos routing works (HTTP $PHOTO_RESPONSE)"
else
    echo "   ⚠️  Photos routing issue (HTTP $PHOTO_RESPONSE)"
fi

# Test health
echo ""
echo "2️⃣ Testing PocketBase health..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://app.socialpolitician.com/pb/api/health" 2>&1 || echo "000")

if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "   ✅ PocketBase health check OK"
else
    echo "   ⚠️  Health check issue (HTTP $HEALTH_RESPONSE)"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Visit: https://app.socialpolitician.com/senators"
echo "   Should show 100 senators (not 104)"
echo "   Photos should load correctly"
