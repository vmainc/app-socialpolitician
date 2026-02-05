#!/bin/bash
# One-shot: ensure PocketBase service and password reset use the SAME DB, then reset admin.
# Run on VPS: cd /var/www/socialpolitician-app && sudo bash scripts/vps-admin-get-in.sh
# Then open https://app.socialpolitician.com/pb/_/ in a private window and log in with admin@vma.agency / 12345678

APP="/var/www/socialpolitician-app"
SERVICE="socialpolitician-app-pocketbase.service"

echo "========== 1. Which DB does the service use? =========="
UNIT_FILE="/etc/systemd/system/$SERVICE"
[ -f "$UNIT_FILE" ] || UNIT_FILE="$APP/etc/systemd/socialpolitician-app-pocketbase.service"
DIR_LINE=$(grep -o '\-\-dir=[^ ]*' "$UNIT_FILE" 2>/dev/null | head -1)
DATA_DIR="${DIR_LINE#--dir=}"
DB_PATH="${DATA_DIR}/data.db"
if [ -z "$DATA_DIR" ] || [ "$DATA_DIR" = "$DIR_LINE" ]; then
  DATA_DIR="$APP/pocketbase/pb_data"
  DB_PATH="$APP/pocketbase/pb_data/data.db"
fi
echo "  Data dir: $DATA_DIR"
echo "  DB file:  $DB_PATH"

echo ""
echo "========== 2. What's in _superusers in that DB? =========="
if [ ! -f "$DB_PATH" ]; then
  echo "  DB file does not exist. PocketBase will create it on first run (with no superuser)."
  echo "  We'll create the superuser after first start, or you can run: sudo -u doug $APP/pb_linux/pocketbase superuser upsert admin@vma.agency 12345678 --dir=$DATA_DIR"
else
  ROWS=$(sqlite3 "$DB_PATH" "SELECT id, email, length(password), length(tokenKey) FROM _superusers;" 2>/dev/null || echo "error")
  if [ "$ROWS" = "error" ] || [ -z "$ROWS" ]; then
    echo "  (table missing or empty)"
  else
    echo "$ROWS" | while read -r line; do echo "  $line"; done
  fi
fi

echo ""
echo "========== 3. Stop PocketBase, set password in that DB, start =========="
sudo systemctl stop "$SERVICE" 2>/dev/null || true
sleep 1
export PB_DB_PATH="$DB_PATH"
cd "$APP"
if python3 scripts/vps-reset-admin-password.py 2>/dev/null; then
  echo "  Password reset OK."
else
  echo "  No row to update (new DB?). Creating superuser with CLI..."
  sudo -u doug "$APP/pb_linux/pocketbase" superuser upsert admin@vma.agency 12345678 --dir="$DATA_DIR" 2>/dev/null && echo "  Superuser created." || echo "  Upsert failed - run manually: sudo -u doug $APP/pb_linux/pocketbase superuser upsert admin@vma.agency 12345678 --dir=$DATA_DIR"
fi
sudo systemctl start "$SERVICE"
sleep 2

echo ""
echo "========== 4. Service and health =========="
sudo systemctl is-active "$SERVICE"
curl -sf http://127.0.0.1:8091/api/health && echo " OK" || echo " FAIL"

echo ""
echo "========== 5. Log (if you see 'create your first superuser' the server is using a different DB) =========="
sudo journalctl -u "$SERVICE" -n 5 --no-pager 2>/dev/null || true

echo ""
echo ">>> Log in: https://app.socialpolitician.com/pb/_/"
echo ">>> Email: admin@vma.agency   Password: 12345678"
echo ">>> Use a private/incognito window. If it redirects to 127.0.0.1, the Nginx proxy_redirect fix may be missing in app.socialpolitician.com.conf."
