#!/bin/bash
# SSL Discovery Script - Run on VPS to inspect current SSL setup
# This script discovers the current SSL configuration for both domains

set -e

echo "🔍 SSL Configuration Discovery"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. DNS Check
echo "1️⃣ DNS Configuration"
echo "-------------------"
PRESIDENTS_IP=$(dig +short presidents.socialpolitician.com)
APP_IP=$(dig +short app.socialpolitician.com)
VPS_IP=$(curl -s ifconfig.me 2>/dev/null || echo "UNKNOWN")

echo "   presidents.socialpolitician.com → $PRESIDENTS_IP"
echo "   app.socialpolitician.com → $APP_IP"
echo "   VPS Public IP → $VPS_IP"

if [ "$PRESIDENTS_IP" = "$APP_IP" ] && [ "$APP_IP" = "$VPS_IP" ]; then
    echo -e "   ${GREEN}✅ DNS correctly points to VPS${NC}"
else
    echo -e "   ${RED}❌ DNS mismatch detected${NC}"
fi
echo ""

# 2. Nginx Config Files
echo "2️⃣ Nginx Configuration Files"
echo "----------------------------"
PRESIDENTS_CONFIG="/etc/nginx/sites-available/presidents.socialpolitician.com.conf"
APP_CONFIG="/etc/nginx/sites-available/app.socialpolitician.com.conf"

if [ -f "$PRESIDENTS_CONFIG" ]; then
    echo -e "   ${GREEN}✅ Found: $PRESIDENTS_CONFIG${NC}"
    if [ -L "/etc/nginx/sites-enabled/presidents.socialpolitician.com.conf" ]; then
        echo -e "   ${GREEN}✅ Enabled${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Not enabled${NC}"
    fi
else
    echo -e "   ${RED}❌ Missing: $PRESIDENTS_CONFIG${NC}"
fi

if [ -f "$APP_CONFIG" ]; then
    echo -e "   ${GREEN}✅ Found: $APP_CONFIG${NC}"
    if [ -L "/etc/nginx/sites-enabled/app.socialpolitician.com.conf" ]; then
        echo -e "   ${GREEN}✅ Enabled${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Not enabled${NC}"
fi
else
    echo -e "   ${RED}❌ Missing: $APP_CONFIG${NC}"
fi
echo ""

# 3. Show Presidents Config (Working SSL)
echo "3️⃣ Presidents Domain Config (Working SSL Reference)"
echo "---------------------------------------------------"
if [ -f "$PRESIDENTS_CONFIG" ]; then
    echo "   File: $PRESIDENTS_CONFIG"
    echo "   Content:"
    echo "   ──────────────────────────────────────────────────────────"
    sudo cat "$PRESIDENTS_CONFIG" | sed 's/^/   /'
    echo "   ──────────────────────────────────────────────────────────"
else
    echo -e "   ${RED}❌ Config file not found${NC}"
fi
echo ""

# 4. Show App Config (To Compare)
echo "4️⃣ App Domain Config (Current State)"
echo "------------------------------------"
if [ -f "$APP_CONFIG" ]; then
    echo "   File: $APP_CONFIG"
    echo "   Content:"
    echo "   ──────────────────────────────────────────────────────────"
    sudo cat "$APP_CONFIG" | sed 's/^/   /'
    echo "   ──────────────────────────────────────────────────────────"
else
    echo -e "   ${RED}❌ Config file not found${NC}"
fi
echo ""

# 5. Certificate Status
echo "5️⃣ SSL Certificate Status"
echo "-------------------------"
if command -v certbot > /dev/null; then
    echo "   Certificates:"
    sudo certbot certificates 2>/dev/null | grep -A 10 "presidents.socialpolitician.com\|app.socialpolitician.com" || echo "   No certificates found"
else
    echo -e "   ${YELLOW}⚠️  Certbot not installed${NC}"
fi
echo ""

# 6. Certificate Files
echo "6️⃣ Certificate Files on Disk"
echo "-----------------------------"
PRESIDENTS_CERT="/etc/letsencrypt/live/presidents.socialpolitician.com/fullchain.pem"
APP_CERT="/etc/letsencrypt/live/app.socialpolitician.com/fullchain.pem"

if [ -f "$PRESIDENTS_CERT" ]; then
    echo -e "   ${GREEN}✅ Presidents cert: $PRESIDENTS_CERT${NC}"
    PRESIDENTS_EXPIRY=$(sudo openssl x509 -enddate -noout -in "$PRESIDENTS_CERT" 2>/dev/null | cut -d= -f2)
    echo "      Expires: $PRESIDENTS_EXPIRY"
else
    echo -e "   ${RED}❌ Presidents cert not found${NC}"
fi

if [ -f "$APP_CERT" ]; then
    echo -e "   ${GREEN}✅ App cert: $APP_CERT${NC}"
    APP_EXPIRY=$(sudo openssl x509 -enddate -noout -in "$APP_CERT" 2>/dev/null | cut -d= -f2)
    echo "      Expires: $APP_EXPIRY"
else
    echo -e "   ${RED}❌ App cert not found${NC}"
fi
echo ""

# 7. Nginx Status
echo "7️⃣ Nginx Service Status"
echo "----------------------"
if systemctl is-active --quiet nginx; then
    echo -e "   ${GREEN}✅ Nginx is running${NC}"
else
    echo -e "   ${RED}❌ Nginx is not running${NC}"
fi

if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo -e "   ${GREEN}✅ Nginx config is valid${NC}"
else
    echo -e "   ${RED}❌ Nginx config has errors:${NC}"
    sudo nginx -t 2>&1 | grep -i error | sed 's/^/      /'
fi
echo ""

# 8. Port Status
echo "8️⃣ Port Status"
echo "-------------"
if sudo netstat -tlnp 2>/dev/null | grep -q ":80 "; then
    echo -e "   ${GREEN}✅ Port 80 is listening${NC}"
else
    echo -e "   ${YELLOW}⚠️  Port 80 not listening${NC}"
fi

if sudo netstat -tlnp 2>/dev/null | grep -q ":443 "; then
    echo -e "   ${GREEN}✅ Port 443 is listening${NC}"
else
    echo -e "   ${YELLOW}⚠️  Port 443 not listening${NC}"
fi
echo ""

# 9. HTTP/HTTPS Test
echo "9️⃣ HTTP/HTTPS Connectivity Test"
echo "--------------------------------"
echo "   Testing presidents.socialpolitician.com:"
PRESIDENTS_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://presidents.socialpolitician.com 2>/dev/null || echo "FAILED")
PRESIDENTS_HTTPS=$(curl -s -o /dev/null -w "%{http_code}" https://presidents.socialpolitician.com 2>/dev/null || echo "FAILED")
echo "      HTTP: $PRESIDENTS_HTTP"
echo "      HTTPS: $PRESIDENTS_HTTPS"

echo "   Testing app.socialpolitician.com:"
APP_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://app.socialpolitician.com 2>/dev/null || echo "FAILED")
APP_HTTPS=$(curl -s -o /dev/null -w "%{http_code}" https://app.socialpolitician.com 2>/dev/null || echo "FAILED")
echo "      HTTP: $APP_HTTP"
echo "      HTTPS: $APP_HTTPS"
echo ""

# 10. Summary
echo "📊 Summary"
echo "=========="
echo ""
echo "DNS:"
echo "  - Both domains point to: $VPS_IP"
echo ""
echo "Configs:"
if [ -f "$PRESIDENTS_CONFIG" ]; then
    echo "  ✅ Presidents config exists"
else
    echo "  ❌ Presidents config missing"
fi
if [ -f "$APP_CONFIG" ]; then
    echo "  ✅ App config exists"
else
    echo "  ❌ App config missing"
fi
echo ""
echo "Certificates:"
if [ -f "$PRESIDENTS_CERT" ]; then
    echo "  ✅ Presidents certificate exists"
else
    echo "  ❌ Presidents certificate missing"
fi
if [ -f "$APP_CERT" ]; then
    echo "  ✅ App certificate exists"
else
    echo "  ❌ App certificate missing"
fi
echo ""
echo "Connectivity:"
echo "  Presidents: HTTP=$PRESIDENTS_HTTP, HTTPS=$PRESIDENTS_HTTPS"
echo "  App: HTTP=$APP_HTTP, HTTPS=$APP_HTTPS"
echo ""
