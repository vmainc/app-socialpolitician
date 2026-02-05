#!/bin/bash
# Add proxy_redirect and X-Forwarded-Host so PocketBase admin stays on
# https://app.socialpolitician.com/pb/_/ instead of 127.0.0.1:8091.
# Run on VPS: sudo bash /var/www/socialpolitician-app/scripts/vps-nginx-pb-redirect-fix.sh

CONF="/etc/nginx/sites-available/app.socialpolitician.com.conf"

if [ ! -f "$CONF" ]; then
  echo "Config not found: $CONF"
  exit 1
fi

if grep -q "proxy_redirect.*127.0.0.1:8091" "$CONF"; then
  echo "proxy_redirect already present - nothing to do."
  sudo nginx -t && sudo systemctl reload nginx
  exit 0
fi

echo "Editing the **active** config: $CONF"
echo "Add these 3 lines inside the 'location ^~ /pb/' block, right after the line:"
echo "  proxy_set_header X-Forwarded-Proto \$scheme;"
echo ""
echo "  proxy_set_header X-Forwarded-Host \$host;"
echo "  proxy_redirect http://127.0.0.1:8091/ https://app.socialpolitician.com/pb/;"
echo "  proxy_redirect https://127.0.0.1:8091/ https://app.socialpolitician.com/pb/;"
echo ""
echo "Then run: sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "Opening editor in 3 seconds..."
sleep 3
sudo nano "$CONF"
