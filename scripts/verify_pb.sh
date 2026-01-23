#!/bin/bash
# Verify PocketBase connectivity for app.socialpolitician.com
# Run this on your VPS or locally to test endpoints

set -e

echo "🔍 PocketBase Connectivity Verification"
echo "========================================"
echo ""

DOMAIN="app.socialpolitician.com"
PB_PORT="8091"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Local PocketBase health
echo "1️⃣ Testing local PocketBase (127.0.0.1:$PB_PORT)..."
if curl -sf "http://127.0.0.1:$PB_PORT/api/health" > /dev/null; then
    HEALTH_RESPONSE=$(curl -sS "http://127.0.0.1:$PB_PORT/api/health")
    echo -e "   ${GREEN}✅ Local PocketBase is running${NC}"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo -e "   ${RED}❌ Local PocketBase is NOT running${NC}"
    echo "   Check: sudo systemctl status socialpolitician-app-pocketbase.service"
    exit 1
fi
echo ""

# Test 2: HTTPS health endpoint
echo "2️⃣ Testing HTTPS health endpoint (https://$DOMAIN/pb/api/health)..."
HEALTH_HTTPS=$(curl -sS "https://$DOMAIN/pb/api/health" 2>&1)
if echo "$HEALTH_HTTPS" | grep -q "healthy\|message"; then
    echo -e "   ${GREEN}✅ HTTPS health endpoint works${NC}"
    echo "   Response: $HEALTH_HTTPS"
else
    echo -e "   ${RED}❌ HTTPS health endpoint failed${NC}"
    echo "   Response: $HEALTH_HTTPS"
    echo "   Check nginx proxy configuration"
    exit 1
fi
echo ""

# Test 3: Politicians collection
echo "3️⃣ Testing politicians collection (https://$DOMAIN/pb/api/collections/politicians/records)..."
POLITICIANS_RESPONSE=$(curl -sS "https://$DOMAIN/pb/api/collections/politicians/records?page=1&perPage=1" 2>&1)
if echo "$POLITICIANS_RESPONSE" | grep -q "items\|totalItems"; then
    TOTAL_ITEMS=$(echo "$POLITICIANS_RESPONSE" | grep -o '"totalItems":[0-9]*' | cut -d: -f2 || echo "0")
    echo -e "   ${GREEN}✅ Politicians collection is accessible${NC}"
    echo "   Total items: $TOTAL_ITEMS"
    if [ "$TOTAL_ITEMS" = "0" ]; then
        echo -e "   ${YELLOW}⚠️  Collection is empty - data needs to be imported${NC}"
    fi
else
    echo -e "   ${RED}❌ Politicians collection endpoint failed${NC}"
    echo "   Response: $POLITICIANS_RESPONSE"
    exit 1
fi
echo ""

# Test 4: Check for HTML responses (should be JSON)
echo "4️⃣ Verifying responses are JSON (not HTML)..."
if echo "$HEALTH_HTTPS" | grep -q "<!DOCTYPE\|<html"; then
    echo -e "   ${RED}❌ Health endpoint returned HTML instead of JSON${NC}"
    echo "   This indicates nginx routing issue - /pb/ is falling through to SPA"
    exit 1
else
    echo -e "   ${GREEN}✅ Responses are JSON (not HTML)${NC}"
fi
echo ""

# Test 5: Check PocketBase service status (if on VPS)
if command -v systemctl > /dev/null 2>&1; then
    echo "5️⃣ Checking PocketBase service status..."
    if systemctl is-active --quiet socialpolitician-app-pocketbase.service 2>/dev/null; then
        echo -e "   ${GREEN}✅ PocketBase service is running${NC}"
    else
        echo -e "   ${YELLOW}⚠️  PocketBase service not found or not running${NC}"
        echo "   Service name: socialpolitician-app-pocketbase.service"
    fi
    echo ""
fi

# Test 6: Check port binding
echo "6️⃣ Checking port $PB_PORT binding..."
if command -v ss > /dev/null 2>&1; then
    if ss -lntp | grep -q ":$PB_PORT "; then
        echo -e "   ${GREEN}✅ Port $PB_PORT is bound${NC}"
        ss -lntp | grep ":$PB_PORT " | head -1
    else
        echo -e "   ${RED}❌ Port $PB_PORT is NOT bound${NC}"
        exit 1
    fi
elif command -v netstat > /dev/null 2>&1; then
    if netstat -lntp 2>/dev/null | grep -q ":$PB_PORT "; then
        echo -e "   ${GREEN}✅ Port $PB_PORT is bound${NC}"
    else
        echo -e "   ${RED}❌ Port $PB_PORT is NOT bound${NC}"
        exit 1
    fi
else
    echo -e "   ${YELLOW}⚠️  Cannot check port (ss/netstat not available)${NC}"
fi
echo ""

echo "========================================"
echo -e "${GREEN}✅ All connectivity tests passed!${NC}"
echo ""
echo "Summary:"
echo "  - PocketBase is running locally on port $PB_PORT"
echo "  - HTTPS endpoint https://$DOMAIN/pb/api/health works"
echo "  - Politicians collection is accessible"
echo "  - Responses are JSON (not HTML)"
echo ""
echo "If the browser still can't connect, check:"
echo "  1. Browser console for CORS or network errors"
echo "  2. That the app is built with MODE=production"
echo "  3. That PB_BASE is set to '/pb' in production"
echo "  4. Browser DevTools Network tab to see actual requests"
