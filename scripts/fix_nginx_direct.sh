#!/bin/bash
# Direct fix for Nginx - ensures /pb/ paths are properly handled

set -e

NGINX_CONFIG="/etc/nginx/sites-available/app.socialpolitician.com.conf"
BACKUP="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Direct Nginx Fix"
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

# Show current config
echo "📋 Current static files location block:"
grep -A 3 "location ~\*" "$NGINX_CONFIG" | head -5
echo ""

# Use Python for more reliable fix
sudo python3 << 'PYTHON'
import re
import sys

config_path = sys.argv[1]

with open(config_path, 'r') as f:
    lines = f.readlines()

new_lines = []
i = 0
changed = False

while i < len(lines):
    line = lines[i]
    
    # Find static files location block
    if re.search(r'location ~\*.*\.\(', line):
        # Check if it already excludes /pb/
        if '^(!/pb/)' not in line and '^(?!/pb/)' not in line:
            # Replace the pattern
            # From: location ~* \.(jpg|jpeg|...)$
            # To:   location ~* ^(?!/pb/).*\.(jpg|jpeg|...)$
            
            # Extract extensions
            ext_match = re.search(r'\.\(([^)]+)\)', line)
            if ext_match:
                extensions = ext_match.group(1)
                # Replace the whole line
                new_line = f'    location ~* ^(?!/pb/).*\\.({extensions})$ {{\n'
                new_lines.append(new_line)
                changed = True
                print(f"✅ Fixed line {i+1}: {line.strip()}")
                print(f"   → {new_line.strip()}")
                i += 1
                # Skip the opening brace line if it's on next line
                if i < len(lines) and lines[i].strip() == '{':
                    i += 1
                continue
    
    new_lines.append(line)
    i += 1

if changed:
    with open(config_path, 'w') as f:
        f.writelines(new_lines)
    print("\n✅ Configuration updated")
else:
    print("⚠️  No changes made - checking if already fixed...")
    # Check if fix is already there
    content = ''.join(lines)
    if '^(?!/pb/)' in content:
        print("   ✅ Fix already applied")
    else:
        print("   ❌ Pattern not found - manual fix needed")

PYTHON
"$NGINX_CONFIG"

# Also ensure /pb/ uses ^~ for highest priority
echo ""
echo "📋 Ensuring /pb/ location has ^~ prefix..."
if grep -q "location ^~ /pb/" "$NGINX_CONFIG"; then
    echo "   ✅ /pb/ already uses ^~ prefix"
elif grep -q "location /pb/" "$NGINX_CONFIG"; then
    sudo sed -i 's|location /pb/|location ^~ /pb/|' "$NGINX_CONFIG"
    echo "   ✅ Updated /pb/ to use ^~ prefix"
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
        "https://app.socialpolitician.com/pb/api/files/pbc_3830222512/test/test.jpg" || echo "000")
    
    if [ "$RESPONSE" = "404" ]; then
        echo "   ⚠️  Still returning 404 - checking config..."
        echo ""
        echo "📋 Current location blocks:"
        grep -n "location" "$NGINX_CONFIG" | head -10
    elif [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "403" ]; then
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
