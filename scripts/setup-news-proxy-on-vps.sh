#!/bin/bash
# Setup news proxy for production (systemd + nginx)
# Run on VPS: cd /var/www/socialpolitician-app && bash scripts/setup-news-proxy-on-vps.sh

set -e

APP_DIR="/var/www/socialpolitician-app"
NGINX_CONFIG="/etc/nginx/sites-available/app.socialpolitician.com.conf"

# Fallback if .conf doesn't exist
if [ ! -f "$NGINX_CONFIG" ]; then
  NGINX_CONFIG="/etc/nginx/sites-available/app.socialpolitician.com"
fi

echo "📰 Setting up News Proxy for production..."
echo ""

# 1. Install systemd service
echo "1️⃣  Installing systemd service..."
sudo cp "$APP_DIR/etc/systemd/socialpolitician-news-proxy.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable socialpolitician-news-proxy.service 2>/dev/null || true
sudo systemctl start socialpolitician-news-proxy.service 2>/dev/null || true
sudo systemctl restart socialpolitician-news-proxy.service 2>/dev/null || true
echo "   ✅ News proxy service installed and started"
echo ""

# 2. Add nginx location if missing
if [ ! -f "$NGINX_CONFIG" ]; then
  echo "⚠️  Nginx config not found at $NGINX_CONFIG - skipping nginx setup"
  echo "   Add manually: location /api/news { proxy_pass http://127.0.0.1:3002; ... }"
else
  if sudo grep -q "location /api/news" "$NGINX_CONFIG"; then
    echo "2️⃣  Nginx already has location /api/news"
  else
    echo "2️⃣  Adding location /api/news to nginx..."
    # Insert after "server_name app.socialpolitician.com;" line
    sudo sed -i '/server_name.*app\.socialpolitician\.com/a\
\
    location /api/news {\
        proxy_pass http://127.0.0.1:3002;\
        proxy_http_version 1.1;\
        proxy_set_header Host \$host;\
        proxy_set_header X-Real-IP \$remote_addr;\
    }' "$NGINX_CONFIG"
    echo "   ✅ Added location /api/news"
    sudo nginx -t && sudo systemctl reload nginx
    echo "   ✅ Nginx reloaded"
  fi
fi

echo ""
echo "3️⃣  Verifying news proxy..."
if curl -sf -o /dev/null "http://127.0.0.1:3002/api/news?q=test" 2>/dev/null; then
  echo "   ✅ News proxy responding on port 3002"
else
  echo "   ⚠️  News proxy not responding - check: sudo journalctl -u socialpolitician-news-proxy.service -n 20"
fi

echo ""
echo "✅ News proxy setup complete!"
echo "   Test: curl -s 'https://app.socialpolitician.com/api/news?q=Joe+Biden' | head -5"
echo ""
