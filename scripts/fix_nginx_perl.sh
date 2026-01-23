#!/bin/bash
# Reliable Nginx fix using perl for regex replacement

set -e

NGINX_CONFIG="/etc/nginx/sites-available/app.socialpolitician.com.conf"
BACKUP="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Nginx Fix (Perl Method)"
echo "==========================="
echo ""

if [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ Config not found: $NGINX_CONFIG"
    exit 1
fi

# Backup
sudo cp "$NGINX_CONFIG" "$BACKUP"
echo "✅ Backed up to: $BACKUP"
echo ""

# Fix 1: Ensure /pb/ uses ^~ prefix
if ! grep -q "location ^~ /pb/" "$NGINX_CONFIG"; then
    echo "📝 Updating /pb/ to use ^~ prefix..."
    sudo sed -i 's|location /pb/|location ^~ /pb/|' "$NGINX_CONFIG"
    echo "   ✅ Updated"
else
    echo "✅ /pb/ already uses ^~ prefix"
fi

# Fix 2: Update static files regex using perl
echo ""
echo "📝 Updating static files regex to exclude /pb/ paths..."

# Check if already fixed
if grep -q "location ~\* \^\(?!/pb/\)" "$NGINX_CONFIG"; then
    echo "   ✅ Already fixed"
else
    # Use perl for reliable regex replacement
    sudo perl -i -pe 's|location ~\* \\\.\(([^)]+)\)\$ \{|location ~* ^(?!/pb/).*\\.($1)$ {|' "$NGINX_CONFIG"
    
    # Verify
    if grep -q "location ~\* \^\(?!/pb/\)" "$NGINX_CONFIG"; then
        echo "   ✅ Updated successfully"
        echo "   New pattern: location ~* ^(?!/pb/).*\\.(jpg|jpeg|...)$"
    else
        echo "   ⚠️  Update may have failed"
        echo "   Current static files location:"
        grep "location ~\*" "$NGINX_CONFIG" | head -1
    fi
fi

# Test config
echo ""
echo "🧪 Testing nginx configuration..."
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo "✅ Nginx config is valid"
    echo ""
    echo "🔄 Reloading nginx..."
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded"
    
    echo ""
    echo "🧪 Testing file endpoint..."
    sleep 1
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        "https://app.socialpolitician.com/pb/api/files/pbc_3830222512/hds7dmw5jo4m045/bob_casey_jr_hhq9ccfzz8.jpg" 2>&1 || echo "000")
    
    if [ "$RESPONSE" = "404" ]; then
        echo "   ❌ Still returning 404"
        echo ""
        echo "📋 Current static files location block:"
        grep -A 2 "location ~\*" "$NGINX_CONFIG" | head -3
        echo ""
        echo "📋 /pb/ location block:"
        grep -A 2 "location.*\/pb\/" "$NGINX_CONFIG" | head -3
    elif [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "403" ] || [ "$RESPONSE" = "200" ]; then
        echo "   ✅ Returns $RESPONSE (routing works!)"
        echo ""
        echo "🎉 Photos should now load in the browser!"
    else
        echo "   ⚠️  Returns HTTP $RESPONSE"
    fi
else
    echo "❌ Nginx config has errors!"
    sudo nginx -t
    echo ""
    echo "⚠️  Restoring backup..."
    sudo cp "$BACKUP" "$NGINX_CONFIG"
    exit 1
fi

echo ""
echo "✅ Fix complete!"
