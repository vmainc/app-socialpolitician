#!/bin/bash
# Force PocketBase to use pb_data (the DB with 577 politicians). Run on VPS: sudo bash scripts/vps-force-pb-data.sh

UNIT="/etc/systemd/system/socialpolitician-app-pocketbase.service"
APP="/var/www/socialpolitician-app"

echo "========== 1. Current --dir in service =========="
grep -o '\-\-dir=[^ ]*' "$UNIT" 2>/dev/null || echo "(no unit or no --dir)"

echo ""
echo "========== 2. Installing unit file that uses pb_data =========="
sudo tee "$UNIT" << 'EOF'
[Unit]
Description=PocketBase for app.socialpolitician.com
After=network.target

[Service]
Type=simple
User=doug
Group=doug
WorkingDirectory=/var/www/socialpolitician-app/pb_linux
ExecStart=/var/www/socialpolitician-app/pb_linux/pocketbase serve --http=127.0.0.1:8091 --dir=/var/www/socialpolitician-app/pocketbase/pb_data --migrationsDir=/var/www/socialpolitician-app/pocketbase/pb_migrations
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl restart socialpolitician-app-pocketbase
sleep 2

echo ""
echo "========== 3. Verify: politicians count via API =========="
# Request politicians collection - if we get items or totalItems > 0, we're on the right DB
COUNT=$(curl -sf "http://127.0.0.1:8091/api/collections/politicians/records?perPage=1" | grep -o '"totalItems":[0-9]*' | cut -d: -f2)
if [ -n "$COUNT" ] && [ "$COUNT" -gt 0 ]; then
  echo "  Politicians in API: $COUNT (correct DB)"
else
  echo "  API returned empty or error (still wrong DB or API down)"
  curl -s "http://127.0.0.1:8091/api/collections/politicians/records?perPage=1" | head -c 200
  echo ""
fi

echo ""
echo ">>> Open https://app.socialpolitician.com/pb/_/ and refresh (or use incognito). You should see Collections: politicians, users, etc."
