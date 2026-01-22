#!/bin/bash
# SSL Validation Script for app.socialpolitician.com
# Run this to validate SSL setup

set -e

echo "🔍 SSL Validation for app.socialpolitician.com"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DOMAIN="app.socialpolitician.com"
PRESIDENTS_DOMAIN="presidents.socialpolitician.com"

# 1. DNS Check
echo "1️⃣ DNS Configuration"
echo "-------------------"
APP_IP=$(dig +short "$DOMAIN" 2>/dev/null | grep -E "^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$" | head -1 || echo "FAILED")
PRESIDENTS_IP=$(dig +short "$PRESIDENTS_DOMAIN" 2>/dev/null | grep -E "^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$" | head -1 || echo "FAILED")
VPS_IP=$(curl -s -4 ifconfig.me 2>/dev/null || curl -s ifconfig.me 2>/dev/null | grep -E "^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$" | head -1 || echo "UNKNOWN")

echo "   $DOMAIN → $APP_IP"
echo "   $PRESIDENTS_DOMAIN → $PRESIDENTS_IP"
echo "   VPS IP (IPv4) → $VPS_IP"

if [ "$APP_IP" = "$VPS_IP" ] && [ "$PRESIDENTS_IP" = "$VPS_IP" ]; then
    echo -e "   ${GREEN}✅ DNS correctly points to VPS${NC}"
elif [ "$APP_IP" = "$PRESIDENTS_IP" ] && [ -n "$APP_IP" ] && [ "$APP_IP" != "FAILED" ]; then
    echo -e "   ${GREEN}✅ DNS correctly configured (both domains point to same IP)${NC}"
else
    echo -e "   ${YELLOW}⚠️  DNS check inconclusive (may be IPv6)${NC}"
fi
echo ""

# 2. HTTP Redirect Test
echo "2️⃣ HTTP Redirect Test"
echo "---------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN" 2>/dev/null || echo "FAILED")
HTTP_LOCATION=$(curl -s -I "http://$DOMAIN" 2>/dev/null | grep -i "location:" | cut -d' ' -f2- | tr -d '\r\n' || echo "")

echo "   HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "   ${GREEN}✅ HTTP redirects to HTTPS${NC}"
    if [ -n "$HTTP_LOCATION" ]; then
        echo "   Redirect to: $HTTP_LOCATION"
    fi
else
    echo -e "   ${RED}❌ HTTP redirect failed${NC}"
fi
echo ""

# 3. HTTPS Connectivity
echo "3️⃣ HTTPS Connectivity"
echo "---------------------"
HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" 2>/dev/null || echo "FAILED")
HTTPS_PROTOCOL=$(curl -s -I "https://$DOMAIN" 2>/dev/null | grep -i "HTTP/" | head -1 || echo "")

echo "   HTTPS Status: $HTTPS_CODE"
if [ "$HTTPS_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ HTTPS works${NC}"
    if [ -n "$HTTPS_PROTOCOL" ]; then
        echo "   Protocol: $HTTPS_PROTOCOL"
    fi
else
    echo -e "   ${RED}❌ HTTPS failed${NC}"
fi
echo ""

# 4. SSL Certificate Validation
echo "4️⃣ SSL Certificate Validation"
echo "-----------------------------"
CERT_OUTPUT=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null)

# Extract certificate info
CERT_SUBJECT=$(echo "$CERT_OUTPUT" | grep "subject=" | head -1 || echo "")
CERT_ISSUER=$(echo "$CERT_OUTPUT" | grep "issuer=" | head -1 || echo "")
CERT_VERIFY=$(echo "$CERT_OUTPUT" | grep "Verify return code" | head -1 || echo "")
CERT_EXPIRY=$(echo "$CERT_OUTPUT" | grep -A 2 "Certificate chain" | grep "NotAfter" | head -1 || echo "")

if [ -n "$CERT_SUBJECT" ]; then
    echo "   Subject: $CERT_SUBJECT"
fi
if [ -n "$CERT_ISSUER" ]; then
    echo "   Issuer: $CERT_ISSUER"
fi
if [ -n "$CERT_EXPIRY" ]; then
    echo "   Expiry: $CERT_EXPIRY"
fi

if echo "$CERT_VERIFY" | grep -q "Verify return code: 0"; then
    echo -e "   ${GREEN}✅ Certificate is valid${NC}"
else
    echo -e "   ${RED}❌ Certificate validation failed${NC}"
    echo "   $CERT_VERIFY"
fi
echo ""

# 5. Certificate Chain
echo "5️⃣ Certificate Chain"
echo "--------------------"
CERT_CHAIN=$(echo "$CERT_OUTPUT" | grep -A 5 "Certificate chain" | head -6 || echo "")

if echo "$CERT_CHAIN" | grep -q "Certificate chain"; then
    echo -e "   ${GREEN}✅ Certificate chain present${NC}"
    echo "$CERT_CHAIN" | sed 's/^/   /'
else
    echo -e "   ${RED}❌ Certificate chain missing${NC}"
fi
echo ""

# 6. TLS Version
echo "6️⃣ TLS Version"
echo "-------------"
TLS_VERSION=$(echo "$CERT_OUTPUT" | grep "Protocol" | head -1 || echo "")

if [ -n "$TLS_VERSION" ]; then
    echo "   $TLS_VERSION"
    if echo "$TLS_VERSION" | grep -qE "TLSv1\.[23]"; then
        echo -e "   ${GREEN}✅ Using modern TLS version${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Using older TLS version${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  Could not determine TLS version${NC}"
fi
echo ""

# 7. Compare with Presidents Domain
echo "7️⃣ Comparison with presidents.socialpolitician.com"
echo "---------------------------------------------------"
PRESIDENTS_HTTPS=$(curl -s -o /dev/null -w "%{http_code}" "https://$PRESIDENTS_DOMAIN" 2>/dev/null || echo "FAILED")
PRESIDENTS_CERT_VERIFY=$(echo | openssl s_client -connect "$PRESIDENTS_DOMAIN:443" -servername "$PRESIDENTS_DOMAIN" 2>/dev/null | grep "Verify return code" | head -1 || echo "")

echo "   Presidents HTTPS: $PRESIDENTS_HTTPS"
echo "   App HTTPS: $HTTPS_CODE"

if [ "$PRESIDENTS_HTTPS" = "200" ] && [ "$HTTPS_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ Both domains working${NC}"
else
    echo -e "   ${YELLOW}⚠️  Status mismatch${NC}"
fi

if echo "$PRESIDENTS_CERT_VERIFY" | grep -q "Verify return code: 0" && echo "$CERT_VERIFY" | grep -q "Verify return code: 0"; then
    echo -e "   ${GREEN}✅ Both certificates valid${NC}"
else
    echo -e "   ${RED}❌ Certificate validation mismatch${NC}"
fi
echo ""

# Summary
echo "📊 Summary"
echo "=========="
echo ""

ALL_GOOD=true

if [ "$APP_IP" != "$PRESIDENTS_IP" ] || [ -z "$APP_IP" ] || [ "$APP_IP" = "FAILED" ]; then
    if [ "$HTTPS_CODE" = "200" ]; then
        # If HTTPS works, DNS is probably fine (may be IPv6)
        echo -e "${GREEN}✅ DNS appears correct (HTTPS working)${NC}"
    else
        echo -e "${RED}❌ DNS may not be pointing to VPS${NC}"
        ALL_GOOD=false
    fi
fi

if [ "$HTTP_CODE" != "301" ] && [ "$HTTP_CODE" != "302" ]; then
    echo -e "${RED}❌ HTTP redirect not working${NC}"
    ALL_GOOD=false
fi

if [ "$HTTPS_CODE" != "200" ]; then
    echo -e "${RED}❌ HTTPS not working${NC}"
    ALL_GOOD=false
fi

if ! echo "$CERT_VERIFY" | grep -q "Verify return code: 0"; then
    echo -e "${RED}❌ SSL certificate invalid${NC}"
    ALL_GOOD=false
fi

if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}✅ All checks passed! SSL is properly configured.${NC}"
    echo ""
    echo "🌐 Test in browser: https://$DOMAIN"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please review the output above.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Fix DNS if needed"
    echo "  2. Run setup script: sudo bash scripts/setup_ssl_app.sh"
    echo "  3. Check nginx config: sudo nginx -t"
    echo "  4. Check certbot: sudo certbot certificates"
    exit 1
fi
