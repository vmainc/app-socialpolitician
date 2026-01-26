#!/bin/bash
# Troubleshoot PocketBase 502 errors
# Run on VPS: cd /var/www/socialpolitician-app && bash troubleshoot-pocketbase.sh

echo "🔍 Troubleshooting PocketBase 502 Error"
echo ""

# Check if PocketBase service exists
echo "1️⃣ Checking PocketBase service..."
if systemctl list-unit-files | grep -q "socialpolitician-app-pocketbase"; then
    echo "   ✅ Service file exists"
    sudo systemctl status socialpolitician-app-pocketbase.service --no-pager -l || echo "   ⚠️  Service status check failed"
else
    echo "   ❌ Service file NOT found"
    echo "   Expected: /etc/systemd/system/socialpolitician-app-pocketbase.service"
fi

echo ""
echo "2️⃣ Checking if PocketBase is listening on port 8091..."
if netstat -tlnp 2>/dev/null | grep -q ":8091" || ss -tlnp 2>/dev/null | grep -q ":8091"; then
    echo "   ✅ Port 8091 is in use"
    netstat -tlnp 2>/dev/null | grep ":8091" || ss -tlnp 2>/dev/null | grep ":8091"
else
    echo "   ❌ Port 8091 is NOT in use - PocketBase is not running"
fi

echo ""
echo "3️⃣ Testing direct connection to PocketBase..."
if curl -f -s http://127.0.0.1:8091/api/health >/dev/null 2>&1; then
    echo "   ✅ PocketBase responds on localhost:8091"
    curl -s http://127.0.0.1:8091/api/health | head -c 200
    echo ""
else
    echo "   ❌ PocketBase does NOT respond on localhost:8091"
    echo "   This is the root cause of the 502 error"
fi

echo ""
echo "4️⃣ Checking nginx configuration..."
if [ -f /etc/nginx/sites-available/app.socialpolitician.com ]; then
    echo "   ✅ Nginx config file exists"
    if grep -q "location /pb/" /etc/nginx/sites-available/app.socialpolitician.com; then
        echo "   ✅ /pb/ location block found"
    else
        echo "   ❌ /pb/ location block NOT found in nginx config"
    fi
else
    echo "   ⚠️  Nginx config file not found at expected location"
fi

echo ""
echo "5️⃣ Testing nginx proxy..."
if curl -f -s https://app.socialpolitician.com/pb/api/health >/dev/null 2>&1; then
    echo "   ✅ Nginx proxy works"
else
    echo "   ❌ Nginx proxy returns error (502 Bad Gateway)"
    echo "   This confirms PocketBase backend is not responding"
fi

echo ""
echo "6️⃣ Recent PocketBase service logs (last 20 lines)..."
sudo journalctl -u socialpolitician-app-pocketbase.service -n 20 --no-pager 2>/dev/null || echo "   ⚠️  Could not read logs"

echo ""
echo "📋 Recommended Actions:"
echo ""
echo "If PocketBase service is not running:"
echo "   sudo systemctl start socialpolitician-app-pocketbase.service"
echo "   sudo systemctl enable socialpolitician-app-pocketbase.service"
echo ""
echo "If service exists but won't start, check logs:"
echo "   sudo journalctl -u socialpolitician-app-pocketbase.service -f"
echo ""
echo "If PocketBase binary is missing:"
echo "   Check: /var/www/socialpolitician-app/pocketbase/pb"
echo "   Or: /var/www/socialpolitician-app/pb_linux/pocketbase"
echo ""
echo "To restart everything:"
echo "   sudo systemctl restart socialpolitician-app-pocketbase.service"
echo "   sudo systemctl reload nginx"
