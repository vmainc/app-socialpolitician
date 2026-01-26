#!/bin/bash
# Remove all duplicate presidents migrations that are causing conflicts
# Run on VPS: cd /var/www/socialpolitician-app && bash fix-all-duplicate-migrations.sh

set -e

echo "🔧 Removing all duplicate presidents migrations..."
echo ""

PB_MIGRATIONS_DIR="/var/www/socialpolitician-app/pocketbase/pb_migrations"
BACKUP_DIR="/var/www/socialpolitician-app/pocketbase/pb_migrations_backup_$(date +%Y%m%d_%H%M%S)"

if [ ! -d "$PB_MIGRATIONS_DIR" ]; then
    echo "❌ Error: Migrations directory not found: $PB_MIGRATIONS_DIR"
    exit 1
fi

echo "1️⃣ Creating backup of all migrations..."
mkdir -p "$BACKUP_DIR"
cp -r "$PB_MIGRATIONS_DIR"/* "$BACKUP_DIR/" 2>/dev/null || true
echo "   ✅ Backup created at: $BACKUP_DIR"

echo ""
echo "2️⃣ Finding duplicate presidents migrations..."
DUPLICATES=$(ls "$PB_MIGRATIONS_DIR"/*presidents*.js 2>/dev/null | wc -l)
echo "   Found $DUPLICATES presidents-related migrations"

if [ "$DUPLICATES" -eq 0 ]; then
    echo "   ℹ️  No presidents migrations found"
    exit 0
fi

echo ""
echo "3️⃣ Listing all presidents migrations:"
ls -1 "$PB_MIGRATIONS_DIR"/*presidents*.js | while read file; do
    basename "$file"
done

echo ""
echo "4️⃣ Removing duplicate presidents migrations..."
echo "   (Keeping only the first one: 1768832417_created_presidents.js)"

REMOVED=0
for file in "$PB_MIGRATIONS_DIR"/*presidents*.js; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        # Keep the first one (1768832417_created_presidents.js)
        if [[ "$filename" != "1768832417_created_presidents.js" ]]; then
            echo "   Removing: $filename"
            rm "$file"
            REMOVED=$((REMOVED + 1))
        else
            echo "   Keeping: $filename (first migration)"
        fi
    fi
done

echo ""
echo "   ✅ Removed $REMOVED duplicate migrations"

echo ""
echo "5️⃣ Stopping PocketBase service..."
sudo systemctl stop socialpolitician-app-pocketbase.service 2>/dev/null || true
sleep 2

echo ""
echo "6️⃣ Starting PocketBase service..."
sudo systemctl start socialpolitician-app-pocketbase.service

echo ""
echo "7️⃣ Waiting for service to start..."
sleep 5

echo ""
echo "8️⃣ Checking service status..."
if sudo systemctl is-active --quiet socialpolitician-app-pocketbase.service; then
    echo "   ✅ PocketBase service is running!"
    
    echo ""
    echo "9️⃣ Testing PocketBase health..."
    sleep 3
    if curl -f -s http://127.0.0.1:8091/api/health >/dev/null 2>&1; then
        echo "   ✅ PocketBase is responding!"
        HEALTH=$(curl -s http://127.0.0.1:8091/api/health)
        echo "   Response: $HEALTH"
        
        echo ""
        echo "🔟 Testing politicians collection..."
        sleep 1
        if curl -f -s "http://127.0.0.1:8091/api/collections/politicians/records?page=1&perPage=1" >/dev/null 2>&1; then
            echo "   ✅ Politicians collection is accessible!"
        else
            echo "   ⚠️  Politicians collection test failed (may need to check permissions)"
        fi
    else
        echo "   ⚠️  PocketBase started but not responding yet"
        echo "   Check logs: sudo journalctl -u socialpolitician-app-pocketbase.service -n 50"
    fi
else
    echo "   ❌ PocketBase service failed to start"
    echo ""
    echo "   Recent logs:"
    sudo journalctl -u socialpolitician-app-pocketbase.service -n 30 --no-pager || true
    echo ""
    echo "   💡 If still failing, check for other migration issues"
fi

echo ""
echo "✅ Migration cleanup complete!"
echo ""
echo "📋 Summary:"
echo "   - Backup created at: $BACKUP_DIR"
echo "   - Removed $REMOVED duplicate migrations"
echo "   - Kept: 1768832417_created_presidents.js (first migration)"
echo ""
echo "📋 Next steps:"
echo "   1. Check if site is working: https://app.socialpolitician.com"
echo "   2. If still failing, check logs: sudo journalctl -u socialpolitician-app-pocketbase.service -f"
echo "   3. To restore backups: cp $BACKUP_DIR/* $PB_MIGRATIONS_DIR/"
