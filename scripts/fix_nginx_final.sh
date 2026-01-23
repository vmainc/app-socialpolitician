#!/bin/bash
# Final fix for Nginx - use ^~ prefix for /pb/ and exclude /pb/ from static files

set -e

NGINX_CONFIG="/etc/nginx/sites-available/app.socialpolitician.com.conf"
BACKUP="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Final Nginx Fix"
echo "=================="
echo ""

if [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ Config not found: $NGINX_CONFIG"
    exit 1
fi

# Backup
sudo cp "$NGINX_CONFIG" "$BACKUP"
echo "✅ Backed up to: $BACKUP"
echo ""

# Fix 1: Change /pb/ to use ^~ (highest priority prefix match)
echo "📝 Fix 1: Updating /pb/ location to use ^~ prefix..."
if grep -q "location ^~ /pb/" "$NGINX_CONFIG"; then
    echo "   ✅ Already uses ^~ prefix"
else
    sudo sed -i 's|location /pb/|location ^~ /pb/|' "$NGINX_CONFIG"
    echo "   ✅ Updated to: location ^~ /pb/"
fi

# Fix 2: Update static files regex to exclude /pb/ paths
echo ""
echo "📝 Fix 2: Updating static files regex to exclude /pb/ paths..."

sudo python3 << 'PYTHON'
import re
import sys

config_path = sys.argv[1]

with open(config_path, 'r') as f:
    content = f.read()

original = content

# Pattern: location ~* \.(jpg|jpeg|png|...)$
# Replace: location ~* ^(?!/pb/).*\.(jpg|jpeg|png|...)$

# Find the pattern
pattern = r'location ~\* \\\.\(([^)]+)\)\$ \{'

def replace_func(match):
    extensions = match.group(1)
    return f'location ~* ^(?!/pb/).*\\.({extensions})$ {{'

new_content = re.sub(pattern, replace_func, content)

if new_content != original:
    with open(config_path, 'w') as f:
        f.write(new_content)
    print("   ✅ Updated static files regex")
    print("   From: location ~* \\.(jpg|jpeg|...)$")
    print("   To:   location ~* ^(?!/pb/).*\\.(jpg|jpeg|...)$")
else:
    # Check if already fixed
    if '^(?!/pb/)' in content:
        print("   ✅ Already fixed")
    else:
        print("   ⚠️  Pattern not found - showing current line:")
        for line in content.split('\n'):
            if 'location ~*' in line and '\.(' in line:
                print(f"   {line.strip()}")

PYTHON
"$NGINX_CONFIG"

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
        echo "📋 Current config (showing relevant lines):"
        sudo grep -n "location" "$NGINX_CONFIG" | grep -E "(pb|~)" | head -5
    elif [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "403" ] || [ "$RESPONSE" = "200" ]; then
        echo "   ✅ Returns $RESPONSE (routing works!)"
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
