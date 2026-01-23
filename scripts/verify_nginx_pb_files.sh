#!/bin/bash
# Verify that PocketBase file URLs work through nginx
# Tests /pb/api/health and /pb/api/files/ endpoints

set -e

DOMAIN="app.socialpolitician.com"
BASE_URL="https://${DOMAIN}"

echo "🔍 Verifying Nginx PocketBase File Routing"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health check
echo "1️⃣ Testing /pb/api/health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/pb/api/health" || echo "000")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "   ${GREEN}✅ Health check passed (200)${NC}"
else
    echo -e "   ${RED}❌ Health check failed (HTTP $HEALTH_RESPONSE)${NC}"
    echo "   This indicates a basic routing issue"
fi
echo ""

# Test 2: Try to access files endpoint (should return 401/403, not 404)
echo "2️⃣ Testing /pb/api/files/ endpoint..."
# Use a known collection ID and a test path
FILES_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/pb/api/files/pbc_3830222512/test/test.jpg" || echo "000")
if [ "$FILES_RESPONSE" = "404" ]; then
    echo -e "   ${RED}❌ Files endpoint returns 404 (routing issue)${NC}"
    echo "   This means nginx is not properly proxying /pb/api/files/ requests"
    echo "   Expected: 401 (unauthorized) or 403 (forbidden), not 404"
elif [ "$FILES_RESPONSE" = "401" ] || [ "$FILES_RESPONSE" = "403" ]; then
    echo -e "   ${GREEN}✅ Files endpoint returns $FILES_RESPONSE (routing works)${NC}"
    echo "   This is expected - file doesn't exist or requires auth, but routing is correct"
else
    echo -e "   ${YELLOW}⚠️  Files endpoint returns HTTP $FILES_RESPONSE${NC}"
    echo "   This might be okay depending on PocketBase rules"
fi
echo ""

# Test 3: Check nginx config for proper /pb/ location
echo "3️⃣ Checking nginx configuration..."
NGINX_CONFIG="/etc/nginx/sites-available/app.socialpolitician.com.conf"
if [ -f "$NGINX_CONFIG" ]; then
    if grep -q "location /pb/" "$NGINX_CONFIG"; then
        echo -e "   ${GREEN}✅ /pb/ location block found${NC}"
        
        # Check if static files regex excludes /pb/
        if grep -q "location ~\* \^\(?!/pb/\)" "$NGINX_CONFIG"; then
            echo -e "   ${GREEN}✅ Static files regex excludes /pb/ paths${NC}"
        else
            echo -e "   ${YELLOW}⚠️  Static files regex may not exclude /pb/ paths${NC}"
            echo "   This could cause conflicts"
        fi
    else
        echo -e "   ${RED}❌ /pb/ location block not found${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  Nginx config file not found${NC}"
fi
echo ""

# Summary
echo "=========================================="
if [ "$HEALTH_RESPONSE" = "200" ] && [ "$FILES_RESPONSE" != "404" ]; then
    echo -e "${GREEN}✅ PocketBase routing appears to be working${NC}"
    exit 0
else
    echo -e "${RED}❌ PocketBase routing has issues${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run: sudo bash scripts/fix_nginx_pb_files.sh"
    echo "  2. Check nginx error logs: sudo tail -f /var/log/nginx/app.socialpolitician.com.error.log"
    exit 1
fi
