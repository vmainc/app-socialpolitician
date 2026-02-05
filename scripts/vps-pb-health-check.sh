#!/bin/bash
# Run on VPS: cd /var/www/socialpolitician-app && bash scripts/vps-pb-health-check.sh
# Paste the full output so we can fix 502.

echo "=== 1. Pull latest and restart ==="
cd /var/www/socialpolitician-app
git pull origin main
echo ""
echo "=== 2. add_persona_fields.js should be GONE ==="
ls pocketbase/pb_migrations/add_persona_fields.js 2>/dev/null && echo "   ❌ File still present" || echo "   ✅ File removed"
echo ""
echo "=== 3. Restart PocketBase ==="
sudo systemctl restart socialpolitician-app-pocketbase.service
sleep 2
echo ""
echo "=== 4. Service status ==="
sudo systemctl status socialpolitician-app-pocketbase.service --no-pager -l 2>&1 | head -20
echo ""
echo "=== 5. Port 8091 ==="
ss -tlnp 2>/dev/null | grep 8091 || echo "   Nothing listening on 8091"
echo ""
echo "=== 6. Local health check ==="
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8091/api/health && echo " (OK)" || echo " (FAIL)"
curl -s http://127.0.0.1:8091/api/health | head -c 200
echo ""
echo ""
echo "=== 7. Last PocketBase log (full line) ==="
sudo journalctl -u socialpolitician-app-pocketbase.service -n 3 --no-pager -l 2>/dev/null
echo ""
echo "=== 8. Nginx config for app.socialpolitician.com ==="
for f in /etc/nginx/sites-available/app.socialpolitician.com.conf /etc/nginx/sites-available/app.socialpolitician.com; do
  if [ -f "$f" ]; then
    echo "   Found: $f"
    if grep -q "location /pb/" "$f"; then
      grep -A3 "location /pb/" "$f" | head -5
    else
      echo "   No location /pb/ block in this file"
    fi
    break
  fi
done
[ -z "$(ls /etc/nginx/sites-available/app.socialpolitician* 2>/dev/null)" ] && echo "   No app.socialpolitician.com config in sites-available"
echo ""
echo "=== 9. Public health (from VPS) ==="
curl -s -o /dev/null -w "%{http_code}" https://app.socialpolitician.com/pb/api/health 2>/dev/null && echo " (OK)" || echo " (FAIL or no curl to public)"
