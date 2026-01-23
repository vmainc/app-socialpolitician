#!/bin/bash
# Apply Nginx fix for PocketBase file serving
# This fixes the 404 errors for /pb/api/files/ URLs

set -e

NGINX_CONFIG="/etc/nginx/sites-available/app.socialpolitician.com.conf"
BACKUP="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Fixing Nginx for PocketBase File Serving"
echo "==========================================="
echo ""

if [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ Nginx config not found: $NGINX_CONFIG"
    exit 1
fi

# Backup
sudo cp "$NGINX_CONFIG" "$BACKUP"
echo "✅ Backed up to: $BACKUP"
echo ""

# Check current state
echo "📋 Current configuration:"
if grep -q "location ~\* \^\(?!/pb/\)" "$NGINX_CONFIG"; then
    echo "   ✅ Static files regex already excludes /pb/ paths"
    NEEDS_FIX=false
else
    echo "   ⚠️  Static files regex does NOT exclude /pb/ paths"
    NEEDS_FIX=true
fi

# Check /pb/ location block
if grep -q "location /pb/" "$NGINX_CONFIG"; then
    echo "   ✅ /pb/ location block exists"
else
    echo "   ❌ /pb/ location block NOT found"
    echo "   This is a critical issue!"
    exit 1
fi
echo ""

if [ "$NEEDS_FIX" = true ]; then
    echo "🔧 Applying fix..."
    
    # Use sed to update the static files regex
    # Pattern: location ~* \.(jpg|jpeg|png|...)$
    # Replace with: location ~* ^(?!/pb/).*\.(jpg|jpeg|png|...)$
    
    sudo sed -i.tmp \
        -e 's|location ~\* \\.\(\(jpg\|jpeg\|png\|gif\|ico\|css\|js\|svg\|woff\|woff2\|ttf\|eot\|webp\)\)$|location ~* ^(?!/pb/).*\\.(\\1)$|' \
        "$NGINX_CONFIG"
    
    if [ $? -eq 0 ]; then
        echo "✅ Updated static files regex"
    else
        echo "⚠️  sed update failed, trying Python method..."
        
        # Fallback to Python
        sudo python3 << 'PYTHON'
import re
import sys

config_path = sys.argv[1]

with open(config_path, 'r') as f:
    content = f.read()

# Pattern to match: location ~* \.(jpg|jpeg|...)$
pattern = r'location ~\* \\\.\(([^)]+)\)\$'

def replace_func(match):
    extensions = match.group(1)
    return f'location ~* ^(?!/pb/).*\\.({extensions})$'

new_content = re.sub(pattern, replace_func, content)

if new_content != content:
    with open(config_path, 'w') as f:
        f.write(new_content)
    print("✅ Updated via Python")
else:
    print("⚠️  No changes made - pattern might be different")
    print("   Current static files location:")
    for line in content.split('\n'):
        if 'location ~*' in line and '\.(' in line:
            print(f"   {line.strip()}")

PYTHON
        "$NGINX_CONFIG"
    fi
    echo ""
fi

# Verify nginx config
echo "🔍 Testing nginx configuration..."
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo "✅ Nginx config is valid"
    echo ""
    echo "🔄 Reloading nginx..."
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded"
else
    echo "❌ Nginx config has errors!"
    sudo nginx -t
    echo ""
    echo "⚠️  Restoring backup..."
    sudo cp "$BACKUP" "$NGINX_CONFIG"
    exit 1
fi

echo ""
echo "✅ Fix applied successfully!"
echo ""
echo "🧪 Test the fix:"
echo "   curl -I https://app.socialpolitician.com/pb/api/files/pbc_3830222512/test/test.jpg"
echo "   (Should return 401/403, NOT 404)"
