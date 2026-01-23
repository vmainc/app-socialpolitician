#!/bin/bash
# Verify PocketBase politicians collection public access
# Run this from anywhere to test the public API

set -e

DOMAIN="app.socialpolitician.com"
PB_PORT="8091"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 PocketBase Politicians Collection Verification"
echo "=================================================="
echo ""

# Test 1: Health endpoint (HTTPS)
echo "1️⃣ Testing HTTPS health endpoint..."
HEALTH_RESPONSE=$(curl -sS "https://$DOMAIN/pb/api/health" 2>&1)
if echo "$HEALTH_RESPONSE" | grep -q "<!DOCTYPE\|<html"; then
    echo -e "   ${RED}❌ Health endpoint returned HTML (nginx proxy broken)${NC}"
    echo "   Response: $HEALTH_RESPONSE"
    exit 1
elif echo "$HEALTH_RESPONSE" | grep -q "healthy\|message"; then
    echo -e "   ${GREEN}✅ Health endpoint returns JSON${NC}"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo -e "   ${RED}❌ Health endpoint failed${NC}"
    echo "   Response: $HEALTH_RESPONSE"
    exit 1
fi
echo ""

# Test 2: Politicians collection (HTTPS)
echo "2️⃣ Testing politicians collection (HTTPS)..."
POLITICIANS_RESPONSE=$(curl -sS "https://$DOMAIN/pb/api/collections/politicians/records?page=1&perPage=1" 2>&1)
if echo "$POLITICIANS_RESPONSE" | grep -q "<!DOCTYPE\|<html"; then
    echo -e "   ${RED}❌ Politicians endpoint returned HTML (nginx proxy broken)${NC}"
    echo "   Response: $POLITICIANS_RESPONSE"
    exit 1
fi

TOTAL_ITEMS=$(echo "$POLITICIANS_RESPONSE" | grep -o '"totalItems":[0-9]*' | cut -d: -f2 || echo "0")
if [ "$TOTAL_ITEMS" = "0" ]; then
    echo -e "   ${RED}❌ Politicians collection returns 0 records${NC}"
    echo "   Response: $POLITICIANS_RESPONSE"
    echo ""
    echo "   Troubleshooting:"
    echo "   1. Check collection rules in database"
    echo "   2. Verify PocketBase service is running"
    echo "   3. Check PocketBase logs"
    exit 1
else
    echo -e "   ${GREEN}✅ Politicians collection returns $TOTAL_ITEMS records${NC}"
    echo "   Response preview:"
    echo "$POLITICIANS_RESPONSE" | head -c 200
    echo "..."
fi
echo ""

# Test 3: Local PocketBase (if on VPS)
if command -v curl > /dev/null 2>&1 && curl -sf "http://127.0.0.1:$PB_PORT/api/health" > /dev/null 2>&1; then
    echo "3️⃣ Testing local PocketBase (127.0.0.1:$PB_PORT)..."
    LOCAL_RESPONSE=$(curl -sS "http://127.0.0.1:$PB_PORT/api/collections/politicians/records?page=1&perPage=1" 2>&1)
    LOCAL_TOTAL=$(echo "$LOCAL_RESPONSE" | grep -o '"totalItems":[0-9]*' | cut -d: -f2 || echo "0")
    if [ "$LOCAL_TOTAL" = "0" ]; then
        echo -e "   ${YELLOW}⚠️  Local endpoint returns 0 records${NC}"
    else
        echo -e "   ${GREEN}✅ Local endpoint returns $LOCAL_TOTAL records${NC}"
    fi
    echo ""
fi

echo "=================================================="
echo -e "${GREEN}✅ Verification complete!${NC}"
echo ""
echo "Summary:"
echo "  - HTTPS health endpoint: ✅ Working"
echo "  - HTTPS politicians endpoint: ✅ Returns $TOTAL_ITEMS records"
echo ""
echo "Public API is accessible and returning data."
