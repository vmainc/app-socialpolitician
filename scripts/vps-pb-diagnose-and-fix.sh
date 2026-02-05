#!/bin/bash
# Run on VPS: cd /var/www/socialpolitician-app && bash scripts/vps-pb-diagnose-and-fix.sh
# Diagnoses DB paths, service, and admin login; then applies one consistent fix.

APP="/var/www/socialpolitician-app"
DB1="$APP/pocketbase/data.db"
DB2="$APP/pocketbase/pb_data/data.db"

echo "========== 1. Which DB files exist? =========="
for db in "$DB1" "$DB2"; do
  if [ -f "$db" ]; then
    echo "  EXISTS: $db"
    su_count=$(sqlite3 "$db" "SELECT COUNT(*) FROM _superusers;" 2>/dev/null || echo "?")
    pol_count=$(sqlite3 "$db" "SELECT COUNT(*) FROM politicians;" 2>/dev/null || echo "?")
    echo "    _superusers: $su_count  |  politicians: $pol_count"
    if [ "$su_count" != "?" ] && [ "$su_count" -gt 0 ]; then
      sqlite3 "$db" "SELECT id, email FROM _superusers LIMIT 3;" 2>/dev/null | sed 's/^/    /'
    fi
  else
    echo "  MISSING: $db"
  fi
done

echo ""
echo "========== 2. Current systemd service =========="
sudo systemctl cat socialpolitician-app-pocketbase.service 2>/dev/null | grep -E "ExecStart|WorkingDirectory" || echo "  (service not found)"

echo ""
echo "========== 3. Service status =========="
sudo systemctl is-active socialpolitician-app-pocketbase.service 2>/dev/null || true
sudo journalctl -u socialpolitician-app-pocketbase.service -n 8 --no-pager 2>/dev/null || true

echo ""
echo "========== 4. Local health =========="
curl -sf http://127.0.0.1:8091/api/health && echo " OK" || echo " FAIL (is PB running?)"

echo ""
echo "========== 5. Fix: use pb_data + explicit migrationsDir =========="
echo "  Ensuring service uses: --dir=.../pocketbase/pb_data --migrationsDir=.../pocketbase/pb_migrations"
if [ -f "$APP/etc/systemd/socialpolitician-app-pocketbase.service" ]; then
  sudo cp "$APP/etc/systemd/socialpolitician-app-pocketbase.service" /etc/systemd/system/
  sudo systemctl daemon-reload
  echo "  Copied unit from repo and reloaded."
else
  echo "  Unit file not in repo at etc/systemd/ - edit /etc/systemd/system/socialpolitician-app-pocketbase.service manually:"
  echo "  ExecStart=.../pocketbase serve --http=127.0.0.1:8091 --dir=$APP/pocketbase/pb_data --migrationsDir=$APP/pocketbase/pb_migrations"
fi

echo ""
echo "========== 6. Restart and reset admin in pb_data =========="
sudo systemctl stop socialpolitician-app-pocketbase.service 2>/dev/null || true
sleep 1
# Reset admin in the DB we're now using (pb_data)
if [ -f "$DB2" ]; then
  (cd "$APP" && python3 scripts/vps-reset-admin-password.py) && echo "  Admin password reset in pb_data/data.db" || echo "  (Run manually: cd $APP && python3 scripts/vps-reset-admin-password.py)"
fi
sudo systemctl start socialpolitician-app-pocketbase.service
sleep 2

echo ""
echo "========== 7. After restart =========="
sudo systemctl is-active socialpolitician-app-pocketbase.service
curl -sf http://127.0.0.1:8091/api/health && echo " OK" || echo " FAIL"
echo ""
echo "Login at https://app.socialpolitician.com/pb/_/  with  admin@vma.agency  /  12345678  (incognito)."
