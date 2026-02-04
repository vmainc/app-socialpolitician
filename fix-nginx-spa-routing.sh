#!/bin/bash
# Fix Nginx configuration for React SPA routing
# Run this on the VPS with: bash fix-nginx-spa-routing.sh

set -e

NGINX_CONFIG="/etc/nginx/sites-available/app.socialpolitician.com.conf"
BACKUP_CONFIG="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Fixing Nginx configuration for React SPA routing..."
echo ""

# Check if config exists
if [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ Nginx config not found at $NGINX_CONFIG"
    exit 1
fi

# Backup current config
echo "📦 Creating backup: $BACKUP_CONFIG"
sudo cp "$NGINX_CONFIG" "$BACKUP_CONFIG"

# Check if try_files already exists
if grep -q "try_files.*index.html" "$NGINX_CONFIG"; then
    echo "✅ Nginx config already has try_files directive"
    echo ""
    echo "Current location / block:"
    sudo grep -A 5 "location /" "$NGINX_CONFIG" | head -10
    echo ""
else
    echo "⚠️  Adding try_files directive to location / block..."
    
    # Create a temporary file with the fix
    TEMP_FILE=$(mktemp)
    sudo cp "$NGINX_CONFIG" "$TEMP_FILE"
    
    # Check if location / block exists
    if ! grep -q "location /" "$TEMP_FILE"; then
        echo "❌ No location / block found in config"
        rm "$TEMP_FILE"
        exit 1
    fi
    
    # Use sed to add try_files if it doesn't exist in location / block
    # This is a bit complex, so we'll use a Python script for safety
    sudo python3 << EOF
import re

with open("$NGINX_CONFIG", "r") as f:
    content = f.read()

# Pattern to match location / block
pattern = r'(location\s+/\s*\{[^}]*?)(\})'

def add_try_files(match):
    block = match.group(1)
    closing = match.group(2)
    
    # Check if try_files already exists
    if 'try_files' in block:
        return match.group(0)
    
    # Find root directive to determine the path
    root_match = re.search(r'root\s+([^;]+);', block)
    if not root_match:
        # If no root, add it
        block = block.rstrip() + "\n        root /var/www/socialpolitician-app/web/dist;\n"
    
    # Add try_files and index
    block = block.rstrip() + "\n        try_files \\\$uri \\\$uri/ /index.html;\n        index index.html;\n"
    
    return block + closing

new_content = re.sub(pattern, add_try_files, content, flags=re.DOTALL)

if new_content != content:
    with open("$TEMP_FILE", "w") as f:
        f.write(new_content)
    print("✅ Updated config")
else:
    print("⚠️  No changes made (try_files might already exist or pattern didn't match)")
EOF

    # Move temp file back
    if [ -f "$TEMP_FILE" ]; then
        sudo mv "$TEMP_FILE" "$NGINX_CONFIG"
    fi
fi

# Test Nginx configuration
echo ""
echo "🧪 Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx config is valid"
    echo ""
    echo "🔄 Reloading Nginx..."
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
    echo ""
    echo "✅ Fix complete! React routes should now work."
else
    echo "❌ Nginx config has errors!"
    echo "Restoring backup..."
    sudo cp "$BACKUP_CONFIG" "$NGINX_CONFIG"
    echo "Backup restored. Please fix manually."
    exit 1
fi
