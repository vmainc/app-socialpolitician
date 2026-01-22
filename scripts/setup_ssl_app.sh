#!/bin/bash
# SSL Setup Script for app.socialpolitician.com
# This script sets up SSL exactly like presidents.socialpolitician.com
# Run on VPS: sudo bash scripts/setup_ssl_app.sh

set -e

echo "🔒 SSL Setup for app.socialpolitician.com"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}❌ Please run with sudo${NC}"
   exit 1
fi

# Step 1: DNS Verification
echo "1️⃣ Verifying DNS..."
PRESIDENTS_IP=$(dig +short presidents.socialpolitician.com)
APP_IP=$(dig +short app.socialpolitician.com)
VPS_IP=$(curl -s ifconfig.me 2>/dev/null || echo "UNKNOWN")

echo "   presidents.socialpolitician.com → $PRESIDENTS_IP"
echo "   app.socialpolitician.com → $APP_IP"
echo "   VPS IP → $VPS_IP"

if [ "$APP_IP" != "$VPS_IP" ]; then
    echo -e "   ${RED}❌ DNS mismatch! app.socialpolitician.com points to $APP_IP, but VPS is $VPS_IP${NC}"
    echo "   Please update DNS A record for app.socialpolitician.com to point to $VPS_IP"
    exit 1
fi
echo -e "   ${GREEN}✅ DNS is correct${NC}"
echo ""

# Step 2: Check Presidents Config (Reference)
echo "2️⃣ Inspecting presidents.socialpolitician.com config (reference)..."
PRESIDENTS_CONFIG="/etc/nginx/sites-available/presidents.socialpolitician.com.conf"
APP_CONFIG="/etc/nginx/sites-available/app.socialpolitician.com.conf"

if [ ! -f "$PRESIDENTS_CONFIG" ]; then
    echo -e "   ${RED}❌ Reference config not found: $PRESIDENTS_CONFIG${NC}"
    echo "   Cannot proceed without reference config"
    exit 1
fi

echo -e "   ${GREEN}✅ Found reference config${NC}"
echo ""

# Step 3: Extract SSL settings from presidents config
echo "3️⃣ Extracting SSL configuration pattern..."
PRESIDENTS_SSL_CERT=$(grep -E "^\s*ssl_certificate\s+" "$PRESIDENTS_CONFIG" | head -1 | awk '{print $2}' | tr -d ';' || echo "")
PRESIDENTS_SSL_KEY=$(grep -E "^\s*ssl_certificate_key\s+" "$PRESIDENTS_CONFIG" | head -1 | awk '{print $2}' | tr -d ';' || echo "")

if [ -z "$PRESIDENTS_SSL_CERT" ]; then
    echo -e "   ${YELLOW}⚠️  Could not extract SSL cert path from presidents config${NC}"
    echo "   Will use Let's Encrypt default path"
    APP_SSL_CERT="/etc/letsencrypt/live/app.socialpolitician.com/fullchain.pem"
    APP_SSL_KEY="/etc/letsencrypt/live/app.socialpolitician.com/privkey.pem"
else
    # Replace domain in path
    APP_SSL_CERT=$(echo "$PRESIDENTS_SSL_CERT" | sed 's/presidents\.socialpolitician\.com/app.socialpolitician.com/g')
    APP_SSL_KEY=$(echo "$PRESIDENTS_SSL_KEY" | sed 's/presidents\.socialpolitician\.com/app.socialpolitician.com/g')
fi

echo "   SSL cert will be: $APP_SSL_CERT"
echo "   SSL key will be: $APP_SSL_KEY"
echo ""

# Step 4: Check if app config exists
echo "4️⃣ Checking app.socialpolitician.com config..."
if [ -f "$APP_CONFIG" ]; then
    echo -e "   ${GREEN}✅ Config exists${NC}"
    BACKUP_FILE="${APP_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$APP_CONFIG" "$BACKUP_FILE"
    echo "   Backed up to: $BACKUP_FILE"
else
    echo -e "   ${YELLOW}⚠️  Config not found, will create new one${NC}"
fi
echo ""

# Step 5: Create/Update Nginx Config
echo "5️⃣ Creating/updating nginx config..."

# Read presidents config to understand structure
PRESIDENTS_ROOT=$(grep -E "^\s*root\s+" "$PRESIDENTS_CONFIG" | head -1 | awk '{print $2}' | tr -d ';' || echo "/var/www/socialpolitician-app/web/dist")
PRESIDENTS_PB_PORT=$(grep -E "proxy_pass.*127.0.0.1:" "$PRESIDENTS_CONFIG" | grep "/pb/" | head -1 | sed 's/.*127.0.0.1:\([0-9]*\).*/\1/' || echo "8091")
PRESIDENTS_API_PORT=$(grep -E "proxy_pass.*127.0.0.1:" "$PRESIDENTS_CONFIG" | grep "/api/" | head -1 | sed 's/.*127.0.0.1:\([0-9]*\).*/\1/' || echo "3001")

# Use app-specific paths and ports
APP_ROOT="/var/www/socialpolitician-app/web/dist"
APP_PB_PORT="8091"
APP_API_PORT="3001"

# Create HTTP server block (redirects to HTTPS)
HTTP_BLOCK=$(cat <<EOF
# HTTP server - redirects to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name app.socialpolitician.com;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF
)

# Create HTTPS server block
HTTPS_BLOCK=$(cat <<EOF
# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.socialpolitician.com;

    # SSL Configuration (will be updated by certbot)
    ssl_certificate $APP_SSL_CERT;
    ssl_certificate_key $APP_SSL_KEY;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Root directory
    root $APP_ROOT;
    index index.html;

    # Frontend routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # PocketBase API
    location /pb/ {
        proxy_pass http://127.0.0.1:$APP_PB_PORT/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Node.js API
    location /api/ {
        proxy_pass http://127.0.0.1:$APP_API_PORT/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
)

# Write config file
cat > "$APP_CONFIG" <<EOF
$HTTP_BLOCK

$HTTPS_BLOCK
EOF

echo -e "   ${GREEN}✅ Config created/updated${NC}"
echo ""

# Step 6: Enable config
echo "6️⃣ Enabling nginx config..."
ln -sf "$APP_CONFIG" /etc/nginx/sites-enabled/app.socialpolitician.com.conf
echo -e "   ${GREEN}✅ Config enabled${NC}"
echo ""

# Step 7: Test nginx config
echo "7️⃣ Testing nginx configuration..."
if nginx -t; then
    echo -e "   ${GREEN}✅ Config is valid${NC}"
else
    echo -e "   ${RED}❌ Config has errors!${NC}"
    exit 1
fi
echo ""

# Step 8: Reload nginx (without SSL cert first)
echo "8️⃣ Reloading nginx..."
systemctl reload nginx
echo -e "   ${GREEN}✅ Nginx reloaded${NC}"
echo ""

# Step 9: Check if certbot is installed
echo "9️⃣ Checking certbot..."
if ! command -v certbot > /dev/null; then
    echo "   Installing certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi
echo -e "   ${GREEN}✅ Certbot is installed${NC}"
echo ""

# Step 10: Get SSL certificate
echo "🔟 Obtaining SSL certificate..."
echo "   This may take a minute..."

# Check if certificate already exists
if [ -f "$APP_SSL_CERT" ]; then
    echo -e "   ${YELLOW}⚠️  Certificate already exists${NC}"
    read -p "   Renew certificate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        certbot renew --cert-name app.socialpolitician.com --force-renewal
    else
        echo "   Using existing certificate"
    fi
else
    # Get new certificate
    certbot --nginx -d app.socialpolitician.com --non-interactive --agree-tos --email admin@vma.agency --redirect || {
        echo ""
        echo -e "   ${RED}❌ Certbot failed!${NC}"
        echo ""
        echo "   Common issues:"
        echo "   - DNS not propagated (wait 5-60 minutes)"
        echo "   - Port 80 blocked (check firewall: ufw allow 80/tcp)"
        echo "   - Nginx not running (systemctl start nginx)"
        echo ""
        echo "   Try manually:"
        echo "   certbot --nginx -d app.socialpolitician.com"
        exit 1
    }
fi
echo ""

# Step 11: Final nginx reload
echo "1️⃣1️⃣ Final nginx reload..."
systemctl reload nginx
echo -e "   ${GREEN}✅ Nginx reloaded${NC}"
echo ""

# Step 12: Validation
echo "1️⃣2️⃣ Validating SSL setup..."
echo ""

# Test HTTP redirect
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://app.socialpolitician.com || echo "FAILED")
if [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "   ${GREEN}✅ HTTP redirects to HTTPS (code: $HTTP_CODE)${NC}"
else
    echo -e "   ${RED}❌ HTTP redirect failed (code: $HTTP_CODE)${NC}"
fi

# Test HTTPS
HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://app.socialpolitician.com || echo "FAILED")
if [ "$HTTPS_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ HTTPS works (code: $HTTPS_CODE)${NC}"
else
    echo -e "   ${RED}❌ HTTPS failed (code: $HTTPS_CODE)${NC}"
fi

# Test certificate
CERT_CHECK=$(echo | openssl s_client -connect app.socialpolitician.com:443 -servername app.socialpolitician.com 2>/dev/null | grep -c "Verify return code: 0" || echo "0")
if [ "$CERT_CHECK" -gt 0 ]; then
    echo -e "   ${GREEN}✅ SSL certificate is valid${NC}"
else
    echo -e "   ${RED}❌ SSL certificate validation failed${NC}"
fi

echo ""
echo "========================================="
echo -e "${GREEN}✅ SSL setup complete!${NC}"
echo ""
echo "🌐 Test: https://app.socialpolitician.com"
echo ""
echo "Certificate will auto-renew via certbot timer."
echo "Check renewal status: systemctl status certbot.timer"
