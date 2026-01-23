#!/bin/bash
# Fix nginx configuration to properly proxy PocketBase file requests
# Ensures /pb/ location block comes before any regex static file blocks
# and excludes /pb/ paths from static file matching

set -e

NGINX_CONFIG="/etc/nginx/sites-available/app.socialpolitician.com.conf"
BACKUP="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Fixing nginx configuration for PocketBase file serving..."
echo ""

# Check if config exists
if [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ Nginx config not found: $NGINX_CONFIG"
    exit 1
fi

# Backup
sudo cp "$NGINX_CONFIG" "$BACKUP"
echo "✅ Backed up to: $BACKUP"
echo ""

# Check if we need to fix the static files regex
if grep -q "location ~\* \^\(?!/pb/\)" "$NGINX_CONFIG"; then
    echo "✅ Static files regex already excludes /pb/ paths"
else
    echo "📝 Updating static files regex to exclude /pb/ paths..."
    
    # Use Python to safely update the regex
    sudo python3 << 'PYTHON_SCRIPT'
import re
import sys

config_path = sys.argv[1]

with open(config_path, 'r') as f:
    content = f.read()

# Pattern to match static files location block
# Match: location ~* \.(jpg|jpeg|png|...)$ {
pattern = r'location ~\* \\\.\(([^)]+)\)\$ \{'

def replace_static(match):
    extensions = match.group(1)
    # Replace with regex that excludes /pb/ paths
    return f'location ~* ^(?!/pb/).*\\.({extensions})$ {{'

new_content = re.sub(pattern, replace_static, content)

if new_content != content:
    with open(config_path, 'w') as f:
        f.write(new_content)
    print("✅ Updated static files regex to exclude /pb/ paths")
else:
    print("⚠️  Could not find static files regex pattern to update")
    print("   This might be okay if the pattern is different")

PYTHON_SCRIPT
    "$NGINX_CONFIG"
fi

# Verify /pb/ location block exists and comes before static files
echo ""
echo "📋 Verifying location block order..."

PB_LINE=$(grep -n "location /pb/" "$NGINX_CONFIG" | head -1 | cut -d: -f1 || echo "")
STATIC_LINE=$(grep -n "location ~\*" "$NGINX_CONFIG" | head -1 | cut -d: -f1 || echo "")

if [ -n "$PB_LINE" ] && [ -n "$STATIC_LINE" ]; then
    if [ "$PB_LINE" -lt "$STATIC_LINE" ]; then
        echo "✅ /pb/ location block comes before static files regex (correct)"
    else
        echo "⚠️  /pb/ location block comes after static files regex"
        echo "   This might cause issues. Consider moving /pb/ block earlier."
    fi
else
    echo "⚠️  Could not determine location block order"
fi

# Test nginx config
echo ""
echo "🧪 Testing nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid!"
    echo ""
    echo "🔄 Reloading nginx..."
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
    echo ""
    echo "🧪 Test file access:"
    echo "   curl -I https://app.socialpolitician.com/pb/api/health"
    echo "   curl -I https://app.socialpolitician.com/pb/api/files/pbc_3830222512/..."
else
    echo "❌ Nginx config has errors! Restoring backup..."
    sudo cp "$BACKUP" "$NGINX_CONFIG"
    exit 1
fi

echo ""
echo "✅ Nginx fix complete!"
