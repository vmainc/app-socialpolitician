#!/bin/bash
# Fix nginx to properly proxy PocketBase file requests
# The issue: regex location block for static files is catching /pb/api/files/ requests

set -e

NGINX_CONFIG="/etc/nginx/sites-available/app.socialpolitician.com.conf"
BACKUP="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Fixing nginx configuration for PocketBase file serving..."
echo ""

# Backup
sudo cp "$NGINX_CONFIG" "$BACKUP"
echo "✅ Backed up to: $BACKUP"
echo ""

# Check current line numbers
PB_LINE=$(grep -n "location /pb/" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
STATIC_LINE=$(grep -n "location ~\*" "$NGINX_CONFIG" | head -1 | cut -d: -f1)

echo "📍 Location blocks:"
echo "   /pb/ block at line: $PB_LINE"
echo "   Static files regex at line: $STATIC_LINE"
echo ""

if [ "$STATIC_LINE" -lt "$PB_LINE" ]; then
    echo "⚠️  Static files regex comes BEFORE /pb/ block"
    echo "   This is causing the issue!"
    echo ""
    echo "🔧 SOLUTION:"
    echo "   We need to modify the static files regex to exclude /pb/ paths"
    echo "   OR move /pb/ block before the regex"
    echo ""
    echo "   The fix is to change the regex from:"
    echo "     location ~* \.(jpg|jpeg|png|...)$"
    echo "   To:"
    echo "     location ~* ^(?!/pb/).*\.(jpg|jpeg|png|...)$"
    echo ""
    echo "   This excludes paths starting with /pb/"
    echo ""
    read -p "Apply fix? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Create a Python script to do the replacement safely
        python3 << 'PYTHON'
import re
import sys

config_path = sys.argv[1]
backup_path = sys.argv[2]

with open(config_path, 'r') as f:
    content = f.read()

# Find the static files location block
pattern = r'(location ~\* \\\.\(jpg\|jpeg\|png\|gif\|ico\|css\|js\|svg\|woff\|woff2\|ttf\|eot\|webp\)\$ \{)'
replacement = r'location ~* ^(?!/pb/).*\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot|webp)$ {'

new_content = re.sub(pattern, replacement, content)

if new_content != content:
    with open(config_path, 'w') as f:
        f.write(new_content)
    print("✅ Updated nginx config")
    print("   Modified static files regex to exclude /pb/ paths")
else:
    print("⚠️  Pattern not found or already fixed")
PYTHON
        "$NGINX_CONFIG" "$BACKUP"
        
        echo ""
        echo "🧪 Testing nginx configuration..."
        if sudo nginx -t; then
            echo "✅ Nginx configuration is valid!"
            echo ""
            echo "🔄 Reloading nginx..."
            sudo systemctl reload nginx
            echo "✅ Nginx reloaded"
            echo ""
            echo "🧪 Test file access:"
            echo "   curl -I https://app.socialpolitician.com/pb/api/files/pbc_3830222512/chpqjhlrwsa3k3m/brian_kemp_mvie2g511j.jpg"
        else
            echo "❌ Nginx config has errors! Restoring backup..."
            sudo cp "$BACKUP" "$NGINX_CONFIG"
            exit 1
        fi
    else
        echo "❌ Fix cancelled"
        exit 1
    fi
else
    echo "✅ Location block order looks correct"
    echo "   The issue might be something else"
fi
