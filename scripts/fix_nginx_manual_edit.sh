#!/bin/bash
# Manual edit fix - reads file, makes change, writes back

set -e

NGINX_CONFIG="/etc/nginx/sites-available/app.socialpolitician.com.conf"
BACKUP="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Nginx Fix (Manual Edit)"
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

# Fix 2: Update static files regex - use Python for reliable replacement
echo ""
echo "📝 Updating static files regex to exclude /pb/ paths..."

sudo python3 << 'PYTHON'
import re
import sys

config_path = sys.argv[1]

with open(config_path, 'r') as f:
    lines = f.readlines()

changed = False
new_lines = []

for i, line in enumerate(lines):
    # Match: location ~* \.(jpg|jpeg|png|...)$ {
    if 'location ~*' in line and '\\.(' in line and not '^(?!/pb/)' in line:
        # Extract the extensions part
        match = re.search(r'\\.\(([^)]+)\)', line)
        if match:
            extensions = match.group(1)
            # Replace the line
            new_line = f'    location ~* ^(?!/pb/).*\\.({extensions})$ {{\n'
            new_lines.append(new_line)
            changed = True
            print(f"   ✅ Updated line {i+1}")
            print(f"   From: {line.strip()}")
            print(f"   To:   {new_line.strip()}")
        else:
            new_lines.append(line)
    else:
        new_lines.append(line)

if changed:
    with open(config_path, 'w') as f:
        f.writelines(new_lines)
    print("   ✅ Configuration updated")
else:
    # Check if already fixed
    content = ''.join(lines)
    if '^(?!/pb/)' in content:
        print("   ✅ Already fixed")
    else:
        print("   ⚠️  Pattern not found")
        print("   Current static files location:")
        for line in lines:
            if 'location ~*' in line:
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
        echo "📋 Current static files location:"
        grep -A 2 "location ~\*" "$NGINX_CONFIG" | head -3
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
