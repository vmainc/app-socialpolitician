#!/bin/bash
# Manually fix Nginx config for PocketBase file serving
# This is a more aggressive fix that ensures /pb/ paths are excluded

set -e

NGINX_CONFIG="/etc/nginx/sites-available/app.socialpolitician.com.conf"
BACKUP="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Manual Nginx Fix for PocketBase Files"
echo "========================================"
echo ""

if [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ Config not found: $NGINX_CONFIG"
    exit 1
fi

# Backup
sudo cp "$NGINX_CONFIG" "$BACKUP"
echo "✅ Backed up to: $BACKUP"
echo ""

# Use Python to do a more comprehensive fix
sudo python3 << 'PYTHON'
import re
import sys

config_path = sys.argv[1]

with open(config_path, 'r') as f:
    content = f.read()

original = content

# Fix 1: Update static files regex to exclude /pb/
# Pattern: location ~* \.(jpg|jpeg|png|...)$
# Replace: location ~* ^(?!/pb/).*\.(jpg|jpeg|png|...)$

# Try multiple patterns
patterns = [
    (r'location ~\* \\\.\(([^)]+)\)\$ \{', r'location ~* ^(?!/pb/).*\\.(\\1)$ {'),
    (r'location ~\* \.\(([^)]+)\)\$ \{', r'location ~* ^(?!/pb/).*\\.(\\1)$ {'),
    (r'location ~\* \^\(?!\/pb\/\)', r'location ~* ^(?!/pb/)'),  # Already fixed
]

for pattern, replacement in patterns:
    if re.search(pattern, content):
        content = re.sub(pattern, replacement, content)
        print(f"✅ Applied pattern fix")
        break

# Fix 2: Ensure /pb/ location block uses ^~ (prefix match, highest priority)
if 'location ^~ /pb/' not in content and 'location /pb/' in content:
    content = content.replace('location /pb/', 'location ^~ /pb/')
    print("✅ Updated /pb/ location to use ^~ prefix")

# Fix 3: Move /pb/ block before static files if needed
# (This is complex, so we'll just ensure it exists and has ^~)

if content != original:
    with open(config_path, 'w') as f:
        f.write(content)
    print("✅ Configuration updated")
else:
    print("⚠️  No changes needed (or pattern not found)")

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
echo ""
echo "🧪 Test:"
echo "   curl -I https://app.socialpolitician.com/pb/api/files/pbc_3830222512/test/test.jpg"
