#!/bin/bash
# Quick SSL diagnostic - run on VPS

echo "🔍 SSL Diagnostic for app.socialpolitician.com"
echo "=============================================="
echo ""

# Check DNS
echo "1. DNS Check:"
DNS_IP=$(dig +short app.socialpolitician.com 2>/dev/null || echo "FAILED")
VPS_IP=$(curl -s ifconfig.me 2>/dev/null || echo "UNKNOWN")
echo "   DNS points to: $DNS_IP"
echo "   VPS IP is: $VPS_IP"
if [ "$DNS_IP" = "$VPS_IP" ]; then
    echo "   ✅ DNS matches VPS IP"
else
    echo "   ❌ DNS mismatch - fix DNS A record"
fi
echo ""

# Check Nginx config
echo "2. Nginx Config:"
if [ -f "/etc/nginx/sites-available/app.socialpolitician.com.conf" ]; then
    echo "   ✅ Config file exists"
    if [ -L "/etc/nginx/sites-enabled/app.socialpolitician.com.conf" ]; then
        echo "   ✅ Config is enabled"
    else
        echo "   ❌ Config not enabled - run: sudo ln -sf /etc/nginx/sites-available/app.socialpolitician.com.conf /etc/nginx/sites-enabled/"
    fi
else
    echo "   ❌ Config file missing - create it first"
fi
echo ""

# Check Nginx status
echo "3. Nginx Status:"
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Config is valid"
else
    echo "   ❌ Config has errors:"
    sudo nginx -t 2>&1 | grep -i error
fi

if systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx is running"
else
    echo "   ❌ Nginx not running - run: sudo systemctl start nginx"
fi
echo ""

# Check ports
echo "4. Port Check:"
if sudo netstat -tlnp 2>/dev/null | grep -q ":80 "; then
    echo "   ✅ Port 80 is listening"
else
    echo "   ❌ Port 80 not listening"
fi

if sudo netstat -tlnp 2>/dev/null | grep -q ":443 "; then
    echo "   ✅ Port 443 is listening"
else
    echo "   ⚠️  Port 443 not listening (SSL not set up yet)"
fi
echo ""

# Check firewall
echo "5. Firewall Check:"
if command -v ufw > /dev/null; then
    UFW_STATUS=$(sudo ufw status 2>/dev/null | head -1)
    echo "   $UFW_STATUS"
    if echo "$UFW_STATUS" | grep -q "inactive"; then
        echo "   ⚠️  Firewall is inactive (may be OK)"
    fi
else
    echo "   ⚠️  UFW not installed (check other firewall)"
fi
echo ""

# Check certbot
echo "6. Certbot Check:"
if command -v certbot > /dev/null; then
    echo "   ✅ Certbot is installed"
    
    # Check existing certificates
    CERT=$(sudo certbot certificates 2>/dev/null | grep -A 5 "app.socialpolitician.com" || echo "NONE")
    if echo "$CERT" | grep -q "app.socialpolitician.com"; then
        echo "   ✅ Certificate exists"
        echo "$CERT" | head -3
    else
        echo "   ❌ No certificate found - need to run certbot"
    fi
else
    echo "   ❌ Certbot not installed - run: sudo apt-get install certbot python3-certbot-nginx"
fi
echo ""

# Test HTTP
echo "7. HTTP Test:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://app.socialpolitician.com 2>/dev/null || echo "FAILED")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "   ✅ HTTP works (code: $HTTP_CODE)"
else
    echo "   ❌ HTTP failed (code: $HTTP_CODE)"
fi
echo ""

# Test HTTPS
echo "8. HTTPS Test:"
HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://app.socialpolitician.com 2>/dev/null || echo "FAILED")
if [ "$HTTPS_CODE" = "200" ]; then
    echo "   ✅ HTTPS works!"
elif [ "$HTTPS_CODE" = "FAILED" ]; then
    echo "   ❌ HTTPS failed - SSL not set up"
else
    echo "   ⚠️  HTTPS returned code: $HTTPS_CODE"
fi
echo ""

echo "=============================================="
echo "Summary:"
echo ""

if [ "$DNS_IP" = "$VPS_IP" ] && [ -f "/etc/nginx/sites-available/app.socialpolitician.com.conf" ] && [ "$HTTPS_CODE" = "200" ]; then
    echo "✅ Everything looks good! SSL should be working."
elif [ "$HTTPS_CODE" != "200" ]; then
    echo "❌ SSL not working. Next steps:"
    echo ""
    echo "   1. Make sure DNS points to VPS: $VPS_IP"
    echo "   2. Make sure Nginx config exists and is enabled"
    echo "   3. Run: sudo certbot --nginx -d app.socialpolitician.com"
else
    echo "⚠️  Some issues found. Fix the items marked with ❌ above."
fi
