#!/bin/bash
# Comprehensive fix: Remove ALL problematic migrations that are causing PocketBase to crash
# Run on VPS: cd /var/www/socialpolitician-app && bash fix-all-migrations.sh

set -e

echo "🔧 Comprehensive migration fix - removing ALL problematic migrations..."
echo ""

PB_MIGRATIONS_DIR="/var/www/socialpolitician-app/pocketbase/pb_migrations"
BACKUP_DIR="/var/www/socialpolitician-app/pocketbase/pb_migrations_backup_comprehensive_$(date +%Y%m%d_%H%M%S)"

if [ ! -d "$PB_MIGRATIONS_DIR" ]; then
    echo "❌ Error: Migrations directory not found: $PB_MIGRATIONS_DIR"
    exit 1
fi

echo "1️⃣ Creating comprehensive backup..."
mkdir -p "$BACKUP_DIR"
cp -r "$PB_MIGRATIONS_DIR"/* "$BACKUP_DIR/" 2>/dev/null || true
echo "   ✅ Backup created at: $BACKUP_DIR"

echo ""
echo "2️⃣ Identifying problematic migrations..."

# List of migrations to remove (all the ones causing issues)
PROBLEMATIC_MIGRATIONS=(
    # Presidents duplicates (keep only the first one)
    "1768833615_created_presidents.js"
    "1768833615_deleted_presidents.js"
    "1768833621_created_presidents.js"
    "1768833621_deleted_presidents.js"
    "1768833629_created_presidents.js"
    "1768833629_deleted_presidents.js"
    "1768833635_created_presidents.js"
    "1768833635_deleted_presidents.js"
    "1768833853_created_presidents.js"
    "1768833853_deleted_presidents.js"
    "1768836514_created_presidents.js"
    "1768836514_deleted_presidents.js"
    "1768839598_deleted_presidents.js"
    "1768839631_created_presidents.js"
    "1769051554_deleted_presidents.js"
    # Politicians problematic migrations
    "1768865019_updated_politicians.js"  # Tries to add duplicate office_type field
)

echo "   Will remove ${#PROBLEMATIC_MIGRATIONS[@]} problematic migrations"

echo ""
echo "3️⃣ Removing problematic migrations..."
REMOVED=0
KEPT=0

for migration in "${PROBLEMATIC_MIGRATIONS[@]}"; do
    if [ -f "$PB_MIGRATIONS_DIR/$migration" ]; then
        echo "   ❌ Removing: $migration"
        rm "$PB_MIGRATIONS_DIR/$migration"
        REMOVED=$((REMOVED + 1))
    else
        echo "   ℹ️  Not found (already removed): $migration"
    fi
done

# Also check for any other updated_politicians migrations that might add office_type
echo ""
echo "4️⃣ Checking for other office_type conflicts..."
OTHER_OFFICE_TYPE=$(grep -l "office_type" "$PB_MIGRATIONS_DIR"/*updated_politicians.js 2>/dev/null | wc -l)
if [ "$OTHER_OFFICE_TYPE" -gt 0 ]; then
    echo "   ⚠️  Found $OTHER_OFFICE_TYPE other migrations referencing office_type:"
    grep -l "office_type" "$PB_MIGRATIONS_DIR"/*updated_politicians.js 2>/dev/null | while read file; do
        filename=$(basename "$file")
        echo "   ❌ Removing: $filename"
        rm "$file"
        REMOVED=$((REMOVED + 1))
    done
else
    echo "   ✅ No other office_type conflicts found"
fi

echo ""
echo "   ✅ Removed $REMOVED problematic migrations"

echo ""
echo "5️⃣ Listing remaining migrations..."
REMAINING=$(ls "$PB_MIGRATIONS_DIR"/*.js 2>/dev/null | wc -l)
echo "   Total remaining migrations: $REMAINING"
if [ "$REMAINING" -lt 10 ]; then
    echo "   Remaining migrations:"
    ls -1 "$PB_MIGRATIONS_DIR"/*.js 2>/dev/null | xargs -n1 basename | head -20
fi

echo ""
echo "6️⃣ Stopping PocketBase service..."
sudo systemctl stop socialpolitician-app-pocketbase.service 2>/dev/null || true
sleep 2

echo ""
echo "7️⃣ Starting PocketBase service..."
sudo systemctl start socialpolitician-app-pocketbase.service

echo ""
echo "8️⃣ Waiting for service to start..."
sleep 8

echo ""
echo "9️⃣ Checking service status..."
if sudo systemctl is-active --quiet socialpolitician-app-pocketbase.service; then
    echo "   ✅ PocketBase service is running!"
    
    echo ""
    echo "🔟 Testing PocketBase health..."
    sleep 3
    if curl -f -s http://127.0.0.1:8091/api/health >/dev/null 2>&1; then
        echo "   ✅ PocketBase is responding!"
        HEALTH=$(curl -s http://127.0.0.1:8091/api/health)
        echo "   Response: $HEALTH"
        
        echo ""
        echo "1️⃣1️⃣ Testing politicians collection..."
        sleep 2
        if curl -f -s "http://127.0.0.1:8091/api/collections/politicians/records?page=1&perPage=1" >/dev/null 2>&1; then
            echo "   ✅ Politicians collection is accessible!"
            RESPONSE=$(curl -s "http://127.0.0.1:8091/api/collections/politicians/records?page=1&perPage=1")
            COUNT=$(echo "$RESPONSE" | grep -o '"totalItems":[0-9]*' | cut -d: -f2 || echo "unknown")
            echo "   Total politicians: $COUNT"
        else
            echo "   ⚠️  Politicians collection test failed"
        fi
    else
        echo "   ⚠️  PocketBase started but not responding yet"
        echo "   Waiting a bit longer..."
        sleep 5
        if curl -f -s http://127.0.0.1:8091/api/health >/dev/null 2>&1; then
            echo "   ✅ PocketBase is now responding!"
        else
            echo "   ❌ Still not responding"
        fi
    fi
else
    echo "   ❌ PocketBase service failed to start"
    echo ""
    echo "   Recent logs:"
    sudo journalctl -u socialpolitician-app-pocketbase.service -n 40 --no-pager || true
    echo ""
    echo "   💡 Check the error above to identify the next problematic migration"
fi

echo ""
echo "✅ Comprehensive migration fix complete!"
echo ""
echo "📋 Summary:"
echo "   - Backup created at: $BACKUP_DIR"
echo "   - Removed $REMOVED problematic migrations"
echo "   - Remaining migrations: $REMAINING"
echo ""
echo "📋 Next steps:"
echo "   1. Check if site is working: https://app.socialpolitician.com"
echo "   2. If still failing, check logs: sudo journalctl -u socialpolitician-app-pocketbase.service -f"
echo "   3. To restore backups: cp $BACKUP_DIR/* $PB_MIGRATIONS_DIR/"
