#!/bin/bash
# Run on VPS to capture exact PocketBase migration error: sudo bash scripts/vps-pb-capture-error.sh
# Then paste the output (or /var/www/socialpolitician-app/tmp/pb-error.txt) so we can fix the right migration.

mkdir -p /var/www/socialpolitician-app/tmp
sudo systemctl restart socialpolitician-app-pocketbase
sleep 3
sudo journalctl -u socialpolitician-app-pocketbase.service -n 25 --no-pager -o short-full 2>&1 | tee /var/www/socialpolitician-app/tmp/pb-error.txt
echo ""
echo ">>> If you see 'Error: failed to apply migration XXXXX': paste the FULL line above so we can fix that migration."
