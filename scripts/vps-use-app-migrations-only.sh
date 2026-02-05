#!/bin/bash
# Force app.socialpolitician.com to use ONLY pocketbase/pb_migrations; skip other-app migrations.
# Run on VPS: cd /var/www/socialpolitician-app && bash scripts/vps-use-app-migrations-only.sh

set -e
APP_DIR="/var/www/socialpolitician-app"
DB="$APP_DIR/pocketbase/pb_data/data.db"
cd "$APP_DIR"

# Other-app migration files (voices of the presidency etc.) - remove from disk and mark applied so PB starts
OTHER_APP_MIGRATIONS="add_persona_fields.js add_president_facts_collection.js add_profile_fields.js"

echo "=== 1. Remove other-app migration files from any migrations dir ==="
for name in $OTHER_APP_MIGRATIONS; do
  for dir in pocketbase/pb_migrations pb_migrations pb_linux/pb_migrations; do
    [ -f "$dir/$name" ] && rm -f "$dir/$name" && echo "   Removed: $dir/$name"
  done
done
echo ""

echo "=== 2. Mark them as applied in DB (so PB skips if it ever sees them) ==="
APPLIED_TS=$(($(date +%s) * 1000))
for name in $OTHER_APP_MIGRATIONS; do
  sqlite3 "$DB" "INSERT OR IGNORE INTO _migrations (file, applied) VALUES ('$name', $APPLIED_TS);" 2>/dev/null || true
done
echo "   Done"
echo ""

echo "=== 3. Symlink pb_linux/pb_migrations -> pocketbase/pb_migrations ==="
echo "   Current: $(readlink pb_linux/pb_migrations 2>/dev/null || echo 'n/a')"
cd pb_linux
rm -rf pb_migrations
ln -sf ../pocketbase/pb_migrations pb_migrations
cd ..
echo "   Now: $(readlink pb_linux/pb_migrations)"
echo ""

echo "=== 4. Restart PocketBase ==="
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
