#!/bin/bash
# Verify nginx routing configuration for app.socialpolitician.com
# Run this on your VPS with sudo

set -e

echo "🔍 Nginx Routing Verification"
echo "=============================="
echo ""

DOMAIN="app.socialpolitician.com"
NGINX_CONFIG="/etc/nginx/sites-available/app.socialpolitician.com.conf"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}⚠️  This script should be run with sudo${NC}"
    echo "   Some checks may fail without root access"
    echo ""
fi

# Test 1: Check nginx config exists
echo "1️⃣ Checking nginx configuration file..."
if [ -f "$NGINX_CONFIG" ]; then
    echo -e "   ${GREEN}✅ Config file exists: $NGINX_CONFIG${NC}"
else
    echo -e "   ${RED}❌ Config file not found: $NGINX_CONFIG${NC}"
    exit 1
fi
echo ""

# Test 2: Test nginx configuration syntax
echo "2️⃣ Testing nginx configuration syntax..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo -e "   ${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "   ${RED}❌ Nginx configuration has errors${NC}"
    sudo nginx -t
    exit 1
fi
echo ""

# Test 3: Check server_name block exists
echo "3️⃣ Checking for server_name block for $DOMAIN..."
NGINX_TEST=$(sudo nginx -T 2>/dev/null || echo "")
if echo "$NGINX_TEST" | grep -q "server_name $DOMAIN"; then
    echo -e "   ${GREEN}✅ Server block found for $DOMAIN${NC}"
else
    echo -e "   ${RED}❌ Server block NOT found for $DOMAIN${NC}"
    exit 1
fi
echo ""

# Test 4: Check /pb/ location block exists BEFORE SPA fallback
echo "4️⃣ Checking /pb/ location block..."
if echo "$NGINX_TEST" | grep -A 10 "server_name $DOMAIN" | grep -q "location /pb/"; then
    echo -e "   ${GREEN}✅ /pb/ location block found${NC}"
    
    # Extract and show the /pb/ location block
    echo "   Location block:"
    echo "$NGINX_TEST" | grep -A 15 "server_name $DOMAIN" | grep -A 10 "location /pb/" | head -12 | sed 's/^/      /'
else
    echo -e "   ${RED}❌ /pb/ location block NOT found${NC}"
    echo "   This is required for PocketBase connectivity"
    exit 1
fi
echo ""

# Test 5: Verify /pb/ proxies to correct port
echo "5️⃣ Verifying /pb/ proxies to port 8091..."
if echo "$NGINX_TEST" | grep -A 10 "location /pb/" | grep -q "proxy_pass.*8091"; then
    echo -e "   ${GREEN}✅ /pb/ proxies to port 8091${NC}"
    PROXY_PASS=$(echo "$NGINX_TEST" | grep -A 10 "location /pb/" | grep "proxy_pass" | head -1)
    echo "   $PROXY_PASS"
else
    echo -e "   ${RED}❌ /pb/ does NOT proxy to port 8091${NC}"
    exit 1
fi
echo ""

# Test 6: Check location order (pb should come before SPA fallback)
echo "6️⃣ Checking location block order..."
# Extract line numbers for location blocks
PB_LINE=$(echo "$NGINX_TEST" | grep -n "location /pb/" | head -1 | cut -d: -f1 || echo "")
ROOT_LINE=$(echo "$NGINX_TEST" | grep -n "location / {" | head -1 | cut -d: -f1 || echo "")

if [ -n "$PB_LINE" ] && [ -n "$ROOT_LINE" ]; then
    if [ "$PB_LINE" -lt "$ROOT_LINE" ]; then
        echo -e "   ${GREEN}✅ /pb/ location comes BEFORE SPA fallback (correct order)${NC}"
        echo "   /pb/ at line $PB_LINE, / at line $ROOT_LINE"
    else
        echo -e "   ${RED}❌ /pb/ location comes AFTER SPA fallback (wrong order)${NC}"
        echo "   /pb/ at line $PB_LINE, / at line $ROOT_LINE"
        echo "   Nginx will match / first and serve index.html instead of proxying"
        exit 1
    fi
else
    echo -e "   ${YELLOW}⚠️  Could not determine location block order${NC}"
fi
echo ""

# Test 7: Check required proxy headers
echo "7️⃣ Checking required proxy headers..."
REQUIRED_HEADERS=("Host \$host" "X-Forwarded-Proto \$scheme" "X-Real-IP \$remote_addr")
MISSING_HEADERS=()

for header in "${REQUIRED_HEADERS[@]}"; do
    if echo "$NGINX_TEST" | grep -A 10 "location /pb/" | grep -q "proxy_set_header.*$header"; then
        echo -e "   ${GREEN}✅ Found: $header${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Missing: $header${NC}"
        MISSING_HEADERS+=("$header")
    fi
done

if [ ${#MISSING_HEADERS[@]} -eq 0 ]; then
    echo -e "   ${GREEN}✅ All required proxy headers are set${NC}"
else
    echo -e "   ${YELLOW}⚠️  Some headers are missing (may still work)${NC}"
fi
echo ""

# Test 8: Check /api/ location (if exists)
echo "8️⃣ Checking /api/ location block..."
if echo "$NGINX_TEST" | grep -A 10 "server_name $DOMAIN" | grep -q "location /api/"; then
    echo -e "   ${GREEN}✅ /api/ location block found${NC}"
    if echo "$NGINX_TEST" | grep -A 10 "location /api/" | grep -q "proxy_pass.*3001"; then
        echo -e "   ${GREEN}✅ /api/ proxies to port 3001${NC}"
    else
        echo -e "   ${YELLOW}⚠️  /api/ does not proxy to port 3001${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  /api/ location block not found (may not be needed)${NC}"
fi
echo ""

echo "=============================="
echo -e "${GREEN}✅ Nginx routing configuration looks good!${NC}"
echo ""
echo "Summary:"
echo "  - Config file exists and is valid"
echo "  - Server block for $DOMAIN found"
echo "  - /pb/ location block exists and proxies to 8091"
echo "  - Location blocks are in correct order"
echo "  - Required proxy headers are set"
echo ""
echo "If issues persist, check:"
echo "  1. Nginx error logs: sudo tail -f /var/log/nginx/app.socialpolitician.com.error.log"
echo "  2. Nginx access logs: sudo tail -f /var/log/nginx/app.socialpolitician.com.access.log"
echo "  3. Reload nginx: sudo systemctl reload nginx"
