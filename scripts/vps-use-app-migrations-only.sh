#!/bin/bash
# Force app.socialpolitician.com to use ONLY pocketbase/pb_migrations (not root pb_migrations from other apps).
# Run on VPS: cd /var/www/socialpolitician-app && bash scripts/vps-use-app-migrations-only.sh

set -e
APP_DIR="/var/www/socialpolitician-app"
cd "$APP_DIR"

echo "=== Use app.socialpolitician.com migrations only (pocketbase/pb_migrations) ==="
echo "   Current pb_linux/pb_migrations: $(readlink -f pb_linux/pb_migrations 2>/dev/null || readlink pb_linux/pb_migrations 2>/dev/null || echo 'not a symlink or missing')"
echo ""

echo "   Recreating symlink: pb_linux/pb_migrations -> pocketbase/pb_migrations"
cd pb_linux
rm -rf pb_migrations
ln -sf ../pocketbase/pb_migrations pb_migrations
cd ..
echo "   Now: $(readlink pb_linux/pb_migrations)"
echo ""

echo "   Restarting PocketBase..."
sudo systemctl restart socialpolitician-app-pocketbase.service
sleep 2
if curl -sf http://127.0.0.1:8091/api/health >/dev/null; then
  echo "   ✅ PocketBase is running"
  curl -s http://127.0.0.1:8091/api/health
else
  echo "   ❌ PocketBase failed. Logs:"
  sudo journalctl -u socialpolitician-app-pocketbase.service -n 8 --no-pager -l
  exit 1
fi
