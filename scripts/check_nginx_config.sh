#!/bin/bash
# Check Nginx configuration for PocketBase file serving

NGINX_CONFIG="/etc/nginx/sites-available/app.socialpolitician.com.conf"

echo "🔍 Checking Nginx Configuration"
echo "================================"
echo ""

if [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ Config not found: $NGINX_CONFIG"
    exit 1
fi

echo "📋 Location blocks (in order):"
echo ""
grep -n "location" "$NGINX_CONFIG" | head -20

echo ""
echo "📋 /pb/ location block:"
echo ""
sed -n '/location \/pb\//,/^[[:space:]]*}/p' "$NGINX_CONFIG"

echo ""
echo "📋 Static files location block:"
echo ""
grep -A 5 "location ~\*" "$NGINX_CONFIG" | head -10

echo ""
echo "🧪 Testing nginx config:"
sudo nginx -t
