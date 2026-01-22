#!/bin/bash
# Fix SSL for app.socialpolitician.com
# Run this on your VPS

set -e

echo "🔒 SSL Setup for app.socialpolitician.com"
echo "========================================"
echo ""

# Step 1: Check DNS
echo "1️⃣ Checking DNS..."
DNS_IP=$(dig +short app.socialpolitician.com)
VPS_IP=$(curl -s ifconfig.me)

echo "   DNS points to: $DNS_IP"
echo "   VPS IP is: $VPS_IP"

if [ "$DNS_IP" != "$VPS_IP" ]; then
    echo "   ⚠️  DNS doesn't match VPS IP!"
    echo "   Update DNS A record to point to: $VPS_IP"
    exit 1
fi
echo "   ✅ DNS is correct"
echo ""

# Step 2: Check Nginx config exists
echo "2️⃣ Checking Nginx config..."
NGINX_CONFIG="/etc/nginx/sites-available/app.socialpolitician.com.conf"

if [ ! -f "$NGINX_CONFIG" ]; then
    echo "   ❌ Nginx config not found!"
    echo "   Creating config..."
    
    sudo tee "$NGINX_CONFIG" > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name app.socialpolitician.com;

    root /var/www/socialpolitician-app/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /pb/ {
        proxy_pass http://127.0.0.1:8091/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
    
    sudo ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/
    echo "   ✅ Config created"
else
    echo "   ✅ Config exists"
fi
echo ""

# Step 3: Test Nginx config
echo "3️⃣ Testing Nginx config..."
if sudo nginx -t; then
    echo "   ✅ Config is valid"
    sudo systemctl reload nginx
else
    echo "   ❌ Config has errors!"
    exit 1
fi
echo ""

# Step 4: Check ports are open
echo "4️⃣ Checking firewall..."
if command -v ufw > /dev/null; then
    sudo ufw allow 80/tcp 2>/dev/null || true
    sudo ufw allow 443/tcp 2>/dev/null || true
    echo "   ✅ Ports 80 and 443 allowed"
fi
echo ""

# Step 5: Check if certbot is installed
echo "5️⃣ Checking certbot..."
if ! command -v certbot > /dev/null; then
    echo "   Installing certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
fi
echo "   ✅ Certbot installed"
echo ""

# Step 6: Get SSL certificate
echo "6️⃣ Getting SSL certificate..."
echo "   This may take a minute..."
sudo certbot --nginx -d app.socialpolitician.com --non-interactive --agree-tos --email admin@vma.agency || {
    echo ""
    echo "   ❌ Certbot failed!"
    echo ""
    echo "   Common issues:"
    echo "   - DNS not propagated (wait 5-60 minutes)"
    echo "   - Port 80 blocked (check firewall)"
    echo "   - Nginx not running (sudo systemctl start nginx)"
    echo ""
    echo "   Try manually:"
    echo "   sudo certbot --nginx -d app.socialpolitician.com"
    exit 1
}

echo ""
echo "✅ SSL certificate installed!"
echo ""
echo "🌐 Test: https://app.socialpolitician.com"
echo ""
