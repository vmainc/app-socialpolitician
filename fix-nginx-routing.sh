#!/bin/bash
# Fix Nginx configuration for React SPA routing
# This ensures all routes are handled by React Router

echo "🔧 Fixing Nginx configuration for React SPA routing..."
echo ""

# Check if running on VPS
if [ ! -d "/etc/nginx" ]; then
    echo "❌ This script must be run on the VPS (Nginx not found)"
    echo ""
    echo "To fix manually on the VPS:"
    echo "1. SSH into your VPS"
    echo "2. Edit the Nginx config: sudo nano /etc/nginx/sites-available/app.socialpolitician.com"
    echo "3. Find the location / block and ensure it has:"
    echo "   try_files \$uri \$uri/ /index.html;"
    echo "4. Test config: sudo nginx -t"
    echo "5. Reload Nginx: sudo systemctl reload nginx"
    exit 1
fi

NGINX_CONFIG="/etc/nginx/sites-available/app.socialpolitician.com"

if [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ Nginx config not found at $NGINX_CONFIG"
    echo "Looking for other config files..."
    ls -la /etc/nginx/sites-available/ 2>/dev/null || echo "No sites-available directory found"
    exit 1
fi

echo "📝 Found Nginx config: $NGINX_CONFIG"
echo ""

# Check if try_files is already present
if grep -q "try_files.*index.html" "$NGINX_CONFIG"; then
    echo "✅ Nginx config already has try_files directive"
    echo ""
    echo "Current location / block:"
    grep -A 5 "location /" "$NGINX_CONFIG" | head -10
    echo ""
    echo "Testing Nginx configuration..."
    sudo nginx -t
    if [ $? -eq 0 ]; then
        echo "✅ Nginx config is valid"
        echo "🔄 Reloading Nginx..."
        sudo systemctl reload nginx
        echo "✅ Nginx reloaded"
    else
        echo "❌ Nginx config has errors - please fix manually"
    fi
else
    echo "⚠️  Nginx config missing try_files directive"
    echo ""
    echo "Please add the following to your location / block:"
    echo ""
    echo "    location / {"
    echo "        root /var/www/socialpolitician-app/web/dist;"
    echo "        try_files \$uri \$uri/ /index.html;"
    echo "        index index.html;"
    echo "    }"
    echo ""
    echo "Then run:"
    echo "  sudo nginx -t"
    echo "  sudo systemctl reload nginx"
fi
