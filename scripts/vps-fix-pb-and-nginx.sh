#!/bin/bash
# One-time fix on VPS: mark add_persona_fields.js as applied so PocketBase starts,
# then show how to add Nginx /pb/ block.
# Run: cd /var/www/socialpolitician-app && bash scripts/vps-fix-pb-and-nginx.sh

set -e
APP_DIR="/var/www/socialpolitician-app"
DB="$APP_DIR/pocketbase/pb_data/data.db"
NGINX_CONF="/etc/nginx/sites-available/app.socialpolitician.com.conf"

echo "=== 1. Mark add_persona_fields.js as applied (so PocketBase stops trying to run it) ==="
if [ ! -f "$DB" ]; then
  echo "   ❌ Database not found: $DB"
  exit 1
fi
# PocketBase _migrations: (file, applied) or (file). Try both.
APPLIED_TS=$(($(date +%s) * 1000))
if ! sqlite3 "$DB" "INSERT OR IGNORE INTO _migrations (file, applied) VALUES ('add_persona_fields.js', $APPLIED_TS);" 2>/dev/null; then
  sqlite3 "$DB" "INSERT OR IGNORE INTO _migrations (file) VALUES ('add_persona_fields.js');" 2>/dev/null || true
fi
echo "   ✅ Done"
echo ""

echo "=== 2. Restart PocketBase ==="
sudo systemctl restart socialpolitician-app-pocketbase.service
sleep 2
if curl -sf http://127.0.0.1:8091/api/health >/dev/null; then
  echo "   ✅ PocketBase is running on 127.0.0.1:8091"
else
  echo "   ❌ PocketBase still not responding. Logs:"
  sudo journalctl -u socialpolitician-app-pocketbase.service -n 5 --no-pager -l
  exit 1
fi
echo ""

echo "=== 3. Nginx: add /pb/ proxy (no location /pb/ block found) ==="
echo "   Edit the config and add this block inside the server { } for app.socialpolitician.com:"
echo ""
echo "   sudo nano $NGINX_CONF"
echo ""
echo "   Add these lines (e.g. before 'location /' or 'location /api/'):"
echo "----------------------------------------"
cat <<'NGINX_BLOCK'

    location /pb/ {
        proxy_pass http://127.0.0.1:8091/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

NGINX_BLOCK
echo "----------------------------------------"
echo "   Then run:"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "   Test: https://app.socialpolitician.com/pb/api/health"
